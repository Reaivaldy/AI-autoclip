import { useRef, useState } from 'react';

export default function ClipCard({ clip, jobId, index }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  const handlePlay = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const scoreColor = clip.score >= 80 ? '#22c55e' : clip.score >= 60 ? '#eab308' : '#ef4444';

  return (
    <div className="clip-card">
      <div className="clip-video-wrap" onClick={handlePlay}>
        <video
          ref={videoRef}
          src={`/api/clip/${jobId}/clips/${index}`}
          poster={`/api/clip/${jobId}/thumbs/${index}`}
          preload="metadata"
          loop
          muted
          playsInline
        />
        {!playing && (
          <div className="play-overlay">
            <svg viewBox="0 0 24 24" fill="white" width="48" height="48">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        )}
        <div className="clip-duration">{formatTime(clip.duration)}</div>
      </div>

      <div className="clip-info">
        <div className="clip-score-bar">
          <div className="score-badge" style={{ background: scoreColor }}>
            {clip.score}%
          </div>
          <span className="score-label">Hook Score</span>
        </div>

        <div className="clip-breakdown">
          <div className="breakdown-item">
            <span className="breakdown-dot" style={{ background: '#6366f1' }} />
            <span>Hook {clip.hookScore}%</span>
          </div>
          <div className="breakdown-item">
            <span className="breakdown-dot" style={{ background: '#ec4899' }} />
            <span>Emotion {clip.emotionScore}%</span>
          </div>
          <div className="breakdown-item">
            <span className="breakdown-dot" style={{ background: '#f59e0b' }} />
            <span>Viral {clip.viralScore}%</span>
          </div>
        </div>

        {clip.caption && (
          <p className="clip-caption">{clip.caption}</p>
        )}

        {clip.reason && (
          <p className="clip-reason">{clip.reason}</p>
        )}

        <div className="clip-time">
          {formatTime(clip.start)} &mdash; {formatTime(clip.end)}
        </div>

        <a
          href={`/api/clip/${jobId}/download/${index}`}
          className="btn btn-download"
          download
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download Clip
        </a>
      </div>
    </div>
  );
}
