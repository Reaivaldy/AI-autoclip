# AI AutoClip

AI AutoClip takes a YouTube URL, downloads the video, extracts a transcript when available, uses Gemini to identify strong short-form clip moments, and renders shareable clips with animated captions.

## What’s Included

- React + Vite client for submitting video URLs and viewing generated clips
- Express server that orchestrates downloading, transcription, analysis, and clip rendering
- Remotion project for captioned video rendering
- Temporary file storage under `server/temp/` for generated assets

## Requirements

- Node.js 18 or newer
- FFmpeg available through `ffmpeg-static`
- A Gemini API key

## Setup

1. Install dependencies from the repo root:

```bash
npm install
cd client && npm install
cd ../server && npm install
cd ../remotion && npm install
```

2. Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
```

## Running the App

Start the client and server together from the root:

```bash
npm run dev
```

Run the server on its own:

```bash
npm run server
```

Run the client on its own:

```bash
npm run client
```

Run the Remotion studio from the `remotion/` folder:

```bash
cd remotion
npm run studio
```

## Scripts

### Root

- `npm run dev` - starts the server and client together
- `npm run server` - starts the Express API on `http://localhost:3001`
- `npm run client` - starts the Vite dev server

### Client

- `npm run dev` - starts Vite
- `npm run build` - builds the frontend for production

### Server

- `npm run start` - starts the API server

### Remotion

- `npm run studio` - opens Remotion Studio
- `npm run build` - renders `ClipComposition` to `out.mp4`
- `npm run render` - runs the custom render entry point

## API Endpoints

- `GET /api/health` - health check
- `POST /api/clip` - starts processing a YouTube URL
- `GET /api/clip/:id/status` - returns job progress
- `GET /api/clip/:id/clips` - returns generated clips
- `GET /api/clip/:id/clips/:index` - streams a clip file
- `GET /api/clip/:id/thumbs/:index` - streams a clip thumbnail
- `GET /api/clip/:id/download/:index` - downloads a clip

## Notes

- Jobs are kept in memory, so restarting the server clears active jobs.
- Generated files are cleaned up automatically after a period of inactivity.
- If Gemini rate limits or quota errors appear, try again later or use a different API key.
