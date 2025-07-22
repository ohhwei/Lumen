const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const { validateVideoUrl } = require("../services/validators");
const axios = require("axios");
const cheerio = require("cheerio");
const downloadAndUploadToOSS = require("../services/downloadAndUpload");
const { submitAsrTask, getAsrResult } = require("../services/tencentAsr");
const { analyzeWithDeepSeek } = require("../services/deepseek");
const { sentenceChunk } = require("../utils/chunkText");
const { RAGUtils } = require("../utils/ragUtils");
const prompts = require("../services/prompts");
const { uploadToOSS } = require("../services/oss");
const { splitAudio } = require("../services/audioSplit");
const fs = require("fs");
const path = require("path");
const { searchCrossRef } = require("../services/referenceSearch");

// 全局进度存储（生产建议用Redis等持久化方案）
const progressMap = {};

// 案例缓存对象，key为caseId，value为解析内容
const caseCache = {};

// 在文件顶部定义标准步骤
const STANDARD_STEPS = [
  { name: "视频下载中", status: "pending", detail: "" },
  { name: "音频分片中", status: "pending", detail: "" },
  { name: "音频分片上传中", status: "pending", detail: "" },
  { name: "ASR转写中", status: "pending", detail: "" },
  { name: "摘要与关键词生成中", status: "pending", detail: "" },
  { name: "学术文献检索中", status: "pending", detail: "" },
  { name: "知识点/学习指引/章节/亮点生成中", status: "pending", detail: "" },
  { name: "选择题/简答题生成中", status: "pending", detail: "" },
];

async function withRetry(fn, retries = 3, interval = 2000) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < retries - 1) {
        await new Promise((res) => setTimeout(res, interval));
      }
    }
  }
  throw lastErr;
}

function updateStep(taskId, stepIdx, status, detail = "") {
  const task = progressMap[taskId];
  if (!task) {
    console.warn("updateStep: task not found", taskId);
    return;
  }
  if (!Array.isArray(task.steps)) {
    console.warn("updateStep: task.steps is not an array", task.steps);
    return;
  }
  if (
    typeof stepIdx !== "number" ||
    stepIdx < 0 ||
    stepIdx >= task.steps.length
  ) {
    console.warn(
      "updateStep: stepIdx out of range",
      stepIdx,
      "steps.length:",
      task.steps.length
    );
    return;
  }
  task.steps[stepIdx].status = status;
  task.steps[stepIdx].detail = detail;
  task.currentStep = stepIdx + 1;
  // 进度百分比均分，主流程第8步完成时直接100%
  task.percent = Math.round(
    ((stepIdx + (status === "done" ? 1 : 0)) / STANDARD_STEPS.length) * 100
  );
  if (status === "error") {
    task.error = { step: stepIdx + 1, message: detail };
  } else {
    task.error = null;
  }
}

// 新增：B站视频直链解析API
// POST /api/parse/bilibili { bvid: string }
router.post("/parse/bilibili", async (req, res) => {
  const { bvid } = req.body;
  if (!bvid) {
    return res.status(400).json({ success: false, error: "缺少bvid参数" });
  }
  try {
    // 1. 获取cid
    const metaResp = await axios.get(
      `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`
    );
    const cid = metaResp.data?.data?.cid;
    if (!cid) {
      console.warn("[B站解析] 未能获取cid, metaResp:", metaResp.data);
      return res.status(400).json({ success: false, error: "未能获取cid" });
    }
    // 2. 获取视频流直链
    const playResp = await axios.get(
      `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=80&fnval=16`
    ); // qn=80高清，fnval=16返回dash流
    const dash = playResp.data?.data?.dash;
    if (!dash) {
      console.warn("[B站解析] 未能获取dash, playResp:", playResp.data);
      return res.status(400).json({ success: false, error: "未能获取视频流" });
    }
    // 取第一个视频流和音频流
    const videoUrl = dash.video?.[0]?.baseUrl;
    const audioUrl = dash.audio?.[0]?.baseUrl;
    console.log("[B站解析] videoUrl:", videoUrl, "audioUrl:", audioUrl);
    if (!videoUrl || !audioUrl) {
      console.warn("[B站解析] 未能获取视频/音频直链, dash:", dash);
      return res
        .status(400)
        .json({ success: false, error: "未能获取视频/音频直链" });
    }
    res.json({ success: true, videoUrl, audioUrl });
  } catch (e) {
    console.error("[B站解析] 解析异常:", e && e.stack ? e.stack : e);
    res
      .status(500)
      .json({ success: false, error: "解析失败", detail: e.message });
  }
});

