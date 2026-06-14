import { useState, useEffect } from 'react';

const STEPS = [
  { key: 'download', label: 'Downloading video', icon: '⬇️' },
  { key: 'transcript', label: 'Extracting transcript', icon: '📝' },
  { key: 'analyze', label: 'AI analyzing for hooks', icon: '🧠' },
  { key: 'clip', label: 'Generating clips', icon: '✂️' },
];

export default function ProcessingStatus({ jobId, title }) {
  const [step, setStep] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!jobId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/clip/${jobId}/status`);
        const data = await res.json();
        setStep(data.step || '');
        setProgress(data.progress || 0);
      } catch {}
    }, 1500);
    return () => clearInterval(interval);
  }, [jobId]);

  const activeIndex = progress < 30 ? 0 : progress < 55 ? 1 : progress < 75 ? 2 : 3;

  return (
    <div className="processing">
      <div className="processing-card">
        {title && <p className="processing-title">{title}</p>}

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="steps">
          {STEPS.map((s, i) => (
            <div key={s.key} className={`step ${i < activeIndex ? 'done' : i === activeIndex ? 'active' : ''}`}>
              <span className="step-icon">{i < activeIndex ? '✓' : s.icon}</span>
              <span className="step-label">{s.label}</span>
            </div>
          ))}
        </div>

        <p className="processing-detail">{step || 'Starting...'}</p>
      </div>
    </div>
  );
}
