const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ success: false, error: '视频地址不能为空' });
  }
  // TODO: 这里调用你的摘要服务
  // const summary = await getSummaryFromLLM(url);
  res.json({ success: true, summary: '这里是摘要内容（后续会接入AI服务）' });
});

module.exports = router;
