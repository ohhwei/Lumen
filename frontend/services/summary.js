import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

export async function getSummary(url) {
  try {
    const res = await api.post('/summary', { url });
    return res.data.summary;
  } catch (err) {
    throw err.response?.data?.error || '服务异常';
  }
} 