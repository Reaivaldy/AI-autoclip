import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { mkdir, readdir, readFile, unlink, rm } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { downloadVideo } from '../services/downloader.js';
import { extractTranscript } from '../services/transcriber.js';
import { analyzeTranscript } from '../services/analyzer.js';
import { generateClips } from '../services/clipper.js';
import { renderCaptions } from '../services/caption-renderer.js';
import { parseYouTubeId } from '../utils/timestamps.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// In-memory job store
const jobs = new Map();

const TEMP_DIR = path.join(__dirname, '..', 'temp');

// Start processing a YouTube video
router.post('/api/clip', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const videoId = parseYouTubeId(url);
  if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL' });

  const jobId = uuid();
  jobs.set(jobId, {
    id: jobId,
    videoId,
    status: 'queued',
    step: 'Waiting in queue...',
    progress: 0,
    clips: null,
    error: null,
    title: null,
    createdAt: Date.now(),
  });

  // Process asynchronously
  processVideo(jobId, videoId).catch(err => {
    const job = jobs.get(jobId);
    if (job) {
      job.status = 'error';
      if (err.status === 429) {
        job.error = 'Gemini API quota exhausted. Free tier resets daily at midnight PT. You can: (1) wait for quota reset, (2) use a different API key, or (3) upgrade at https://ai.google.dev/pricing';
      } else if (err.message?.includes('All models rate limited')) {
        job.error = 'All Gemini models are rate limited. Free tier daily quota is fully used. Please try again tomorrow or upgrade your API key at https://ai.google.dev/pricing';
      } else {
        job.error = err.message;
      }
    }
  });

  res.json({ jobId, videoId });
});

// Poll job status
router.get('/api/clip/:id/status', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  res.json({
    id: job.id,
    status: job.status,
    step: job.step,
    progress: job.progress,
    title: job.title,
    error: job.error,
    clipCount: job.clips ? job.clips.length : 0,
  });
});

// Get clip list
router.get('/api/clip/:id/clips', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (!job.clips) return res.status(202).json({ error: 'Clips not ready yet' });

  res.json({ clips: job.clips, title: job.title });
});

// Stream a clip file
router.get('/api/clip/:id/clips/:index', async (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job || !job.clips) return res.status(404).json({ error: 'Not found' });

  const index = parseInt(req.params.index);
  const clip = job.clips[index];
  if (!clip) return res.status(404).json({ error: 'Clip not found' });

  const filePath = path.join(TEMP_DIR, job.videoId, 'clips', clip.file);
  res.sendFile(filePath);
});

// Stream a thumbnail
router.get('/api/clip/:id/thumbs/:index', async (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job || !job.clips) return res.status(404).json({ error: 'Not found' });

  const index = parseInt(req.params.index);
  const clip = job.clips[index];
  if (!clip) return res.status(404).json({ error: 'Clip not found' });

  const filePath = path.join(TEMP_DIR, job.videoId, 'clips', clip.thumbnail);
  res.sendFile(filePath);
});

// Download a clip
router.get('/api/clip/:id/download/:index', async (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job || !job.clips) return res.status(404).json({ error: 'Not found' });

  const index = parseInt(req.params.index);
  const clip = job.clips[index];
  if (!clip) return res.status(404).json({ error: 'Clip not found' });

  const filePath = path.join(TEMP_DIR, job.videoId, 'clips', clip.file);
  const safeTitle = (job.title || 'clip').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
  res.download(filePath, `${safeTitle}_clip${index + 1}.mp4`);
});

async function processVideo(jobId, videoId) {
  const job = jobs.get(jobId);
  await mkdir(TEMP_DIR, { recursive: true });

  // Step 1: Download
  job.status = 'processing';
  job.step = 'Downloading video...';
  job.progress = 10;

  const { videoPath, info } = await downloadVideo(videoId, TEMP_DIR);
  job.title = info.title || 'Untitled';
  job.progress = 30;

  // Step 2: Extract transcript
  job.step = 'Extracting transcript...';
  job.progress = 40;

  const { segments } = await extractTranscript(videoId, path.join(TEMP_DIR, videoId));
  job.progress = 55;

  // Step 3: AI analysis
  job.step = 'AI analyzing video for hooks...';
  job.progress = 60;

  let clips;
  if (segments.length > 0) {
    clips = await analyzeTranscript(segments, info);
  } else {
    // No transcript: create segments from video duration and analyze title/description
    const duration = info.duration || 300;
    const autoSegments = [];
    for (let i = 0; i < duration; i += 30) {
      autoSegments.push({
        start: i,
        end: Math.min(i + 30, duration),
        text: `[Segment from ${Math.floor(i / 60)}:${String(i % 60).padStart(2, '0')}]`
      });
    }
    clips = await analyzeTranscript(autoSegments, info);
  }
  job.progress = 75;

  // Step 4: Generate clips
  job.step = 'Generating clips...';
  job.progress = 80;

  const rawResults = await generateClips(videoPath, clips, path.join(TEMP_DIR, videoId), segments);
  job.progress = 85;

  // Step 5: Render TikTok-style captions onto clips using Remotion
  job.step = 'Rendering animated captions...';
  const results = await renderCaptions(rawResults, segments, path.join(TEMP_DIR, videoId));
  job.progress = 100;

  job.clips = results;
  job.status = 'done';
  job.step = 'Complete!';
}

// Cleanup old jobs every 30 minutes
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, job] of jobs) {
    if (job.createdAt < cutoff) {
      jobs.delete(id);
      rm(path.join(TEMP_DIR, job.videoId), { recursive: true, force: true }).catch(() => {});
    }
  }
}, 30 * 60 * 1000);

export default router;
