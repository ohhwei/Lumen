const { aliyunEmbeddingService } = require('../services/embedding');
const { SimpleVectorStore } = require('../services/vectorStore');

/**
 * RAG工具类
 * 负责字幕分块、embedding生成、向量存储和检索
 */
class RAGUtils {
  constructor() {
    this.vectorStore = new SimpleVectorStore();
  }

  /**
   * 处理字幕文本，生成向量存储
   * @param {Array<Object>} chunks - 分块后的字幕数组
   * @returns {Promise<void>}
   */
  async processTranscriptChunks(chunks) {
    try {
      console.log(`开始处理 ${chunks.length} 个字幕分块...`);
      
      // 提取所有文本内容
      const texts = chunks.map(chunk => chunk.content);
      
      // 批量生成embedding
      const embeddings = await aliyunEmbeddingService.getBatchEmbeddings(texts);
      
      // 将文本、embedding和元数据添加到向量存储
      const items = chunks.map((chunk, index) => ({
        text: chunk.content,
        embedding: embeddings[index],
        metadata: {
          start: chunk.start,
          end: chunk.end,
          chunkIndex: index
        }
      }));
      
      this.vectorStore.addBatch(items);
      
      console.log(`字幕处理完成，向量存储统计:`, this.vectorStore.getStats());
    } catch (error) {
      console.error('字幕处理失败:', error);
      throw error;
    }
  }

  /**
   * 检索与查询最相关的字幕分块
   * @param {string} query - 用户问题或模块需求
   * @param {number} topK - 返回最相关的前K个分块
   * @returns {Promise<Array<{text, metadata, similarity}>>}
   */
  async retrieveRelevantContent(query, topK = 5) {
    // 1. 用阿里云百炼API将查询文本转为embedding
    const queryEmbedding = await aliyunEmbeddingService.getEmbedding(query);

    // 2. 在向量库中计算与每个分块的相似度，取topK
    const results = this.vectorStore.search(queryEmbedding, topK);

    // 3. 返回检索结果（包含分块内容、元数据、相似度分数）
    return results;
  }

  /**
   * 根据模块类型增强查询
   * @param {string} query - 原始查询
   * @param {string} moduleName - 模块名称
   * @returns {string} 增强后的查询
   */
  enhanceQueryForModule(query, moduleName) {
    const enhancements = {
      summary: `视频摘要 主要内容 ${query}`,
      knowledgePoints: `知识点 重要概念 ${query}`,
      studyGuide: `学习指引 学习方法 ${query}`,
      questions: `练习题 测试题 ${query}`,
      references: `参考资料 相关资源 ${query}`,
      highlights: `亮点 重点内容 ${query}`,
      keywords: `关键词 核心词汇 ${query}`
    };
    
    return enhancements[moduleName] || query;
  }

  /**
   * 将检索结果格式化为模块输入
   * @param {Array<Object>} results - 检索结果
   * @param {string} moduleName - 模块名称
   * @returns {string} 格式化后的内容
   */
  formatResultsForModule(results, moduleName) {
    if (!results || results.length === 0) {
      return '未找到相关内容';
    }

    const formattedContent = results.map((result, index) => {
      const timeInfo = result.metadata.start !== undefined 
        ? `[${this.formatTime(result.metadata.start)}-${this.formatTime(result.metadata.end)}]`
        : '';
      
      return `${index + 1}. ${timeInfo} ${result.text}`;
    }).join('\n\n');

    return `基于视频内容的检索结果：\n\n${formattedContent}`;
  }

  /**
   * 格式化时间戳
   * @param {number} seconds - 秒数
   * @returns {string} 格式化的时间字符串
   */
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * 获取向量存储统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return this.vectorStore.getStats();
  }
}

module.exports = {
  RAGUtils
};
 