// 1. 用户提交视频链接，自动触发全流程
router.post("/", async (req, res) => {
  const { url, caseId } = req.body;

  // 1. 如果是案例且缓存命中，直接返回
  if (caseId && caseCache[caseId]) {
    return res.json({ success: true, taskId: caseCache[caseId].taskId });
  }

  if (!url) return res.status(400).json({ error: "缺少视频链接" });

  // 新增：获取视频标题和时长
  const meta = await validateVideoUrl(url);
  const videoTitle = meta.title || "未知视频";

  // ====== 新增：视频时长限制校验（1小时=3600秒）======
  if (meta.duration && meta.duration > 3600) {
    return res.status(400).json({
      error: "视频时长超过1小时，暂不支持分析。",
    });
  }
  // ====== 结束 ======

  let realVideoUrl = url;
  // 新增：自动识别B站网页链接并转直链
  if (url.includes("bilibili.com/video/BV")) {
    const bvidMatch = url.match(/BV[\w]+/);
    if (bvidMatch) {
      const bvid = bvidMatch[0];
      try {
        // 统一修正为 /api/analyze/parse/bilibili
        const resp = await axios.post(
          "http://localhost:5050/api/analyze/parse/bilibili",
          { bvid }
        );
        if (resp.data.success && resp.data.videoUrl) {
          realVideoUrl = resp.data.videoUrl;
        } else {
          return res.status(400).json({
            error: "B站直链解析失败: " + (resp.data.error || "未知错误"),
          });
        }
      } catch (e) {
        return res
          .status(400)
          .json({ error: "B站直链解析异常: " + (e.message || e) });
      }
    }
  }

  const taskId = Date.now().toString();
  progressMap[taskId] = {
    currentStep: 1,
    percent: 0,
    error: null,
    steps: JSON.parse(JSON.stringify(STANDARD_STEPS)), // 深拷贝
    videoTitle,
  };
  console.log(`[分析任务] 新任务启动, taskId: ${taskId}, url: ${url}`);
  res.json({ success: true, taskId }); // 立即返回taskId

  // 2. 如果是案例，分析流程结束后写入缓存
  // 在分析流程最后一步（任务全部完成后），加上：
  if (caseId) {
    caseCache[caseId] = {
      taskId, // 记录 taskId，后续可用
      // 你也可以存更多内容，比如 result
    };
  }

  // 后台异步处理
  (async () => {
    try {
      // 0. 视频/音频下载和上传
      console.log(`[分析任务] [${taskId}] 开始下载视频/音频`);
      updateStep(taskId, 0, "processing", "开始下载");
      // 解析直链
      let videoUrl = url;
      let audioUrl = null;
      if (url.includes("bilibili.com/video/BV")) {
        const bvidMatch = url.match(/BV[\w]+/);
        if (bvidMatch) {
          const bvid = bvidMatch[0];
          const resp = await axios.post(
            "http://localhost:5050/api/analyze/parse/bilibili",
            { bvid }
          );
          if (resp.data.success) {
            videoUrl = resp.data.videoUrl;
            audioUrl = resp.data.audioUrl;
          } else {
            throw new Error(
              "B站直链解析失败: " + (resp.data.error || "未知错误")
            );
          }
        }
      }
      const ossPath = `videos/${taskId}.mp4`;
      // 新版downloadAndUploadToOSS支持videoUrl和audioUrl
      const {
        mergedVideoUrlOSS,
        videoUrlOSS,
        audioUrlOSS,
        audioPath,
        videoPath,
        mergedPath,
      } = await downloadAndUploadToOSS(videoUrl, audioUrl, ossPath);
      updateStep(taskId, 0, "done", "视频/音频下载并上传完成");
      console.log(`[分析任务] [${taskId}] 视频/音频下载并上传完成`);

      // 1. 音频分片
      console.log(`[分析任务] [${taskId}] 开始音频分片`);
      updateStep(taskId, 1, "processing", "分片中");
      const audioParts = splitAudio(audioPath, 300); // 每5分钟一段
      updateStep(taskId, 1, "done", "完成");
      console.log(`[分析任务] [${taskId}] 音频分片完成`);

      // 2. 分片上传到OSS
      console.log(`[分析任务] [${taskId}] 开始分片上传到OSS`);
      updateStep(taskId, 2, "processing", "上传中");
      const ossDir = "videos/";
      // 优化：Promise.allSettled并发上传，上传成功后删除本地分片，失败重试一次并报警
      async function uploadAndClean(file) {
        try {
          const ossUrl = await uploadToOSS(file, ossDir);
          // 上传成功后删除本地分片
          try {
            fs.unlinkSync(file);
          } catch (e) {
            console.warn("删除本地分片失败:", file, e);
          }
          return { status: "fulfilled", value: ossUrl };
        } catch (err) {
          // 失败重试一次
          try {
            const ossUrl = await uploadToOSS(file, ossDir);
            try {
              fs.unlinkSync(file);
            } catch (e) {
              console.warn("删除本地分片失败:", file, e);
            }
            return { status: "fulfilled", value: ossUrl };
          } catch (err2) {
            console.error("音频分片上传失败:", file, err2);
            return { status: "rejected", reason: err2 };
          }
        }
      }
      const uploadResults = await Promise.allSettled(
        audioParts.map(uploadAndClean)
      );
      // 只保留成功的OSS链接（字符串）
      const audioPartsOSS = uploadResults
        .filter(
          (r) =>
            r.status === "fulfilled" &&
            r.value &&
            typeof r.value.value === "string"
        )
        .map((r) => r.value.value);
      const failedCount = uploadResults.filter(
        (r) => r.status === "rejected"
      ).length;
      updateStep(
        taskId,
        2,
        "done",
        `共${audioParts.length}段，成功${audioPartsOSS.length}，失败${failedCount}`
      );
      console.log(`[分析任务] [${taskId}] 分片上传到OSS完成`);

      // 3. 并发提交所有分片ASR任务（用OSS链接）
      console.log(`[分析任务] [${taskId}] 开始ASR转写`);
      updateStep(taskId, 3, "processing", "ASR转写中");
      const asrTaskIds = await Promise.all(
        audioPartsOSS.map((url) => {
          if (typeof url !== "string") {
            console.error("ASR提交时url不是字符串:", url);
            return Promise.reject(new Error("ASR提交时url不是字符串"));
          }
          return submitAsrTask(url);
        })
      );

      async function pollAsrResult(taskId) {
        let result = null,
          retry = 0;
        while (!result && retry < 60) {
          // 最多等10分钟
          await new Promise((r) => setTimeout(r, 10000));
          result = await getAsrResult(taskId);
          retry++;
        }
        if (!result) throw new Error("腾讯云转写超时");
        return result?.Result || "";
      }
      const transcripts = await Promise.all(
        asrTaskIds.map((id) => pollAsrResult(id))
      );
      updateStep(
        taskId,
        3,
        "done",
        `ASR转写完成：${audioPartsOSS.length}/${audioParts.length}`
      );

      const transcript = transcripts.join("\n");
      const ragUtils = new RAGUtils();
      const chunks = sentenceChunk(transcript, 400, 50);
      await ragUtils.processTranscriptChunks(chunks);

      console.log(`[分析任务] [${taskId}] 完成ASR转写 + 文本拼接`);

      async function ragAnalyze(modulePrompt) {
        // 用 referencesContext + 视频内容做拼接
        const context = referencesContext + "\n\n" + transcript;
        return await withRetry(() => analyzeWithDeepSeek(context + "\n\n" + modulePrompt));
      }
      async function normalAnalyze(modulePrompt) {
        // 统一加全局角色设定
        return await withRetry(() => analyzeWithDeepSeek(transcript + "\n\n" + modulePrompt));
      }
      // ------------------- 分步内容生成与返回 -------------------
      // 1. 先生成摘要和关键词
      console.log(`[分析任务] [${taskId}] 开始生成摘要和关键词`);
      updateStep(taskId, 4, "processing", "生成中");
      const [summaryRaw, keywordsRaw] = await Promise.all([
        normalAnalyze(prompts.normal.summary),
        normalAnalyze(prompts.normal.keywords),
      ]);
      updateStep(taskId, 4, "done", "完成");
      console.log(`[分析任务] [${taskId}] 摘要和关键词生成完成`);

      // 2. 用摘要或关键词作为检索词，提前检索文献
      const searchQuery =
        normalizeSummary(safeJson(summaryRaw)) ||
        (Array.isArray(keywordsRaw) ? keywordsRaw.join(" ") : "");
      updateStep(taskId, 5, "processing", "检索中");
      const crossRefList = await withRetry(() => searchCrossRef(searchQuery, 5));
      updateStep(taskId, 5, "done", `共${crossRefList.length}条`);
      console.log(`[分析任务] [${taskId}] 文献检索完成`);

      // 构建文献上下文
      const referencesContext = crossRefList
        .map((ref) => {
          return [
            `标题: ${ref.title}`,
            `作者: ${ref.author}`,
            ref.year ? `年份: ${ref.year}` : "",
            ref.venue ? `期刊/会议: ${ref.venue}` : "",
            ref.abstract ? `摘要: ${ref.abstract}` : "",
            ref.url ? `链接: ${ref.url}` : "",
            ref.doi ? `DOI: ${ref.doi}` : "",
            `来源: ${ref.source}`,
          ]
            .filter(Boolean)
            .join("\n");
        })
        .join("\n\n");

      // 1. 并发生成核心内容
      console.log(
        `[分析任务] [${taskId}] 开始生成亮点、章节、知识点、学习指引`
      );
      updateStep(taskId, 6, "processing", "生成中");
      const [highlightsRaw, chaptersRaw, knowledgePointsRaw, learningGuideRaw] =
        await Promise.all([
          normalAnalyze(prompts.normal.highlights),
          normalAnalyze(prompts.normal.chapters),
          ragAnalyze(prompts.rag.knowledgePoints),
          ragAnalyze(prompts.rag.studyGuide),
        ]);
      updateStep(taskId, 6, "done", "完成");
      console.log(
        `[分析任务] [${taskId}] 亮点、章节、知识点、学习指引生成完成`
      );

      // 2. 生成选择题、简答题（同步执行，不再异步）
      updateStep(taskId, 7, "processing", "生成中");
      async function ragAnalyzeWithReferences(modulePrompt) {
        const context = referencesContext + "\n\n" + transcript;
        return await withRetry(() => analyzeWithDeepSeek(context + "\n\n" + modulePrompt));
      }
      const [questionsRaw, essayRaw] = await Promise.all([
        ragAnalyzeWithReferences(prompts.rag.questions),
        ragAnalyzeWithReferences(prompts.rag.essay),
      ]);

      // 1. 先写入 deepseekResult
      progressMap[taskId].deepseekResult = {
        videoUrl: mergedVideoUrlOSS || videoUrlOSS || videoUrl, // 优先用 OSS 公网地址
        summary: normalizeSummary(summaryRaw),
        highlights: normalizeHighlights(highlightsRaw),
        keywords: normalizeKeywords(keywordsRaw),
        learningGuide: normalizeLearningGuide(learningGuideRaw),
        chapters: normalizeChapters(safeJson(chaptersRaw)),
        knowledgePoints: normalizeKnowledgePoints(safeJson(knowledgePointsRaw)),
        references: normalizeReferences(safeJson(crossRefList)),
        questions: normalizeQuestions(
          safeJson(questionsRaw),
          safeJson(essayRaw)
        ),
      };
      console.log("progressMap[taskId].deepseekResult", progressMap[taskId]);
      // 同步写入顶层 videoUrl，供前端播放器使用
      progressMap[taskId].videoUrl =
        mergedVideoUrlOSS || videoUrlOSS || videoUrl;
      // 2. 再同时设置最后一步 step 和 status
      updateStep(taskId, 7, "done", "完成");
      progressMap[taskId].status = "done";
      console.log(`[分析任务] [${taskId}] 测试题生成完成，任务全部完成`);

      // ========== 自动清理本地临时文件 ==========
      try {
        // 删除所有音频分片
        audioParts.forEach((file) => {
          if (fs.existsSync(file)) fs.unlinkSync(file);
        });
        // 删除原始音频文件
        if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
        // 删除原始视频文件
        if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
        // 删除合并后的视频文件
        if (fs.existsSync(mergedPath)) fs.unlinkSync(mergedPath);
        console.log("本地临时音频分片、音频、视频、合并视频文件已全部删除");
      } catch (err) {
        console.error("本地临时文件删除失败:", err);
      }
    } catch (err) {
      Object.assign(progressMap[taskId], {
        status: "error",
        error: err.message,
      });
      console.error(`[分析任务] [${taskId}] 任务异常:`, err);
    }
  })();
});

