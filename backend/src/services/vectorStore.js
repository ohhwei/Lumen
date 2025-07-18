/**
 * 计算两个向量的余弦相似度
 * @param {Array<number>} vectorA
 * @param {Array<number>} vectorB
 * @returns {number}
 */
function calculateCosineSimilarity(vectorA, vectorB) {
  if (vectorA.length !== vectorB.length) {
    throw new Error('向量维度不匹配');
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}

/**
 * 简单的内存向量存储
 * 适用于小规模数据和开发测试
 * 生产环境建议使用专业的向量数据库（如Pinecone、Weaviate等）
 */
class SimpleVectorStore {
  constructor() {
    this.vectors = [];        // 存储embedding向量
    this.metadata = [];       // 存储对应的元数据
    this.texts = [];          // 存储原始文本
  }

  /**
   * 添加文本和对应的embedding到存储
   * @param {string} text - 原始文本
   * @param {Array<number>} embedding - embedding向量
   * @param {Object} metadata - 元数据（如时间戳、章节信息等）
   */
  add(text, embedding, metadata = {}) {
    this.texts.push(text);
    this.vectors.push(embedding);
    this.metadata.push(metadata);
  }

  /**
   * 批量添加文本和embedding
   * @param {Array<Object>} items - 包含text, embedding, metadata的对象数组
   */
  addBatch(items) {
    items.forEach(item => {
      this.add(item.text, item.embedding, item.metadata);
    });
  }

  /**
   * 搜索最相似的文本
   * @param {Array<number>} queryEmbedding - 查询向量
   * @param {number} topK - 返回前K个结果
   * @returns {Array<Object>} 相似度排序的结果数组
   */
  search(queryEmbedding, topK = 5) {
    const similarities = this.vectors.map((vector, index) => ({
      index,
      text: this.texts[index],
      metadata: this.metadata[index],
      similarity: calculateCosineSimilarity(queryEmbedding, vector)
    }));

    // 按相似度降序排序
    similarities.sort((a, b) => b.similarity - a.similarity);

    // 返回前topK个结果
    return similarities.slice(0, topK);
  }

  /**
   * 根据文本搜索相似内容
   * @param {string} queryText - 查询文本
   * @param {number} topK - 返回前K个结果
   * @returns {Promise<Array<Object>>} 相似度排序的结果数组
   */
  async searchByText(queryText, topK = 5) {
    try {
      // 为查询文本生成embedding
      const queryEmbedding = await bgeEmbeddingService.getEmbedding(queryText);
      
      // 搜索相似内容
      return this.search(queryEmbedding, topK);
    } catch (error) {
      console.error('文本搜索失败:', error);
      throw error;
    }
  }

  /**
   * 获取存储统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      totalItems: this.vectors.length,
      vectorDimension: this.vectors.length > 0 ? this.vectors[0].length : 0,
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * 清空存储
   */
  clear() {
    this.vectors = [];
    this.metadata = [];
    this.texts = [];
  }
}

module.exports = {
  SimpleVectorStore
};
 