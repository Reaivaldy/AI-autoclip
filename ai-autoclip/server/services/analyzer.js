import { GoogleGenerativeAI } from '@google/generative-ai';

const MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite'];
const MAX_RETRIES = 3;

async function generateWithRetry(model, prompt, retryCount = 0) {
  try {
    return await model.generateContent(prompt);
  } catch (err) {
    if (err.status === 429 && retryCount < MAX_RETRIES) {
      const retryMatch = err.message.match(/retry in ([\d.]+)s/i);
      const waitMs = retryMatch
        ? Math.ceil(parseFloat(retryMatch[1]) * 1000)
        : (retryCount + 1) * 30000;
      console.log(`Rate limited, retrying in ${waitMs / 1000}s (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(r => setTimeout(r, waitMs));
      return generateWithRetry(model, prompt, retryCount + 1);
    }
    throw err;
  }
}

export async function analyzeTranscript(segments, videoInfo) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const genAI = new GoogleGenerativeAI(apiKey);

  const transcriptText = segments.map((s, i) =>
    `[Segment ${i}] (${formatTime(s.start)} - ${formatTime(s.end)}): ${s.text}`
  ).join('\n');

  const title = videoInfo.title || 'Unknown video';
  const duration = videoInfo.duration || 0;

  const prompt = `You are an expert viral content editor analyzing a YouTube video to find the best "hook" moments for short-form clips (like TikTok, YouTube Shorts, Instagram Reels).

VIDEO TITLE: "${title}"
VIDEO DURATION: ${formatTime(duration)}

TRANSCRIPT SEGMENTS:
${transcriptText}

Analyze each segment and score it on these criteria:
1. **Hook Strength** (0-100): Does it grab attention immediately? Does it make you want to keep watching?
2. **Emotional Impact** (0-100): Does it evoke strong emotions (surprise, humor, inspiration, curiosity)?
3. **Self-Contained** (0-100): Does the clip make sense on its own without needing context from the rest of the video?
4. **Virality Potential** (0-100): Would someone share this clip? Is it memorable?

For each segment, calculate an overall score as the weighted average:
- Hook Strength: 35%
- Emotional Impact: 25%
- Self-Contained: 20%
- Virality Potential: 20%

Return ONLY a valid JSON array (no markdown, no code blocks) of the top 8 segments, sorted by overall score descending:
[
  {
    "segmentIndex": 0,
    "start": 120.5,
    "end": 145.2,
    "score": 92,
    "hookScore": 95,
    "emotionScore": 90,
    "selfContainedScore": 88,
    "viralScore": 94,
    "reason": "Opens with a surprising statement that creates immediate curiosity..."
  }
]

Rules:
- Pick segments that are 15-60 seconds long (ideal for short-form)
- Prefer segments that start strong in the first 3 seconds
- Avoid segments that are just introductions or filler
- If segments are too short, combine adjacent ones
- Ensure timestamps match the input segments exactly`;

  let lastErr;
  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      console.log(`Trying model: ${modelName}`);
      const result = await generateWithRetry(model, prompt);
      const response = result.response.text().trim();

      // Parse JSON from response (handle markdown code blocks)
      let jsonStr = response;
      const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();

      try {
        const clips = JSON.parse(jsonStr);
        return clips.map(clip => ({
          ...clip,
          start: Math.max(0, clip.start - 2),  // 2s padding before
          end: Math.min(duration || Infinity, clip.end + 2),  // 2s padding after
        }));
      } catch (e) {
        throw new Error(`Failed to parse Gemini response: ${e.message}\nResponse: ${response.substring(0, 500)}`);
      }
    } catch (err) {
      lastErr = err;
      if (err.status === 429) {
        console.log(`Model ${modelName} quota exhausted, trying next...`);
        continue;
      }
      throw err;
    }
  }
  throw new Error(`All models rate limited. Last error: ${lastErr?.message}`);
}

function formatTime(seconds) {
  if (!seconds || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