// 2. 前端轮询获取任务进度和结果
router.get("/result", (req, res) => {
  console.log("结果查询收到参数:", req.query);
  const { taskId } = req.query;
  if (!taskId || !progressMap[taskId]) {
    return res.status(404).json({ success: false, error: "任务不存在" });
  }
  const task = progressMap[taskId];

  if (task.status === "error") {
    return res.json({ success: false, error: task.error || "任务失败" });
  }

  // 任务完成，返回真实AI分析结果
  console.log("返回给前端的task对象:", JSON.stringify(task, null, 2));
  res.json({
    success: true,
    data: {
      status: "done",
      videoUrl: task.videoUrl,
      audioUrl: task.audioUrl,
      videoTitle: task.videoTitle || "视频标题",
      deepseekResult: task.deepseekResult || {},
    },
  });
});

router.get("/progress", (req, res) => {
  console.log("进度查询收到参数:", req.query);
  const { taskId } = req.query;
  if (!taskId || !progressMap[taskId]) {
    return res.status(404).json({ success: false, error: "任务不存在" });
  }
  const task = progressMap[taskId];
  res.json({
    success: true,
    data: {
      currentStep: task.currentStep,
      percent: task.percent,
      steps: task.steps,
      error: task.error,
      videoTitle: task.videoTitle,
      status: task.status, // 新增，便于前端判断
    },
  });
});

