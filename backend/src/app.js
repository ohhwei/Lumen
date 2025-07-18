require('dotenv').config();

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const summaryRouter = require('./routes/summary');
const speech2textRouter = require('./routes/speech2text');
const analyzeRouter = require('./routes/analyze');
const videoRouter = require('./routes/video');
const { validateVideoUrl } = require('./services/validators');
const ossUploadRouter = require('./routes/oss-upload');
const directUploadRouter = require('./routes/direct-upload');
const { sendFeedbackMail } = require('./services/email');

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

// 中间件
app.use(cors());
app.use(express.json());
// 全局日志中间件，打印所有请求
app.use((req, res, next) => {
  console.log('[全局日志]', req.method, req.path, 'body:', req.body, 'query:', req.query);
  next();
});
// 修正 analyzeRouter 挂载路径，确保 /api/analyze/summary-keywords-test 可访问
app.use('/api/analyze', analyzeRouter);

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Backend is running!' });
});

// 启动服务
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

app.use('/api/summary', summaryRouter);
app.use('/api/speech2text', speech2textRouter);
app.use('/api/video', videoRouter);
app.use('/', ossUploadRouter); // 这样 /test-oss-upload 就能直接访问
app.use('/api', directUploadRouter); // 这样接口路径就是 /api/direct-upload

// analyzeRouter 里只认 url 字段
analyzeRouter.post('/analyze', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ success: false, error: '参数缺失' });
  }
  const meta = await validateVideoUrl(url);
  if (!meta.valid) {
    return res.status(400).json({ success: false, error: meta.errorMsg });
  }
  // ...后续分析逻辑
});

app.post('/api/feedback', async (req, res) => {
  const { feedbackText, contactInfo } = req.body;
  console.log('收到反馈请求', feedbackText, contactInfo); // 新增
  try {
    await sendFeedbackMail(feedbackText, contactInfo);
    res.json({ success: true });
  } catch (e) {
    console.error('邮件发送失败', e); // 新增
    res.status(500).json({ error: '邮件发送失败' });
  }
});