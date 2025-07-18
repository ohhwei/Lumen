# AI视频摘要项目

一个基于AI技术的智能视频摘要应用，支持从YouTube、Bilibili等平台提取视频内容并生成结构化摘要。

## 🚀 功能特性

- **多平台视频支持**：支持YouTube、Bilibili等主流视频平台
- **智能语音转文字**：使用腾讯云ASR服务进行高精度语音识别
- **AI内容摘要**：基于DeepSeek API生成结构化视频摘要
- **知识图谱构建**：自动提取关键知识点并建立关联
- **智能问答**：基于RAG技术提供视频内容问答服务
- **现代化UI**：使用Next.js + Tailwind CSS构建响应式界面

## 🛠️ 技术栈

### 前端
- **框架**：Next.js 14 + React 18
- **样式**：Tailwind CSS + Radix UI
- **语言**：TypeScript
- **状态管理**：React Hook Form + Zod

### 后端
- **运行时**：Node.js + Express
- **AI服务**：DeepSeek API + OpenAI API
- **语音识别**：腾讯云ASR
- **文件存储**：阿里云OSS
- **邮件服务**：Nodemailer

## 📦 项目结构

```
ai_project_0718/
├── frontend/                 # Next.js前端应用
│   ├── app/                 # App Router页面
│   ├── components/          # React组件
│   ├── services/           # API服务
│   └── public/             # 静态资源
├── backend/                # Express后端服务
│   ├── src/
│   │   ├── controllers/    # 控制器
│   │   ├── routes/         # 路由定义
│   │   ├── services/       # 业务逻辑
│   │   └── utils/          # 工具函数
│   └── uploads/            # 上传文件存储
└── package.json            # 根目录依赖
```

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn 或 pnpm

### 安装依赖

1. **安装根目录依赖**
```bash
npm install
```

2. **安装后端依赖**
```bash
cd backend
npm install
```

3. **安装前端依赖**
```bash
cd frontend
npm install
```

### 环境配置

1. **后端环境变量** (backend/.env)
```env
# 数据库配置
DATABASE_URL=your_database_url

# AI API配置
DEEPSEEK_API_KEY=your_deepseek_api_key
OPENAI_API_KEY=your_openai_api_key

# 腾讯云配置
TENCENT_SECRET_ID=your_tencent_secret_id
TENCENT_SECRET_KEY=your_tencent_secret_key

# 阿里云OSS配置
OSS_ACCESS_KEY_ID=your_oss_access_key_id
OSS_ACCESS_KEY_SECRET=your_oss_access_key_secret
OSS_BUCKET=your_bucket_name
OSS_REGION=your_region

# 邮件服务配置
EMAIL_HOST=your_email_host
EMAIL_PORT=587
EMAIL_USER=your_email_user
EMAIL_PASS=your_email_password
```

2. **前端环境变量** (frontend/.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 启动开发服务器

1. **启动后端服务**
```bash
cd backend
npm run dev
```

2. **启动前端服务**
```bash
cd frontend
npm run dev
```

3. **访问应用**
- 前端：http://localhost:3000
- 后端API：http://localhost:3001

## 📝 API文档

### 主要接口

- `POST /api/video/analyze` - 视频分析
- `POST /api/speech2text` - 语音转文字
- `POST /api/summary` - 生成摘要
- `GET /api/health` - 健康检查

## 🔧 部署

### 生产环境部署

1. **构建前端**
```bash
cd frontend
npm run build
```

2. **启动生产服务**
```bash
# 后端
cd backend
npm start

# 前端
cd frontend
npm start
```

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 Issue
- 发送邮件至：[your-email@example.com]

## 🙏 致谢

感谢以下开源项目和服务：
- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [DeepSeek](https://www.deepseek.com/)
- [腾讯云](https://cloud.tencent.com/)
- [阿里云OSS](https://www.aliyun.com/product/oss) 