// 工具函数：容错 JSON 解析
function safeJson(str) {
  // 1. 已经是对象且非 null，直接返回
  if (typeof str === "object" && str !== null) return str;
  // 2. null 直接返回 null
  if (str === null) return null;
  // 3. 防止 "[object Object]" 误入
  if (str === "[object Object]" || str === '"[object Object]"') return {};
  try {
    // 4. 去除 Markdown 代码块包裹
    if (typeof str === "string") {
      str = str.trim();
      const codeBlockMatch = str.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (codeBlockMatch) {
        str = codeBlockMatch[1];
      }
    }
    return JSON.parse(str);
  } catch {
    try {
      let fixed = str.replace(/'/g, '"');
      fixed = fixed.replace(/([{,])\s*([\w\u4e00-\u9fa5]+)\s*:/g, '$1"$2":');
      fixed = fixed.replace(/\n/g, "");
      const codeBlockMatch = fixed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (codeBlockMatch) {
        fixed = codeBlockMatch[1];
      }
      return JSON.parse(fixed);
    } catch {
      // 兜底返回原始字符串
      return str;
    }
  }
}

// ================== 协议标准化函数 ==================
function normalizeSummary(raw) {
  // summary: string
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && typeof raw.summary === "string")
    return raw.summary;
  return "";
}

function normalizeHighlights(raw) {
  // highlights: string[]
  if (Array.isArray(raw)) {
    // 如果是对象数组（如 {highlight, description}），合成字符串
    if (
      raw.length > 0 &&
      typeof raw[0] === "object" &&
      (raw[0].highlight || raw[0].description)
    ) {
      return raw
        .map((item) => {
          if (typeof item === "string") return item;
          if (typeof item === "object") {
            if (item.highlight && item.description)
              return `${item.highlight}：${item.description}`;
            if (item.highlight) return item.highlight;
            if (item.description) return item.description;
          }
          return "";
        })
        .filter(Boolean);
    }
    // 如果本身就是字符串数组
    return raw.filter((item) => typeof item === "string");
  }
  if (raw && typeof raw === "object" && Array.isArray(raw.highlights)) {
    return normalizeHighlights(raw.highlights);
  }
  if (raw && typeof raw === "object" && Array.isArray(raw.content_highlights)) {
    return normalizeHighlights(raw.content_highlights);
  }
  if (typeof raw === "string" && raw.trim()) return JSON.parse(raw);
  return [];
}

function normalizeKeywords(raw) {
  // keywords: string[]
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && Array.isArray(raw.keywords))
    return raw.keywords;
  if (typeof raw === "string" && raw.trim()) return JSON.parse(raw);
  return [];
}

