const express = require('express');
const { analyzeWithDeepSeek } = require('../services/deepseek');
// const { asrTranscribe } = require('../services/asr'); // 需你已有的腾讯云ASR封装
const { uploadToOSS } = require('../services/oss'); // 引入OSS上传服务
const fs = require('fs'); // 用于测试接口判断文件是否存在
const router = express.Router();

// 任务流转：下载视频->上传OSS->转写->AI分析
router.post('/task', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: '缺少视频链接' });
    }
    // 1. 下载视频（此处用伪代码，实际请替换为真实下载逻辑）
    // 假设下载后本地路径如下：
    const localPath = '/tmp/test-video.mp4'; // TODO: 替换为真实下载路径
    // 2. 上传到OSS
    const ossUrl = await uploadToOSS(localPath, 'videos/');
    // 3. 腾讯云ASR转写（此处用mock文本）
    const transcript = req.body.mockTranscript || '这里是转写出来的文本内容';
    // 4. DeepSeek多模块分析
    const summary = await analyzeWithDeepSeek(transcript, 'summary');
    const keywords = await analyzeWithDeepSeek(transcript, 'keywords');
    const chapters = await analyzeWithDeepSeek(transcript, 'chapterSplit');
    // 5. 返回结构化结果
    res.json({
      success: true,
      data: {
        ossUrl, // 新增：OSS公网链接
        transcript,
        summary,
        keywords,
        chapters,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 测试接口：上传本地文件到OSS，返回公网链接
// POST /api/video/test-oss-upload { localFilePath: '/path/to/file.mp4', ossDir: 'videos/' }
router.post('/test-oss-upload', async (req, res) => {
  try {
    const { localFilePath, ossDir } = req.body;
    if (!localFilePath) {
      return res.status(400).json({ success: false, error: '缺少本地文件路径' });
    }
    // 检查文件是否存在
    if (!fs.existsSync(localFilePath)) {
      return res.status(404).json({ success: false, error: '本地文件不存在' });
    }
    // 上传到OSS
    const ossUrl = await uploadToOSS(localFilePath, ossDir || 'videos/');
    res.json({ success: true, ossUrl });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router; 