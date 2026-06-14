import ClipCard from './ClipCard';

export default function ClipGallery({ clips, jobId, title, onReset }) {
  return (
    <div className="gallery">
      <div className="gallery-header">
        <div>
          <h2 className="gallery-title">{title || 'Your Clips'}</h2>
          <p className="gallery-subtitle">{clips.length} clips generated, sorted by hook score</p>
        </div>
        <button className="btn btn-outline" onClick={onReset}>
          New Video
        </button>
      </div>

      <div className="clip-grid">
        {clips.map((clip, i) => (
          <ClipCard key={i} clip={clip} jobId={jobId} index={i} />
        ))}
      </div>
    </div>
  );
}
