const axios = require('axios');

// validateVideoUrl mock 实现
// 入参：url
// 出参：{ valid: boolean, platform: string, title: string, cover: string, duration: number, errorMsg?: string }

// 解析Bilibili BV号
function extractBiliBV(url) {
  const match = url.match(/bilibili\.com\/video\/(BV[\w]+)/i);
  return match ? match[1] : null;
}

// 解析YouTube视频ID
function extractYoutubeId(url) {
  // 支持youtube.com/watch?v=xxx 和 youtu.be/xxx
  let match = url.match(/v=([\w-]{11})/);
  if (match) return match[1];
  match = url.match(/youtu\.be\/([\w-]{11})/);
  return match ? match[1] : null;
}

// ISO8601转秒（PT1H2M3S）
function iso8601ToSeconds(iso) {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const [, h, m, s] = iso.match(regex) || [];
  return (parseInt(h || 0) * 3600) + (parseInt(m || 0) * 60) + (parseInt(s || 0));
}

async function validateVideoUrl(url) {
  // Bilibili
  const biliBV = extractBiliBV(url);
  if (biliBV) {
    try {
      const api = `https://api.bilibili.com/x/web-interface/view?bvid=${biliBV}`;
      const resp = await axios.get(api);
      const data = resp.data && resp.data.data;
      if (!data) return { valid: false, errorMsg: 'B站视频不存在' };
      const duration = data.duration; // 秒
      if (duration < 120 || duration > 7200) {
        return { valid: false, errorMsg: '视频时长需在2分钟到2小时之间' };
      }
      console.log('B站视频duration:', duration);
      return {
        valid: true,
        platform: 'bilibili',
        title: data.title,
        cover: data.pic,
        duration: Math.round(duration / 60), // 返回分钟
      };
    } catch (e) {
      console.error('B站视频信息获取失败:', e);
      return { valid: false, errorMsg: 'B站视频信息获取失败' };
    }
  }

  // YouTube
  const ytId = extractYoutubeId(url);
  if (ytId) {
    try {
      const api = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${ytId}&key=AIzaSyArdjnEzNpJE5G2mrWb6nJJyLv6Hh8bv2w`;
      const resp = await axios.get(api);
      const items = resp.data && resp.data.items;
      if (!items || !items.length) return { valid: false, errorMsg: 'YouTube视频不存在' };
      const snippet = items[0].snippet;
      const details = items[0].contentDetails;
      const durationSec = iso8601ToSeconds(details.duration);
      if (durationSec < 120 || durationSec > 7200) {
        return { valid: false, errorMsg: '视频时长需在2分钟到2小时之间' };
      }
      return {
        valid: true,
        platform: 'youtube',
        title: snippet.title,
        cover: snippet.thumbnails && (snippet.thumbnails.maxres?.url || snippet.thumbnails.high?.url || snippet.thumbnails.default?.url),
        duration: Math.round(durationSec / 60), // 返回分钟
      };
    } catch (e) {
      console.error('YouTube视频信息获取失败:', e);
      return { valid: false, errorMsg: 'YouTube视频信息获取失败' };
    }
  }

  // 非法链接
  return { valid: false, errorMsg: '仅支持Bilibili或YouTube链接' };
}

module.exports = { validateVideoUrl }; 