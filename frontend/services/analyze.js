import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

export async function analyzeVideo(url, type) {
  try {
    const res = await api.post('/api/analyze', { url, type });
    return res.data.data;
  } catch (err) {
    throw err.response?.data?.error || '服务异常';
  }
} 