// backend/src/services/extractAudio.js
const { exec } = require('child_process');
const path = require('path');

/**
 * 用 ffmpeg 从本地视频提取音频（16kHz单声道wav）
 * @param {string} videoPath - 本地视频路径
 * @param {string} outputDir - 输出目录
 * @returns {Promise<string>} - 返回音频文件路径
 */
function extractAudioWithFfmpeg(videoPath, outputDir) {
  return new Promise((resolve, reject) => {
    const audioPath = path.join(outputDir, `${Date.now()}.wav`);
    const cmd = `ffmpeg -y -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}"`;
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        reject(new Error('ffmpeg 音频提取失败: ' + stderr));
        return;
      }
      resolve(audioPath);
    });
  });
}

module.exports = extractAudioWithFfmpeg;
