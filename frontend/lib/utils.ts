import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 更细致的视频链接校验，仅允许Bilibili和YouTube的视频详情页
export function validateVideoUrl(url: string): { valid: boolean; error?: string } {
  if (!url.trim()) {
    return { valid: false, error: '请输入视频链接' };
  }
  // Bilibili视频页（含BV/av号，支持末尾/和参数）
  const bilibiliPattern = /^https?:\/\/(www\.)?bilibili\.com\/video\/(BV[\w\d]+|av\d+)(\/)?(\?.*)?$/;
  // Bilibili短链
  const b23Pattern = /^https?:\/\/(www\.)?b23\.tv\/[\w\d]+(\?.*)?$/;
  // YouTube主站视频页
  const youtubePattern = /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+(&[\w-]+=[\w-]+)*$/;
  // YouTube短链
  const youtuPattern = /^https?:\/\/(www\.)?youtu\.be\/[\w-]+(\?.*)?$/;

  if (
    bilibiliPattern.test(url) ||
    b23Pattern.test(url) ||
    youtubePattern.test(url) ||
    youtuPattern.test(url)
  ) {
    return { valid: true };
  }
  return { valid: false, error: '仅支持Bilibili或YouTube的视频链接' };
}

/**
 * 将用户输入的视频链接转换为可用于 ReactPlayer 的播放链接
 * 支持 Bilibili（带参数或不带参数）、YouTube、直接视频链接等
 * @param url 用户输入的视频链接
 * @returns 可播放的链接或 null
 */
export function getPlayableUrl(url?: string): string | null {
  if (!url) return null;
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (ytMatch) {
    return `https://www.youtube.com/watch?v=${ytMatch[1]}`;
  }
  // Bilibili（支持带参数的链接）
  // 匹配 BV号
  const biliMatch = url.match(/bilibili\.com\/video\/(BV[\w]+)/i);
  if (biliMatch) {
    return `https://player.bilibili.com/player.html?bvid=${biliMatch[1]}`;
  }
  // 直接视频链接
  if (url.match(/\.(mp4|webm|ogg)$/)) {
    return url;
  }
  // 其他平台可扩展
  return url;
}
