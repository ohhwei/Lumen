const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * 用 ffmpeg 把音频分割成多个小片段
 * @param {string} audioPath 本地音频文件路径
 * @param {number} segmentSeconds 每段时长（秒），如300=5分钟
 * @returns {string[]} 分片文件路径数组
 */
function splitAudio(audioPath, segmentSeconds = 300) {
  const dir = path.dirname(audioPath);
  const base = path.basename(audioPath, path.extname(audioPath));
  const outPattern = path.join(dir, `${base}_part%03d.wav`);
  // 删除旧分片
  fs.readdirSync(dir).forEach(f => {
    if (f.startsWith(base + '_part') && f.endsWith('.wav')) fs.unlinkSync(path.join(dir, f));
  });
  // 分割
  execSync(`ffmpeg -y -i "${audioPath}" -f segment -segment_time ${segmentSeconds} -ar 16000 -ac 1 -sample_fmt s16 "${outPattern}"`);
  // 返回所有分片路径
  return fs.readdirSync(dir)
    .filter(f => f.startsWith(base + '_part') && f.endsWith('.wav'))
    .map(f => path.join(dir, f))
    .sort();
}

module.exports = { splitAudio };
