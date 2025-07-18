import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

export async function speechToText(audioUrl) {
  try {
    const res = await api.post('/speech2text', { audioUrl });
    return res.data.text;
  } catch (err) {
    throw err.response?.data?.error || '服务异常';
  }
} 