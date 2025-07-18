"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Progress, Button, Modal } from "antd";

export default function LoadingPage() {
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const url = searchParams?.get("url");
  const ignoreRef = useRef(false);

  // 启动分析任务
  useEffect(() => {
    ignoreRef.current = false;
    if (!url) return;
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
    // 1. 从 URL 获取 taskId
    const searchParams = new URLSearchParams(window.location.search);
    const tid = searchParams.get("taskId");
    if (!tid) return;
    setTaskId(tid);
    const timer = setInterval(async () => {
      console.log("轮询进度", tid);
      const res = await fetch(`/api/analyze/progress?taskId=${tid}`);
      const data = await res.json();
      if (data.success && data.data) {
        setProgress(data.data.percent || 0);
        setSteps(data.data.steps || []);
        setCurrentStep(data.data.currentStep || 0);
        setVideoTitle(data.data.videoTitle || "");
        if (data.data.error) {
          setError(data.data.error.message);
          clearInterval(timer);
          Modal.error({
            title: "分析失败",
            content: data.data.error.message || "视频分析失败",
            centered: true,
            onOk: () => router.push("/"),
          });
        }
        // 只有所有步骤都 done 或 status: 'done' 时才跳转
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

  // 移除基于 percent==100 或单步完成的跳转

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50">
      <div className="flex flex-col items-center w-full max-w-md">
        <div className="text-2xl font-bold text-gray-900 mb-2">
          {videoTitle ? `正在分析：${videoTitle}` : "正在分析视频内容"}
        </div>
        <div className="text-gray-500 mb-8">
          请稍候，我们正在为您提取和分析视频中的知识点…
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
        <div className="w-full mb-4">
          {steps.length > 0 && (
            <ul className="space-y-1">
              {steps.map((step, idx) => (
                <li
                  key={idx}
                  className={
                    idx === currentStep - 1
                      ? "font-bold text-blue-600"
                      : step.status === "done"
                      ? "text-green-600"
                      : step.status === "error"
                      ? "text-red-500"
                      : "text-gray-600"
                  }
                >
                  <span>{step.name}</span>
                  {step.detail && (
                    <span className="ml-2 text-xs text-gray-400">
                      {step.detail}
                    </span>
                  )}
                  {step.status === "error" && (
                    <span className="ml-2">（失败，正在重试…）</span>
                  )}
                </li>
              ))}
            </ul>
          )}
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
