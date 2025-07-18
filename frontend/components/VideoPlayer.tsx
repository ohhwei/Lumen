import React, { useState } from 'react';
import ReactPlayer from 'react-player';
import { getPlayableUrl } from '../lib/utils';

interface VideoPlayerProps {
  url?: string;
  width?: string | number;
  height?: string | number;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, width = '100%', height = 480 }) => {
  const [error, setError] = useState(false);
  const playableUrl = getPlayableUrl(url);

  if (!url || !playableUrl) {
    return <div style={{ textAlign: 'center', color: '#888' }}>无效的视频链接</div>;
  }

  // 参考 BibiGPT：B站直接用原生 iframe，无遮罩，体验与官方一致
  if (playableUrl.startsWith('https://player.bilibili.com/player.html')) {
    return (
      <div style={{ width: width, maxWidth: 800, margin: '0 auto', borderRadius: 8, background: '#000', overflow: 'hidden' }}>
        <iframe
          src={playableUrl}
          width="100%"
          height={height}
          allowFullScreen
          frameBorder="0"
          style={{ display: 'block', border: 'none', background: '#000' }}
          title="Bilibili Player"
        />
      </div>
    );
  }

  // 其他平台用ReactPlayer
  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {error ? (
        <div style={{ textAlign: 'center', color: 'red' }}>视频加载失败，请检查链接或网络</div>
      ) : (
        <ReactPlayer
          url={playableUrl}
          width={width}
          height={height}
          controls
          onError={() => setError(true)}
        />
      )}
    </div>
  );
};

export default VideoPlayer; 