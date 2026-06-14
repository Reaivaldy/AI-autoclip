import { useState } from 'react';

export default function UrlInput({ onSubmit, disabled }) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim()) onSubmit(url.trim());
  };

  const isValid = url.includes('youtube.com') || url.includes('youtu.be') || url.length === 11;

  return (
    <form className="url-input" onSubmit={handleSubmit}>
      <div className="input-wrapper">
        <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a YouTube URL here..."
          disabled={disabled}
          className="text-field"
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={disabled || !url.trim()}>
        {disabled ? (
          <span className="spinner" />
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Generate Clips
          </>
        )}
      </button>
    </form>
  );
}
