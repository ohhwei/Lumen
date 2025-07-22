"use client";

import { Suspense } from "react";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "antd/dist/reset.css";
import { Tabs, Card, Button, Divider } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { LeftOutlined } from "@ant-design/icons";

const chineseNumbers = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

// 新增内部组件，原有内容全部移到这里
function InnerResultPage() {
  const [selectedChapter, setSelectedChapter] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{
    [key: number]: string;
  }>({});
  const [showAnswers, setShowAnswers] = useState<boolean[]>([]);
  const [showEssayAnswers, setShowEssayAnswers] = useState<{
    [key: number]: boolean;
  }>({});
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams?.get("taskId");
  const [tab, setTab] = useState("summary");

  // 后端数据
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 获取 taskId
  useEffect(() => {
    if (!taskId) {
      setError("未提供任务ID");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const fetchResult = async () => {
      try {
        const res = await fetch(`/api/analyze/result?taskId=${taskId}`);
        const data = await res.json();
        if (data.success === false || !data.data) {
          setError(data.error || "解析失败");
          setAnalysisResult(null);
          setLoading(false);
          return;
        }
        setAnalysisResult(data.data); // 直接 set，不要 JSON.stringify 比较
        setLoading(false);
      } catch (e: any) {
        setError("网络错误: " + (e?.message || e));
        setLoading(false);
      }
    };

    fetchResult();
  }, [taskId]);

  const videoRef = useRef<HTMLVideoElement>(null);

  // 只认协议字段
  const deepseek = analysisResult?.deepseekResult || {};
  const summary = typeof deepseek.summary === "string" ? deepseek.summary : "";
  const highlights = Array.isArray(deepseek.highlights?.content_highlights)
    ? deepseek.highlights.content_highlights
    : Array.isArray(deepseek.highlights?.highlights)
      ? deepseek.highlights.highlights
      : Array.isArray(deepseek.highlights)
        ? deepseek.highlights
        : [];
  console.log("highlights", highlights);
  const keywords = Array.isArray(deepseek.keywords?.keywords)
    ? deepseek.keywords.keywords
    : Array.isArray(deepseek.keywords)
      ? deepseek.keywords
      : [];
  const learningGuide = {
    basic: Array.isArray(deepseek.learningGuide?.basic)
      ? deepseek.learningGuide.basic
      : [],
    intermediate: Array.isArray(deepseek.learningGuide?.intermediate)
      ? deepseek.learningGuide.intermediate
      : [],
    advanced: Array.isArray(deepseek.learningGuide?.advanced)
      ? deepseek.learningGuide.advanced
      : [],
  };
  const chapters = Array.isArray(deepseek.chapters) ? deepseek.chapters : [];
  const knowledgePoints = Array.isArray(deepseek.knowledgePoints)
    ? deepseek.knowledgePoints
    : [];
  const references = Array.isArray(deepseek.references)
    ? deepseek.references
    : [];
  const questions = {
    multipleChoice: deepseek?.questions?.multipleChoice || [],
    essay: deepseek?.questions?.essay || [],
  };

  // 监听 questions.multipleChoice 长度变化，自动同步状态数组
  useEffect(() => {
    setShowAnswers(Array(questions.multipleChoice.length).fill(false));
    setSelectedOptions(Array(questions.multipleChoice.length).fill(null));
  }, [questions.multipleChoice.length]);

  // 章节跳转
  const handleChapterClick = (index: number, time: string) => {
    setSelectedChapter(index);
    if (videoRef.current && typeof time === "string") {
      const [min, sec] = time.split(":").map(Number);
      if (!isNaN(min) && !isNaN(sec)) {
        videoRef.current.currentTime = min * 60 + sec;
        videoRef.current.play();
      }
    }
  };

  // 题目选项选择
  const handleAnswerSelect = (qIdx: number, value: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: value }));
    setShowAnswers((prev) => {
      const newShowAnswers = [...prev];
      newShowAnswers[qIdx] = true;
      return newShowAnswers;
    });
  };
  // 简答题答案展开
  const toggleEssayAnswer = (idx: number) => {
    setShowEssayAnswers((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // 顶层只声明一次
  const optionLetters = ["A", "B", "C", "D", "E", "F"];
  const [selectedOptions, setSelectedOptions] = useState<(string | null)[]>(
    () => questions.multipleChoice.map(() => null)
  );

  // 获取视频标题
  console.log("analysisResult", analysisResult);
  const videoTitle =
    analysisResult?.videoTitle ||
    deepseek?.videoTitle ||
    deepseek?.title ||
    "未命名视频";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-lg">
        加载中...
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500 text-lg">
        {error}
      </div>
    );
  }
  if (!analysisResult) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-lg">
        暂无数据
      </div>
    );
  }

  const tabItems = [
    {
      key: "summary",
      label: "视频总结",
      children: (
        <div className="bg-white rounded-lg shadow-md p-6 h-[688px] overflow-y-auto">
          {/* 原 summary 区块内容 */}
          <div className="flex justify-between items-center mb-1">
            <h4 className="text-subtitle">摘要</h4>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-body leading-relaxed">{summary}</p>
            </div>
            <Divider style={{ margin: "28px 0", borderColor: "#e5e7eb" }} />
            <div>
              <h4 className="text-subtitle mb-4">亮点</h4>
              <ul className="text-body space-y-2">
                {highlights.map((item: any, idx: number) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span className="text-body">{item.description}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Divider style={{ margin: "28px 0", borderColor: "#e5e7eb" }} />
            {/* 核心知识点 */}
            <div>
              <h3 className="text-subtitle mb-4">核心知识点</h3>
              <div className="space-y-6">
                {knowledgePoints.map((point: any, index: number) => (
                  <div key={index}>
                    <h4 className="text-body font-bold mb-1 flex items-center">
                      <span className="text-blue-500 mr-2">•</span>
                      {point.name}
                    </h4>
                    <p className="text-body leading-relaxed mb-2">
                      {point.description}
                    </p>
                    {point.prerequisites && point.prerequisites.length > 0 && (
                      <div className="text-secondary mb-2">
                        前置知识点：{point.prerequisites.join("、")}
                      </div>
                    )}
                    {index < knowledgePoints.length - 1 }
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "studyGuide",
      label: "学习指引",
      children: (
        <div className="bg-white rounded-lg shadow-md p-6 h-[688px] overflow-y-auto">
          {/* 学习指引 */}
          <div>
            <h4 className="text-subtitle mb-4">学习指引</h4>
            <div className="text-secondary">
              <ul className="text-body space-y-6">
                {Array.isArray(deepseek.learningGuide) &&
                  deepseek.learningGuide.map((stage: any, idx: number) => (
                    <li key={idx} className="mb-4">
                      <div className="font-bold text-body mb-1">
                        {`阶段${chineseNumbers[idx] || idx + 1}：${stage.theme}`}
                      </div>
                      <div className="text-body text-sm mb-1">
                        目标：{stage.goal.trim().replace(/[。.]?$/, "。")}
                      </div>
                      <ul className="ml-4 space-y-1">
                        {Array.isArray(stage.guide) &&
                          stage.guide.map((point: string, i: number) => (
                            <li key={i} className="flex items-start">
                              <span className="text-blue-500 mr-2">•</span>
                              <span className="text-body">
                                {point.trim().replace(/[。.]?$/, "。")}
                              </span>
                            </li>
                          ))}
                      </ul>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
          <Divider style={{ margin: "28px 0", borderColor: "#e5e7eb" }} />
          {/* 参考资料 */}
          <div>
            <h4 className="text-subtitle mb-4">参考资料</h4>
            <div className="space-y-3">
              {!analysisResult || analysisResult.status !== "done" ? (
                <div className="animate-pulse bg-gray-100 h-12 rounded mb-2" />
              ) : (
                <div className="space-y-3">
                  {references.slice(0, 3).map((ref: any, index: number) => (
                    <div
                      key={index}
                      className="bg-gray-50 rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-100 transition"
                      onClick={() => {
                        if (ref.url) {
                          window.open(ref.url, "_blank");
                        }
                      }}
                    >
                      {/* 标题：最多两行，超出省略 */}
                      <div
                        className="text-body"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          wordBreak: "break-all",
                        }}
                      >
                        {ref.title || "参考资料"}
                      </div>
                      {/* 作者：最多两行，超出省略，不显示“作者：” */}
                      {ref.author && (
                        <div
                          className="text-secondary mt-1"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            wordBreak: "break-all",
                            fontSize: 13,
                          }}
                        >
                          {ref.author}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "quiz",
      label: "测一测",
      children: (
        <div className="bg-white rounded-lg shadow-md p-6 h-[688px] overflow-y-auto">
          <div className="space-y-8">
            {/* 选择题 */}
            <div>
              <h4 className="text-subtitle mb-4">选择题</h4>
              <div className="space-y-8">
                {questions.multipleChoice.length > 0 ? (
                  questions.multipleChoice.map((q: any, idx: number) => {
                    const getOptionLetter = (i: number) => optionLetters[i];
                    const getOptionContent = (opt: string, i: number) => {
                      const match = opt.match(/^[A-Da-d][.、．\s]/);
                      return match ? opt.slice(match[0].length).trim() : opt;
                    };
                    // 获取正确答案序号
                    const correctLetter = (() => {
                      if (typeof q.answer === "string") {
                        const match = q.answer.match(/[A-Fa-f]/);
                        if (match) return match[0].toUpperCase();
                        const idxOpt = q.options.findIndex(
                          (opt: string) => opt === q.answer
                        );
                        if (idxOpt >= 0) return optionLetters[idxOpt];
                      }
                      return "";
                    })();
                    const selected = selectedOptions[idx];
                    const showAnswer = showAnswers[idx];
                    const isCorrect = selected && selected === correctLetter;
                    return (
                      <div key={idx} className="">
                        <div className="mb-2 text-body">
                          {idx + 1}. {q.question}
                        </div>
                        <div className="space-y-2 ml-1">
                          {q.options.map((opt: string, i: number) => {
                            const letter = getOptionLetter(i);
                            return (
                              <label
                                key={i}
                                className="flex items-center cursor-pointer text-body select-none"
                              >
                                <input
                                  type="radio"
                                  name={`mcq-${idx}`}
                                  value={letter}
                                  className="mr-2 accent-blue-600 w-4 h-4"
                                  checked={selected === letter}
                                  onChange={() => {
                                    const arr = [...selectedOptions];
                                    arr[idx] = letter;
                                    setSelectedOptions(arr);
                                    // 自动显示答案
                                    const arrShow = [...showAnswers];
                                    arrShow[idx] = true;
                                    setShowAnswers(arrShow);
                                  }}
                                  disabled={showAnswer}
                                />
                                <span className="text-body mr-2">
                                  {letter}.
                                </span>
                                <span>{getOptionContent(opt, i)}</span>
                              </label>
                            );
                          })}
                        </div>
                        {showAnswer && (
                          <div
                            className={`mt-4 rounded-lg p-4 flex flex-col text-body ${
                              isCorrect ? "bg-green-50" : "bg-red-50"
                            }`}
                            style={{
                              borderLeft: `4px solid ${
                                isCorrect ? "#00993a" : "#ef4444"
                              }`,
                            }}
                          >
                            <div className="flex items-center mb-1">
                              {isCorrect ? (
                                <CheckCircleOutlined
                                  style={{
                                    color: "#00993a",
                                    fontSize: 14,
                                    marginRight: 8,
                                  }}
                                />
                              ) : (
                                <CloseCircleOutlined
                                  style={{
                                    color: "#ef4444",
                                    fontSize: 14,
                                    marginRight: 8,
                                  }}
                                />
                              )}
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: isCorrect ? "#00993a" : "#ef4444",
                                  fontSize: 14,
                                }}
                              >
                                {isCorrect ? (
                                  "回答正确"
                                ) : (
                                  <>
                                    回答错误（正确答案：
                                    <b style={{ fontWeight: 700 }}>
                                      {correctLetter}
                                    </b>
                                    ）
                                  </>
                                )}
                              </span>
                            </div>
                            {q.explanation && (
                              <div className="text-body mt-1 mb-2">
                                {q.explanation}
                              </div>
                            )}
                            <button
                              className="answer-toggle-btn mt-2"
                              onClick={() => {
                                const arr = [...showAnswers];
                                arr[idx] = false;
                                setShowAnswers(arr);
                                // 题目变为未选中
                                const arrSel = [...selectedOptions];
                                arrSel[idx] = null;
                                setSelectedOptions(arrSel);
                              }}
                            >
                              收起答案
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-secondary">暂无选择题</div>
                )}
              </div>
            </div>
            <Divider style={{ margin: "28px 0", borderColor: "#e5e7eb" }} />
            {/* 简答题 */}
            <div>
              <h4 className="text-subtitle mb-4">简答题</h4>
              <div className="space-y-8">
                {questions.essay.length > 0 ? (
                  questions.essay.map((q: any, idx: number) => (
                    <div key={idx}>
                      <div className="flex items-start mb-2">
                        <span className="text-body mr-2">{idx + 1}.</span>
                        <span className="text-body">
                          {q.question || q.essay}
                        </span>
                      </div>
                      {/* 查看/收起答案按钮和答案区 */}
                      {!showEssayAnswers[idx] && (
                        <button
                          className="answer-toggle-btn"
                          style={{
                            boxShadow: "none",
                            marginTop: 8,
                            marginLeft: 8,
                          }}
                          onClick={() => {
                            const arr = { ...showEssayAnswers };
                            arr[idx] = true;
                            setShowEssayAnswers(arr);
                          }}
                        >
                          查看答案
                        </button>
                      )}
                      {showEssayAnswers[idx] && (
                        <div
                          className="mt-4 rounded-lg p-4 flex flex-col text-body bg-gray-50"
                          style={{ borderLeft: "4px solid #3b82f6" }}
                        >
                          <div
                            className="mb-2"
                            style={{ fontWeight: 600, color: "#3b82f6" }}
                          >
                            参考答案
                          </div>
                          <div className="text-body mt-2 mb-2">
                            {q.answer || q.essay || ""}
                          </div>
                          <button
                            className="answer-toggle-btn mt-2"
                            style={{ boxShadow: "none" }}
                            onClick={() => {
                              const arr = { ...showEssayAnswers };
                              arr[idx] = false;
                              setShowEssayAnswers(arr);
                            }}
                          >
                            收起答案
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-secondary">暂无简答题</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <header
        className="w-full flex items-center px-4 border-b bg-white"
        style={{ height: 56, minHeight: 56 }}
      >
        <img
          src="/logo.png"
          alt="Logo"
          className="h-12 w-auto cursor-pointer"
          onClick={() => router.push("/")}
          style={{ marginRight: 20, marginLeft: 16 }}
        />
        <div className="flex items-center" style={{ flex: 1 }}>
          <span
            className="text-title align-middle"
            style={{ textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            title={videoTitle}
          >
            {videoTitle}
          </span>
        </div>
        {/* 右侧占位可选 */}
        <div style={{ width: 40 }} />
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-8 gap-6">
          {/* 左侧 - 视频和章节 */}
          <div className="lg:col-span-5">
            {/* 视频播放器和关键词标签区合并到同一个白色卡片内 */}
            <div className="bg-white rounded-lg shadow p-6 w-full max-w-4xl mx-auto mb-6">
              <div className="aspect-video bg-black rounded-lg overflow-hidden mx-auto">
                <video
                  ref={videoRef}
                  src={analysisResult.videoUrl}
                  controls
                  className="w-full h-full object-cover"
                />
              </div>
              {keywords.length > 0 && (
                <div
                  className="flex gap-2 mt-6 overflow-hidden w-full"
                  style={{ flexWrap: "nowrap", overflow: "hidden", width: "100%" }}
                >
                  {keywords.map((kw: string, idx: number) => (
                    <span
                      key={idx}
                      className="tag"
                      style={{ flexShrink: 0, whiteSpace: "nowrap", maxWidth: "100%" }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 章节划分 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <button
                  className="w-6 h-10 flex items-center justify-center rounded-full bg-transparent text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed mr-1"
                  onClick={() => {
                    const container = document.getElementById("chapter-scroll");
                    if (container)
                      container.scrollBy({ left: -160, behavior: "smooth" });
                  }}
                  aria-label="左移章节"
                >
                  <svg
                    width="24"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <div
                  id="chapter-scroll"
                  className="flex gap-2 overflow-x-auto pb-2 no-scrollbar"
                  style={{ scrollBehavior: "smooth", flex: 1 }}
                >
                  {chapters.map((chapter: any, index: number) => (
                    <Card
                      key={chapter.id}
                      hoverable
                      className={`chapter-card flex-shrink-0 cursor-pointer transition-colors w-[150px] h-[64px] p-0 ${
                        selectedChapter === index ? "border-blue-500" : ""
                      }`}
                      style={{
                        background:
                          selectedChapter === index ? "#f3f4f6" : "#fff",
                        borderColor:
                          selectedChapter === index ? "#3b82f6" : "#e5e7eb",
                        borderWidth: selectedChapter === index ? 2 : 1,
                        boxShadow: "none",
                        margin: 0,
                      }}
                      onClick={() => handleChapterClick(index, chapter.time)}
                      bodyStyle={{
                        padding: 12,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        height: "100%",
                      }}
                    >
                      <div>
                        <div className="text-body chapter-title truncate" style={{ maxWidth: "100%" }}>
                          {chapter.title}
                        </div>
                        <div className="text-secondary" style={{ marginTop: 1}}>
                          {chapter.time}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                <button
                  className="w-6 h-10 flex items-center justify-center rounded-full bg-transparent text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed ml-1"
                  onClick={() => {
                    const container = document.getElementById("chapter-scroll");
                    if (container)
                      container.scrollBy({ left: 160, behavior: "smooth" });
                  }}
                  aria-label="右移章节"
                >
                  <svg
                    width="24"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              </div>
              {/* 当前章节信息 */}
              <div
                className="rounded-lg mt-4"
                style={{ marginLeft: 20, marginRight: 20}}
              >
                <h4 className="font-bold text-body mb-2">
                  {chapters[selectedChapter]?.title}
                  <span className="text-secondary ml-2">
                    {chapters[selectedChapter]?.time}
                  </span>
                </h4>
                <p className="text-body">
                  {chapters[selectedChapter]?.summary}
                </p>
              </div>
            </div>
          </div>

          {/* 右侧 - Tabs 卡片式页签 */}
          <div className="lg:col-span-3 flex flex-col h-full w-full">
            <Tabs
              activeKey={tab}
              onChange={setTab}
              type="card"
              items={tabItems.map((item) => ({
                ...item,
                label: (
                  <span
                    className={tab === item.key ? "gradient-text font-bold" : ""}
                    style={{
                      padding: "0 24px",
                      display: "inline-block",
                      minWidth: 80,
                      textAlign: "center",
                    }}
                  >
                    {item.label}
                  </span>
                ),
              }))}
              style={{ width: "100%" }}
              tabBarGutter={0}
              tabBarStyle={{ width: "100%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// 页面默认导出只负责 Suspense 包裹
export default function ResultPage() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <InnerResultPage />
    </Suspense>
  );
}
