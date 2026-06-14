import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { rename } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REMOTION_ENTRY = path.resolve(__dirname, '..', '..', 'remotion', 'src', 'index.ts');

let bundleLocation = null;

async function getBundle() {
  if (bundleLocation) return bundleLocation;
  bundleLocation = await bundle({
    entryPoint: REMOTION_ENTRY,
    webpackOverride: (config) => config,
  });
  return bundleLocation;
}

/**
 * Convert transcript segments to Remotion Caption[] format.
 */
function segmentsToCaptions(segments, clipStart, clipEnd) {
  return segments
    .filter(seg => seg.end > clipStart && seg.start < clipEnd)
    .map(seg => ({
      text: seg.text.trim(),
      startMs: Math.round((Math.max(seg.start, clipStart) - clipStart) * 1000),
      endMs: Math.round((Math.min(seg.end, clipEnd) - clipStart) * 1000),
      timestampMs: null,
      confidence: 1.0,
    }))
    .filter(c => c.text.length > 0);
}

/**
 * Render TikTok-style captions onto each clip using Remotion.
 * Replaces the raw clip file with the captioned version.
 */
export async function renderCaptions(clips, segments, videoDir) {
  const clipsDir = path.join(videoDir, 'clips');
  const serveUrl = await getBundle();

  const results = [];

  for (const clip of clips) {
    const rawPath = path.join(clipsDir, clip.file);
    const captionedPath = path.join(clipsDir, `captioned_${clip.index}.mp4`);

    const captions = segmentsToCaptions(segments, clip.start, clip.end);

    if (captions.length === 0) {
      results.push({ ...clip, hasCaptions: false });
      continue;
    }

    try {
      const maxEndMs = captions.reduce((max, c) => Math.max(max, c.endMs), 0);
      const fps = 30;
      const durationInFrames = Math.ceil((maxEndMs / 1000) * fps);

      const inputProps = {
        videoSrc: `file:///${rawPath.replace(/\\/g, '/')}`,
        captions,
        durationInFrames,
      };

      const composition = await selectComposition({
        serveUrl,
        id: 'ClipComposition',
        inputProps,
      });

      await renderMedia({
        composition: {
          ...composition,
          durationInFrames,
          fps,
          width: 1080,
          height: 1920,
        },
        serveUrl,
        codec: 'h264',
        outputLocation: captionedPath,
        inputProps,
      });

      await rename(captionedPath, rawPath);
      results.push({ ...clip, hasCaptions: true });
    } catch (err) {
      console.error(`Failed to render captions for clip ${clip.index}:`, err.message);
      results.push({ ...clip, hasCaptions: false });
    }
  }

  return results;
}
