import { execFile } from 'child_process';
import { readFile, readdir, unlink } from 'fs/promises';
import path from 'path';

export async function extractTranscript(videoId, videoDir) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  // Try to download auto-generated subtitles
  const subResult = await new Promise((resolve) => {
    execFile('python', ['-m', 'yt_dlp', '--write-auto-sub', '--sub-lang', 'en', '--sub-format', 'vtt', '--skip-download', '--no-playlist', '-o', path.join(videoDir, '%(id)s'), url], { maxBuffer: 10 * 1024 * 1024 }, (err) => {
      resolve(!err);
    });
  });

  // Look for subtitle files
  const files = await readdir(videoDir);
  const subFile = files.find(f => f.endsWith('.en.vtt') || f.endsWith('.en.srt'));

  if (subFile) {
    const raw = await readFile(path.join(videoDir, subFile), 'utf-8');
    const segments = parseVTT(raw);
    // Clean up subtitle file
    await unlink(path.join(videoDir, subFile)).catch(() => {});
    if (segments.length > 0) return { segments, source: 'subtitles' };
  }

  // Fallback: generate transcript from video info description + chapters
  const infoFile = files.find(f => f === 'info.json');
  if (infoFile) {
    const info = JSON.parse(await readFile(path.join(videoDir, infoFile), 'utf-8'));
    const segments = segmentsFromChapters(info);
    if (segments.length > 0) return { segments, source: 'chapters' };
  }

  // Last resort: create segments based on video duration
  return { segments: [], source: 'none' };
}

function parseVTT(raw) {
  const lines = raw.split('\n');
  const segments = [];
  let current = null;

  for (const line of lines) {
    const timeMatch = line.match(/([\d:.]+)\s*-->\s*([\d:.]+)/);
    if (timeMatch) {
      if (current && current.text.trim()) {
        segments.push(current);
      }
      current = {
        start: parseTimestamp(timeMatch[1]),
        end: parseTimestamp(timeMatch[2]),
        text: ''
      };
    } else if (current && line.trim() && !line.startsWith('WEBVTT') && !line.match(/^\d+$/)) {
      const clean = line.replace(/<[^>]*>/g, '').trim();
      if (clean) current.text += (current.text ? ' ' : '') + clean;
    }
  }
  if (current && current.text.trim()) segments.push(current);

  // Merge segments into larger chunks (15-30s each for better analysis)
  return mergeSegments(segments, 20);
}

function mergeSegments(segments, targetDuration) {
  if (segments.length === 0) return [];

  const merged = [];
  let current = { ...segments[0] };

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const duration = seg.end - current.start;

    if (duration > targetDuration) {
      merged.push(current);
      current = { ...seg };
    } else {
      current.end = seg.end;
      current.text += ' ' + seg.text;
    }
  }
  merged.push(current);
  return merged;
}

function segmentsFromChapters(info) {
  if (!info.chapters || info.chapters.length === 0) return [];
  return info.chapters.map(ch => ({
    start: ch.start_time,
    end: ch.end_time,
    text: ch.title
  }));
}

function parseTimestamp(ts) {
  const parts = ts.replace(',', '.').split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}
