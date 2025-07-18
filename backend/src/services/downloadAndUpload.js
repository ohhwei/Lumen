// backend/src/services/downloadAndUpload.js
const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const { uploadToOSS } = require("./oss");

/**
 * 下载视频、音频，合并音视频，上传到 OSS
 * @param {string} videoUrl - 视频流直链
 * @param {string} audioUrl - 音频流直链
 * @param {string} ossPath - OSS 路径（如 videos/xxx.mp4）
 * @returns {Promise<{ mergedVideoUrlOSS: string, videoUrlOSS: string, audioUrlOSS: string, audioPath: string, videoPath: string, mergedPath: string }>}
 */
async function downloadAndUploadToOSS(videoUrl, audioUrl, ossPath) {
  // 1. 生成本地临时文件名
  const ts = Date.now();
  const videoFile = `${ts}_video.mp4`;
  const audioFile = `${ts}_audio.m4s`;
  const mergedFile = `${ts}_merged.mp4`;
  const videoPath = path.join("/tmp", videoFile);
  const audioPath = path.join("/tmp", audioFile);
  const mergedPath = path.join("/tmp", mergedFile);
  const referer = "https://www.bilibili.com";
  const userAgent =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36";

  // 下载函数
  function downloadWithAria2c(url, outPath) {
    return new Promise((resolve, reject) => {
      const fileName = path.basename(outPath);
      const aria2 = spawn("aria2c", [
        "-x",
        "16",
        "-s",
        "16",
        "--header",
        `Referer: ${referer}`,
        "--header",
        `User-Agent: ${userAgent}`,
        "-o",
        fileName,
        "-d",
        "/tmp",
        url,
      ]);
      aria2.stdout.on("data", (data) => console.log(`[aria2c] ${data}`));
      aria2.stderr.on("data", (data) =>
        console.error(`[aria2c error] ${data}`)
      );
      aria2.on("close", (code) => {
        if (code !== 0) {
          reject(new Error("aria2c 下载失败"));
        } else {
          resolve();
        }
      });
    });
  }

  // 2. 下载视频流
  await downloadWithAria2c(videoUrl, videoPath);
  // 3. 下载音频流
  await downloadWithAria2c(audioUrl, audioPath);

  // 4. 上传视频和音频到OSS
  const ossDir = path.dirname(ossPath);
  const videoUrlOSS = await uploadToOSS(videoPath, ossDir);
  const audioUrlOSS = await uploadToOSS(audioPath, ossDir);

  // 5. 合并音视频
  try {
    execSync(`ffmpeg -y -i ${videoPath} -i ${audioPath} -c copy ${mergedPath}`);
  } catch (e) {
    throw new Error("ffmpeg 合并音视频失败: " + e.message);
  }
  // 6. 上传合并后的视频到OSS
  const mergedVideoUrlOSS = await uploadToOSS(mergedPath, ossDir);

  // 7. 返回所有路径和OSS链接
  return {
    mergedVideoUrlOSS,
    videoUrlOSS,
    audioUrlOSS,
    audioPath,
    videoPath,
    mergedPath,
  };
}

module.exports = downloadAndUploadToOSS;
