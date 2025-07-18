const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  const { audioUrl } = req.body;
  if (!audioUrl) {
    return res.status(400).json({ success: false, error: '音频地址不能为空' });
  }
  // TODO: 这里调用你的语音转文字服务
  res.json({ success: true, text: '这里是转写结果（后续会接入AI服务）' });
});

module.exports = router;
