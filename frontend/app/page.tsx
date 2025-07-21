"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { message, Modal, Input, Button, Popover } from 'antd';
import { validateVideoUrl } from "@/lib/utils";
import { createStyles } from 'antd-style';
import { ConfigProvider } from 'antd';

export default function HomePage() {
  const [videoUrl, setVideoUrl] = useState("")
  const [isValidUrl, setIsValidUrl] = useState(false)
  const [urlError, setUrlError] = useState<string | undefined>(undefined)
  const [feedbackVisible, setFeedbackVisible] = useState(false)
  const [contactVisible, setContactVisible] = useState(false)
  const [currentRecommendIndex, setCurrentRecommendIndex] = useState(0)
  const [feedbackText, setFeedbackText] = useState("")
  const [contactInfo, setContactInfo] = useState("")
  const [feedbackError, setFeedbackError] = useState<string | undefined>(undefined)
  const router = useRouter()

  const useStyle = createStyles(({ prefixCls, css }) => ({
    linearGradientButton: css`
      &.${prefixCls}-btn-primary:not([disabled]):not(.${prefixCls}-btn-dangerous) {
        > span {
          position: relative;
        }
        &::before {
          content: '';
          background: linear-gradient(135deg, #6253e1, #04befe);
          position: absolute;
          inset: -1px;
          opacity: 1;
          transition: all 0.3s;
          border-radius: inherit;
        }
        /* 悬停时依然显示渐变色 */
        &:hover::before {
          opacity: 1;
        }
      }
    `,
  }));
  const { styles } = useStyle();

  // 推荐视频数据
  const recommendedVideos = [
    {
      id: 1,
      title: "Attention is all you need 论文解读及Transformer架构详细介绍",
      cover: "/cover1.jpg",
      desc: "该论文是现代大语言模型的基石，其核心创新在于Transformer架构和自注意力机制。",
      source: "Bilibili",
      url: "https://www.bilibili.com/video/BV1xoJwzDESD/?spm_id_from=333.1391.0.0&vd_source=954fddf33ed009a89f941d3a79947c59",
    },
    {
      id: 2,
      title: "万字科普GPT4为何会颠覆现有工作流；为何你要关注微软Copilot、文心一言等大模型",
      cover: "/cover2.jpg",
      desc: "视频深入探讨了ChatGPT-4的核心原理、训练阶段及其对社会的潜在颠覆性影响。",
      source: "Bilibili",
      url: "https://www.bilibili.com/video/BV1MY4y1R7EN/?spm_id_from=333.337.search-card.all.click&vd_source=954fddf33ed009a89f941d3a79947c59",
    },
    {
      id: 3,
      title: "万字科普DeepSeek R1底层原理，DeepSeek是从0到1的创新吗？",
      cover: "/cover3.jpg",
      desc: "视频由浅入深的为你解释DeepSeek R1的技术路线，让你明白DeepSeek和OpenAI的差别到底在哪里？",
      source: "Bilibili",
      url: "https://www.bilibili.com/video/BV1cV93YGEoy/?spm_id_from=333.337.search-card.all.click&vd_source=954fddf33ed009a89f941d3a79947c59",
    },
  ]

  // 验证视频链接
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setVideoUrl(url)
    const { valid, error } = validateVideoUrl(url)
    setIsValidUrl(valid)
    setUrlError(error)
  }

  const handleAnalyze = async () => {
    if (!isValidUrl) return;
    setUrlError(undefined); // 或 setError('')
    // setLoading(true);    // 如果有 loading 状态
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrl }),
      });
      const data = await res.json();
      if (data.taskId) {
        router.push(`/loading?taskId=${data.taskId}`);
      } else {
        setUrlError(data.error || '提交失败');
      }
    } catch (e) {
      setUrlError('网络错误');
    }
    // setLoading(false);   // 如果有 loading 状态
  };

  const handleRecommendClick = (video: any) => {
    router.push(`/result?id=${video.id}`)
  }

  const handlePrevRecommend = () => {
    setCurrentRecommendIndex((prev) => (prev === 0 ? Math.max(0, recommendedVideos.length - 3) : prev - 1))
  }

  const handleNextRecommend = () => {
    setCurrentRecommendIndex((prev) => (prev >= recommendedVideos.length - 3 ? 0 : prev + 1))
  }

  const handleFeedbackSubmit = () => {
    if (!feedbackText.trim()) {
      setFeedbackError("请输入反馈意见");
      return;
    }
    if (feedbackText.length > 200) {
      setFeedbackError("反馈意见不能超过200字");
      return;
    }
    if (contactInfo.length > 20) {
      setFeedbackError("联系方式不能超过20字");
      return;
    }
    setFeedbackError(undefined);

    // 这里是提交反馈的地方
    // 你需要加上如下 fetch 请求
    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feedbackText,
        contactInfo
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          message.success('反馈提交成功！');
          setFeedbackVisible(false);
          setFeedbackText("");
          setContactInfo("");
        } else {
          setFeedbackError(data.error || '提交失败');
        }
      })
      .catch(() => {
        setFeedbackError('网络错误');
      });
  }

  const visibleVideos = recommendedVideos.slice(currentRecommendIndex, currentRecommendIndex + 3)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 顶部导航 */}
      <header className="w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div className="flex items-center">
            <img
              src="/logo.png"
              alt="logo"
              className="h-12 w-auto"
              style={{ display: "block" }}
            />
          </div>
          <div className="flex items-center space-x-4">
            <Button type="text" onClick={() => setFeedbackVisible(true)}>
              <span className="text-body">反馈</span>
            </Button>
            <Popover
              content={
                <div className="flex flex-col items-center p-4">
                  <div className="mb-2 font-medium">扫码添加微信</div>
                  <img src="/wechat-qrcode.png" alt="微信二维码" className="w-40 h-40" />
                </div>
              }
              trigger="click"
              placement="bottom"
            >
              <Button type="text"><span className="text-body">联系我</span></Button>
            </Popover>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="flex-1 flex items-center justify-center max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="w-full">
        {/* 标题区 */}
        <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-900 mb-6 gradient-text">AI视频学习助手</h1>
            <p className="text-xl text-gray-600 mb-6 gradient-text opacity-80">穿过繁杂信息，构建知识网络，让每一次观看成为真正的理解</p>
        </div>

        {/* 输入区 */}
          <ConfigProvider button={{ className: styles.linearGradientButton }}>
        <div className="relative w-full max-w-2xl mx-auto" style={{ maxWidth: 720 }}>
          <input
            type="text"
              className="w-full h-14 px-6 text-lg rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 input-placeholder-14"
              placeholder="推荐请输入 Bilibili 视频链接"
            value={videoUrl}
            onChange={handleUrlChange}
            style={{ width: 720 }}
            onKeyDown={e => {
              if (e.key === 'Enter' && isValidUrl) {
                handleAnalyze();
              }
            }}
          />
            <Button
              type="primary"
              className={`absolute right-2 top-1/2 -translate-y-1/2 w-15 h-11 flex items-center justify-center rounded-full border border-gray-200 transition z-10 ${!isValidUrl ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={!isValidUrl}
            onClick={handleAnalyze}
            aria-label="分析"
          >
              <span>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 18l6-6-6-6"/></svg>
              </span>
            </Button>
          {/* 错误提示 */}
          {urlError && videoUrl && (
            <div className="text-red-500 mt-2 text-sm absolute left-0 top-full">{urlError}</div>
          )}
        </div>
          </ConfigProvider>

        {/* 推荐案例标题 */}
          <h2
            className="mb-10 mt-16 text-center truncate"
            style={{ fontFamily: 'Inter, Inter_Fallback, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, Hiragino Sans GB, Microsoft YaHei, sans-serif', fontSize: 14, fontWeight: 600, lineHeight: '1.4' }}
          >
            推荐案例
          </h2>

        {/* 推荐区 */}
        <div className="flex justify-center items-center gap-8">
          {/* 左按钮 */}
          {/* <button
            className={`
              w-10 h-10 flex items-center justify-center rounded-full
              bg-transparent
              text-gray-400
              hover:bg-gray-100 hover:text-gray-600
              transition
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            onClick={handlePrevRecommend}
            aria-label="上一组"
            disabled={currentRecommendIndex === 0}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button> */}

          {/* 卡片区 */}
          <div className="flex gap-8">
            {visibleVideos.map((video) => (
                <div key={video.id} className="w-60 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
                {/* 封面区：16:9 横向比例 */}
                <div className="w-full relative" style={{ paddingBottom: '56.25%' }}>
                  <img
                    src={video.cover}
                    alt={video.title}
                    className="absolute top-0 left-0 w-full h-full object-cover"
                    style={{ borderTopLeftRadius: '0.75rem', borderTopRightRadius: '0.75rem' }}
                  />
                </div>
                {/* 内容区 */}
                  <div className="p-3 flex flex-col">
                  {/* 标题 */}
                  <div
                      className="mb-1 truncate"
                      style={{ fontFamily: 'Inter, Inter_Fallback, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, Hiragino Sans GB, Microsoft YaHei, sans-serif', fontSize: 14, fontWeight: 600, lineHeight: '1.6' }}
                    title={video.title}
                  >
                    {video.title}
                  </div>
                  {/* 简介 */}
                  <div
                      className="text-secondary text-sm mb-2"
                    style={{
                        fontSize: 13,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: '1.4',
                        minHeight: '2.6em'
                    }}
                    title={video.desc}
                  >
                    {video.desc}
                  </div>
                  {/* 来源 */}
                  <div className="flex items-center gap-1 text-gray-400 text-xs mt-auto">
                    <img
                      src={video.source === "Bilibili" ? "/bilibili.png" : "/youtube.png"}
                      alt={video.source}
                        className="w-4 h-4 mr-2"
                      style={{ display: "inline-block" }}
                    />
                    {video.source}
                  </div>
                </div>
              </div>
            ))}
          </div>
         {/* 右按钮 */}
          {/* <button
            className={`
              w-10 h-10 flex items-center justify-center rounded-full
              bg-transparent
              text-gray-400
              hover:bg-gray-100 hover:text-gray-600
              transition
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            onClick={handleNextRecommend}
            aria-label="下一组"
            disabled={currentRecommendIndex >= recommendedVideos.length - 3}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 6l6 6-6 6"/>
            </svg>
          </button> */}
          </div>
        </div>
      </main>

      {/* 反馈弹窗 */}
      <Modal
        title="反馈"
        open={feedbackVisible}
        onCancel={() => {
          setFeedbackVisible(false)
          setFeedbackText("")
          setContactInfo("")
          setFeedbackError(undefined)
        }}
        onOk={handleFeedbackSubmit}
        okText="提交"
        cancelText="取消"
      >
        <div className="mb-6">
          <label className="block font-medium mb-3">反馈意见 <span className="text-red-500">*</span></label>
        <Input.TextArea
          value={feedbackText}
            onChange={e => {
              setFeedbackText(e.target.value)
              setFeedbackError(undefined)
            }}
          maxLength={200}
            rows={4}
            placeholder="请输入您的反馈意见"
          showCount
            required
          />
        </div>
        <div className="mb-6">
          <label className="block font-medium mb-3">联系方式（选填）</label>
          <Input
            value={contactInfo}
            onChange={e => {
              setContactInfo(e.target.value)
              setFeedbackError(undefined)
            }}
            maxLength={20}
            placeholder="如微信/邮箱/手机号"
          />
        </div>
        {feedbackError && <div className="text-red-500 text-sm mt-2">{feedbackError}</div>}
      </Modal>
    </div>
  )
}