function normalizeLearningGuide(raw) {
  return safeJson(raw);
}

function normalizeChapters(raw) {
  // 1. 已经是对象数组
  if (Array.isArray(raw)) {
    return raw.map((c, idx) => ({
      id: c.id || idx + 1,
      title: c.title || c.章节名 || c.name || `第${idx + 1}章`,
      time: c.time || c.开始时间 || "",
      summary: c.summary || c.概要 || c.description || "",
    }));
  }
  // 2. 是 markdown 或字符串，按“第X章/章节/阶段”等分段
  if (typeof raw === "string") {
    const chapters = [];
    const lines = raw.split("\n");
    let current = null;
    for (const line of lines) {
      const match = line.match(
        /第?([一二三四五六七八九十1234567890]+)[章节段]/
      );
      if (match) {
        current = { id: chapters.length + 1, title: line.trim(), summary: "" };
        chapters.push(current);
      } else if (current && line.trim()) {
        current.summary += (current.summary ? " " : "") + line.trim();
      }
    }
    return chapters;
  }
  // 3. 兜底
  return [];
}

function normalizeKnowledgePoints(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const name =
      item.name || item.title || item["知识点名称"] || item["知识点"] || "";
    const description =
      item.description ||
      item.content ||
      item["知识点说明"] ||
      item["内容"] ||
      "";
    let prerequisites = item.prerequisites || item["前置知识点"] || [];
    if (typeof prerequisites === "string") {
      if (prerequisites === "无" || prerequisites.trim() === "")
        prerequisites = [];
      else prerequisites = [prerequisites];
    }
    if (!Array.isArray(prerequisites)) prerequisites = [];
    return { name, description, prerequisites };
  });
}

