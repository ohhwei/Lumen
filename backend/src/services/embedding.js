const axios = require('axios');

/**
 * 阿里云百炼 Embedding 服务
 * 完全兼容 OpenAI Embedding API
 */
class AliyunEmbeddingService {
  constructor() {
    this.apiUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings';
    this.apiKey = process.env.DASHSCOPE_API_KEY;
    this.model = 'text-embedding-v4'; // 推荐用v4，支持多语种
    this.dimensions = 1024; // 可选，支持 2048/1536/1024/768/512/256/128/64
    if (!this.apiKey) {
      throw new Error('DASHSCOPE_API_KEY 环境变量未设置');
    }
    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * 单条文本 embedding
   * @param {string} text
   * @returns {Promise<Array<number>>}
   */
  async getEmbedding(text) {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          input: text,
          dimensions: this.dimensions,
          encoding_format: 'float'
        },
        { headers: this.headers }
      );
      // 返回 embedding 数组
      return response.data.data[0].embedding;
    } catch (error) {
      console.error('Aliyun Embedding生成失败:', error.response?.data || error.message);
      throw new Error(`Aliyun Embedding生成失败: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * 批量文本 embedding
   * @param {Array<string>} texts
   * @returns {Promise<Array<Array<number>>>}
   */
  async getBatchEmbeddings(texts) {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          input: texts,
          dimensions: this.dimensions,
          encoding_format: 'float'
        },
        { headers: this.headers }
      );
      // 返回 embedding 数组
      return response.data.data.map(item => item.embedding);
    } catch (error) {
      console.error('Aliyun 批量Embedding生成失败:', error.response?.data || error.message);
      throw new Error(`Aliyun 批量Embedding生成失败: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

const aliyunEmbeddingService = new AliyunEmbeddingService();

module.exports = {
  AliyunEmbeddingService,
  aliyunEmbeddingService
};
 