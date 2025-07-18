// 引入阿里云 OSS SDK
const OSS = require("ali-oss");
const path = require("path");

// 读取环境变量
const accessKeyId = process.env.ALIYUN_OSS_ACCESS_KEY_ID;
const accessKeySecret = process.env.ALIYUN_OSS_ACCESS_KEY_SECRET;
const bucket = process.env.ALIYUN_OSS_BUCKET;
const region = process.env.ALIYUN_OSS_REGION;

// 创建 OSS 客户端实例
const client = new OSS({
  region,
  accessKeyId,
  accessKeySecret,
  bucket,
});

/**
 * 上传本地文件到阿里云 OSS（分片并发上传，带进度和超时）
 * @param {string} localFilePath 本地文件路径
 * @param {string} [ossDir='videos/'] OSS 目录前缀，可选
 * @returns {Promise<string>} 返回 OSS 公网访问链接
 */
async function uploadToOSS(localFilePath, ossDir = "videos/") {
  console.log("[uploadToOSS] 进入函数:", localFilePath, ossDir);
  const fileName = path.basename(localFilePath);
  const ossPath = path.posix.join(ossDir, fileName);
  try {
    console.log("[uploadToOSS] 开始分片并发上传...");
    const start = Date.now();
    // 分片并发上传，partSize=8MB，parallel=5
    const result = await Promise.race([
      client.multipartUpload(ossPath, localFilePath, {
        partSize: 8 * 1024 * 1024, // 8MB
        parallel: 5,
        progress: (p) => {
          const percent = Math.floor(p * 100);
          if (percent % 10 === 0) {
            console.log(`[uploadToOSS] 上传进度: ${percent}%`);
          }
        },
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("OSS分片上传超时（5分钟）")), 300000)
      ),
    ]);
    console.log("[uploadToOSS] 上传成功:", result.url);
    console.log("上传成功，耗时(ms):", Date.now() - start);
    // 拼接 OSS 公网访问链接
    const publicUrl = `https://${bucket}.${region}.aliyuncs.com/${ossPath}`;
    return publicUrl;
  } catch (err) {
    console.error("[uploadToOSS] 上传失败:", err);
    throw err;
  }
}

module.exports = { uploadToOSS };