function normalizeReferences(raw) {
  // 1. 已经是数组
  if (Array.isArray(raw)) {
    return raw
      .map((r) => ({
        title: r.title || "",
        author: r.author || "",
        url: r.url || "",
      }))
      .filter((r) => r.title && r.url);
  }

  // 2. markdown/字符串格式
  let text = "";
  if (typeof raw === "string") {
    text = raw;
  } else if (
    raw &&
    typeof raw === "object" &&
    typeof raw.content === "string"
  ) {
    text = raw.content;
  }

  // 正则提取每条资料
  const refs = [];
  const refRegex =
    /(?:\d+\.\s*)?\*\*(?:《)?(.+?)(?:》)?\*\*\s*-\s*\*\*作者\*\*:\s*([\u4e00-\u9fa5A-Za-z0-9.,&\s]+)\s*-\s*\*\*简介\*\*:[^\n]*\s*-\s*\*\*链接\*\*:\s*(https?:\/\/\S+)/g;
  let match;
  while ((match = refRegex.exec(text)) !== null) {
    refs.push({
      title: match[1].trim(),
      author: match[2].trim(),
      url: match[3].trim(),
    });
  }

  // 兜底：如未能提取，返回空数组
  return refs;
}

// --- 健壮化 normalizeQuestions ---
function normalizeQuestions(mcRaw, essayRaw) {
  // 兜底
  if (!mcRaw && !essayRaw) return { multipleChoice: [], essay: [] };
  // 选择题
  let multipleChoice = [];
  if (
    mcRaw &&
    typeof mcRaw === "object" &&
    Array.isArray(mcRaw.multipleChoice)
  ) {
    multipleChoice = mcRaw.multipleChoice;
  } else if (Array.isArray(mcRaw)) {
    multipleChoice = mcRaw;
  }
  // 简答题
  let essay = [];
  if (
    essayRaw &&
    typeof essayRaw === "object" &&
    Array.isArray(essayRaw.essay)
  ) {
    essay = essayRaw.essay;
  } else if (Array.isArray(essayRaw)) {
    essay = essayRaw;
  }
  // 兼容 essay/question 字段
  essay = essay.map((item) => ({
    question: item.question || item.essay || "",
    answer: item.answer || "",
  }));
  return { multipleChoice, essay };
}

module.exports = router;
