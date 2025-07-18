// backend/src/routes/oss-upload.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const uploadToOSS = require('../services/oss'); // 路径按你的实际情况调整

const router = express.Router();
const upload = multer({ dest: 'uploads/' }); // 临时存储上传文件

// POST /test-oss-upload
router.post('/test-oss-upload', upload.single('file'), async (req, res) => {
  try {
    console.log('收到上传请求');
    const file = req.file;
    if (!file) {
      console.log('没有收到文件');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    console.log('收到文件:', file);

    // 上传到 OSS
    const ossPath = `test-oss/${file.originalname}`;
    console.log('准备上传到OSS:', file.path, ossPath);

    const url = await uploadToOSS(file.path, ossPath);

    console.log('上传成功，返回链接:', url);
    res.json({ url });
  } catch (err) {
    console.error('上传失败:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
