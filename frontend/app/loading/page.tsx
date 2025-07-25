"use client";

import { Suspense } from "react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Progress, Button, Modal } from "antd";

// 动态导入的客户端组件
const ClientLoadingPage = dynamic(() => Promise.resolve(InnerLoadingPage), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50">
      <div className="flex flex-col items-center w-full max-w-md">
        <div className="text-2xl font-bold text-gray-900 mb-4 text-center">
          正在分析视频内容
        </div>
        <div className="text-secondary mb-4">
          可能需稍候3~5分钟
        </div>
        <Progress
          percent={8}
          showInfo={false}
          strokeColor={{ from: "#1677ff", to: "#52c41a" }}
          className="w-full mb-4"
        />
        <div className="w-full flex justify-between text-gray-400 text-xs mb-4">
          <span>0%</span>
          <span>8%</span>
          <span>100%</span>
        </div>
        <div className="w-full flex justify-center items-center mb-8">
          <span className="text-body">准备中...</span>
        </div>
      </div>
    </div>
  )
});

// 内部组件，现在完全在客户端渲染
function InnerLoadingPage() {
  const [progress, setProgress] = useState(8); // 默认8%
  const [steps, setSteps] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const router = useRouter();
  const ignoreRef = useRef(false);

  // 获取URL参数
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      setUrl(searchParams.get("url"));
    }
  }, []);

  // 启动分析任务
  useEffect(() => {
    if (!url) return;
    
    ignoreRef.current = false;
    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (ignoreRef.current) return;
        if (data.success && data.taskId) {
          setTaskId(data.taskId);
          // 把 taskId 写入 URL，方便后续轮询
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set("taskId", data.taskId);
          window.history.replaceState({}, "", newUrl.toString());
        } else {
          setError(data.error || "视频解析失败");
          Modal.error({
            title: "解析失败",
            content: data.error || "视频解析失败",
            centered: true,
            onOk: () => {
              ignoreRef.current = true;
              router.push("/");
            },
          });
        }
      });
    return () => {
      ignoreRef.current = true;
    };
  }, [url, router]);

  // 轮询后端进度API
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tid = searchParams.get("taskId");
    if (!tid) return;
    setTaskId(tid);
    const timer = setInterval(async () => {
      const res = await fetch(`/api/analyze/progress?taskId=${tid}`);
      const data = await res.json();
      if (data.success && data.data) {
        // 只要后端进度大于8%，就用真实进度，否则保持8%
        setProgress(data.data.percent > 8 ? data.data.percent : 8);
        setSteps(data.data.steps || []);
        setCurrentStep(data.data.currentStep || 0);
        if (data.data.error) {
          setError(data.data.error.message);
          clearInterval(timer);
          Modal.error({
            title: "分析失败",
            content: data.data.error.message || "请返回主页重试",
            centered: true,
            onOk: () => router.push("/"),
          });
        }
        if (
          (data.data.steps &&
            data.data.steps.length > 0 &&
            data.data.steps.every((s: any) => s.status === "done")) ||
          data.data.status === "done"
        ) {
          clearInterval(timer);
          setTimeout(() => {
            router.push(`/result?taskId=${tid}`);
          }, 800);
        }
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [router]);

  // 只显示当前步骤文本
  const currentStepText =
    steps.length > 0 && currentStep > 0
      ? steps[currentStep - 1]?.name
      : "准备中...";

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50">
      <div className="flex flex-col items-center w-full max-w-md">
        <div className="text-2xl font-bold text-gray-900 mb-4 text-center">
          正在分析视频内容
        </div>
        <div className="text-secondary mb-4">
          可能需稍候3~5分钟
        </div>
        <Progress
          percent={progress}
          showInfo={false}
          strokeColor={{ from: "#1677ff", to: "#52c41a" }}
          className="w-full mb-4"
        />
        <div className="w-full flex justify-between text-gray-400 text-xs mb-4">
          <span>0%</span>
          <span>{Math.round(progress)}%</span>
          <span>100%</span>
        </div>
        {/* 当前步骤，居中展示 */}
        <div className="w-full flex justify-center items-center mb-8">
          <span className="text-body">{currentStepText}</span>
        </div>
        <Button
          type="text"
          onClick={() => router.push("/")}
          className="text-blue-600"
        >
          返回主页
        </Button>
      </div>
    </div>
  );
}

// 页面默认导出
export default function LoadingPage() {
  return <ClientLoadingPage />;
}
