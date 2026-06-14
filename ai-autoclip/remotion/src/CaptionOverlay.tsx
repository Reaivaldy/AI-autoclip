import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { createTikTokStyleCaptions, Caption } from "@remotion/captions";

const HIGHLIGHT_COLOR = "#39E508";
const SWITCH_CAPTIONS_EVERY_MS = 1200;

type CaptionOverlayProps = {
  captions: Caption[];
};

export const CaptionOverlay: React.FC<CaptionOverlayProps> = ({ captions }) => {
  const { fps } = useVideoConfig();

  if (captions.length === 0) return null;

  const { pages } = createTikTokStyleCaptions({
    captions,
    combineTokensWithinMilliseconds: SWITCH_CAPTIONS_EVERY_MS,
  });

  return (
    <AbsoluteFill>
      {pages.map((page, index) => {
        const nextPage = pages[index + 1] ?? null;
        const startFrame = (page.startMs / 1000) * fps;
        const endFrame = Math.min(
          nextPage ? (nextPage.startMs / 1000) * fps : Infinity,
          startFrame + (SWITCH_CAPTIONS_EVERY_MS / 1000) * fps
        );
        const durationInFrames = endFrame - startFrame;

        if (durationInFrames <= 0) return null;

        return (
          <Sequence
            key={index}
            from={startFrame}
            durationInFrames={durationInFrames}
          >
            <CaptionPage page={page} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

type CaptionPageProps = {
  page: {
    startMs: number;
    tokens: Array<{
      text: string;
      fromMs: number;
      toMs: number;
    }>;
  };
};

const CaptionPage: React.FC<CaptionPageProps> = ({ page }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const currentTimeMs = (frame / fps) * 1000;
  const absoluteTimeMs = page.startMs + currentTimeMs;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 120,
      }}
    >
      <div
        style={{
          fontSize: 72,
          fontWeight: "bold",
          whiteSpace: "pre",
          textAlign: "center",
          lineHeight: 1.3,
          maxWidth: "90%",
          textShadow:
            "0 0 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.6), 2px 2px 4px rgba(0,0,0,0.9)",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {page.tokens.map((token, i) => {
          const isActive =
            token.fromMs <= absoluteTimeMs && token.toMs > absoluteTimeMs;

          return (
            <span
              key={`${token.fromMs}-${i}`}
              style={{
                color: isActive ? HIGHLIGHT_COLOR : "white",
                transform: isActive ? "scale(1.05)" : "scale(1)",
                display: "inline-block",
                transition: "none",
              }}
            >
              {token.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
