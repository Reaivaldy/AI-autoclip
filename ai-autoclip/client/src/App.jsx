import { useState, useRef } from 'react';
import UrlInput from './components/UrlInput';
import ProcessingStatus from './components/ProcessingStatus';
import ClipGallery from './components/ClipGallery';

const API = '';

export default function App() {
  const [phase, setPhase] = useState('idle'); // idle | processing | results | error
  const [jobId, setJobId] = useState(null);
  const [error, setError] = useState(null);
  const [clips, setClips] = useState([]);
  const [title, setTitle] = useState('');
  const pollRef = useRef(null);

  const handleSubmit = async (url) => {
    setError(null);
    setPhase('processing');
    setClips([]);

    try {
      const res = await fetch(`${API}/api/clip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start');
      setJobId(data.jobId);
      startPolling(data.jobId);
    } catch (err) {
      setPhase('error');
      setError(err.message);
    }
  };

  const startPolling = (id) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/clip/${id}/status`);
        const status = await res.json();

        if (status.title) setTitle(status.title);

        if (status.status === 'done') {
          clearInterval(pollRef.current);
          // Fetch clips
          const clipsRes = await fetch(`${API}/api/clip/${id}/clips`);
          const clipsData = await clipsRes.json();
          setClips(clipsData.clips || []);
          setPhase('results');
        } else if (status.status === 'error') {
          clearInterval(pollRef.current);
          setPhase('error');
          setError(status.error || 'Processing failed');
        }
      } catch {
        // ignore poll errors, will retry
      }
    }, 2000);
  };

  const handleReset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setPhase('idle');
    setJobId(null);
    setClips([]);
    setError(null);
    setTitle('');
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo" onClick={handleReset} style={{ cursor: 'pointer' }}>
          <span className="logo-icon">&#9986;&#65039;</span>
          <h1>AutoClip <span className="accent">AI</span></h1>
        </div>
        <p className="tagline">Turn any YouTube video into viral short clips</p>
      </header>

      <main className="main">
        <UrlInput onSubmit={handleSubmit} disabled={phase === 'processing'} />

        {phase === 'processing' && (
          <ProcessingStatus jobId={jobId} title={title} />
        )}

        {phase === 'error' && (
          <div className="error-box">
            <p className="error-title">Something went wrong</p>
            <p className="error-msg">{error}</p>
            <button className="btn" onClick={handleReset}>Try Again</button>
          </div>
        )}

        {phase === 'results' && (
          <ClipGallery clips={clips} jobId={jobId} title={title} onReset={handleReset} />
        )}
      </main>

      <footer className="footer">
        <p>Powered by Gemini AI &bull; Clips are auto-generated and may vary in quality</p>
      </footer>
    </div>
  );
}
