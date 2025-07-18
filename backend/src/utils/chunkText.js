/**
 * 将字幕文本按句子分块，每块长度适中，支持重叠，保证语义完整。
 * @param {string} text - 原始字幕文本
 * @param {number} maxChunkSize - 每块最大字符数（推荐400）
 * @param {number} overlap - 块之间重叠字符数（推荐50）
 * @returns {Array<{content: string, start: number, end: number}>} 分块后的数组
 */
function sentenceChunk(text, maxChunkSize = 400, overlap = 50) {
  // 1. 按中文标点和换行分句，保证语义完整
  const sentences = text.split(/(?<=[。！？\n])/).map(s => s.trim()).filter(Boolean);

  const chunks = [];
  let currentChunk = '';
  let startIdx = 0; // 当前块在原文的起始字符索引

  for (let i = 0; i < sentences.length; i++) {
    // 如果加上当前句子后超过最大长度，则保存当前块
    if ((currentChunk + sentences[i]).length > maxChunkSize) {
      const endIdx = startIdx + currentChunk.length;
      chunks.push({
        content: currentChunk,
        start: startIdx,
        end: endIdx
      });

      // 2. 取当前块结尾的overlap个字符，作为下一个块的开头（重叠）
      const overlapText = currentChunk.slice(-overlap);
      startIdx = endIdx - overlapText.length;
      currentChunk = overlapText + sentences[i];
    } else {
      currentChunk += sentences[i];
    }
  }

  // 3. 处理最后一块
  if (currentChunk.length > 0) {
    chunks.push({
      content: currentChunk,
      start: startIdx,
      end: startIdx + currentChunk.length
    });
  }

  return chunks;
}

module.exports = { sentenceChunk };
