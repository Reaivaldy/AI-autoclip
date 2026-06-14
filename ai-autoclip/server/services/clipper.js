import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { mkdir } from 'fs/promises';
import path from 'path';

if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic);

export async function generateClips(videoPath, clips, videoDir, segments = []) {
  const clipsDir = path.join(videoDir, 'clips');
  await mkdir(clipsDir, { recursive: true });

  const results = [];

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const outputPath = path.join(clipsDir, `clip_${i}.mp4`);
    const thumbnailPath = path.join(clipsDir, `thumb_${i}.jpg`);
    const duration = clip.end - clip.start;

    await cutClip(videoPath, outputPath, clip.start, duration);
    await generateThumbnail(videoPath, thumbnailPath, clip.start);

    // Build caption text from matching segments
    const clipSubs = segments
      .filter(seg => seg.end > clip.start && seg.start < clip.end)
      .map(seg => seg.text.trim())
      .filter(t => t.length > 0);

    results.push({
      index: i,
      ...clip,
      file: `clip_${i}.mp4`,
      thumbnail: `thumb_${i}.jpg`,
      duration: Math.round(duration),
      caption: clipSubs.join(' '),
    });
  }

  return results;
}

function cutClip(input, output, start, duration) {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .setStartTime(start)
      .duration(duration)
      .outputOptions([
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-avoid_negative_ts', 'make_zero',
      ])
      .output(output)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

function generateThumbnail(input, output, time) {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .screenshots({
        timestamps: [time],
        filename: path.basename(output),
        folder: path.dirname(output),
        size: '640x360',
      })
      .on('end', resolve)
      .on('error', reject);
  });
}
