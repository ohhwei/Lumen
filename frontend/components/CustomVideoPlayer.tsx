import React, { useRef, useEffect } from 'react';
import dashjs from 'dashjs';

interface CustomVideoPlayerProps {
  mpdUrl: string;
  width?: string | number;
  height?: string | number;
}

const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({ mpdUrl, width = '100%', height = 480 }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!mpdUrl || !videoRef.current) return;
    const player = dashjs.MediaPlayer().create();
    player.initialize(videoRef.current, mpdUrl, false);
    return () => {
      player.reset();
    };
  }, [mpdUrl]);

  return (
    <div style={{ width, maxWidth: 800, margin: '0 auto', borderRadius: 8, background: '#000', overflow: 'hidden' }}>
      <video
        ref={videoRef}
        width="100%"
        height={height}
        controls
        style={{ display: 'block', background: '#000' }}
      />
    </div>
  );
};

export default CustomVideoPlayer; 