import { execFile } from 'child_process';
import { mkdir, access } from 'fs/promises';
import path from 'path';

export async function downloadVideo(videoId, tempDir) {
  const videoDir = path.join(tempDir, videoId);
  await mkdir(videoDir, { recursive: true });

  const videoPath = path.join(videoDir, 'video.mp4');
  const infoPath = path.join(videoDir, 'info.json');

  // Check if already downloaded
  try {
    await access(videoPath);
    const info = JSON.parse(await import('fs/promises').then(fs => fs.readFile(infoPath, 'utf-8')));
    return { videoPath, infoPath, videoDir, info, cached: true };
  } catch {}

  const url = `https://www.youtube.com/watch?v=${videoId}`;

  // Download video info
  const info = await new Promise((resolve, reject) => {
    execFile('python', ['-m', 'yt_dlp', '--dump-json', '--no-download', url], { maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
      if (err) return reject(new Error(`Failed to get video info: ${err.message}`));
      try { resolve(JSON.parse(stdout)); } catch { reject(new Error('Invalid video info response')); }
    });
  });

  const { writeFile } = await import('fs/promises');
  await writeFile(infoPath, JSON.stringify(info, null, 2));

  // Download video (medium quality for speed)
  await new Promise((resolve, reject) => {
    execFile('python', ['-m', 'yt_dlp', '-f', 'bestvideo[height<=720]+bestaudio/best[height<=720]/best', '--merge-output-format', 'mp4', '-o', videoPath, '--no-playlist', url], { maxBuffer: 10 * 1024 * 1024 }, (err) => {
      if (err) return reject(new Error(`Failed to download video: ${err.message}`));
      resolve();
    });
  });

  return { videoPath, infoPath, videoDir, info, cached: false };
}
