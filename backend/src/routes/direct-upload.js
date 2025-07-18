// backend/src/routes/direct-upload.js
const express = require('express');
const downloadAndUploadToOSS = require('../services/downloadAndUpload');
const router = express.Router();

router.post('/direct-upload', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: '缺少视频链接' });

  // 生成唯一文件名，带 .mp4 后缀
  const ossPath = `videos/${Date.now()}.mp4`;

  try {
    const ossUrl = await downloadAndUploadToOSS(url, ossPath);
    res.json({ ossUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
