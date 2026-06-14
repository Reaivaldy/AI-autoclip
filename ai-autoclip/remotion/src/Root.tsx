import { Composition } from "remotion";
import { ClipComposition } from "./ClipComposition";

export const RemotionRoot = () => {
  return (
    <Composition
      id="ClipComposition"
      component={ClipComposition}
      durationInFrames={300}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        videoSrc: "",
        captions: [] as Array<{
          text: string;
          startMs: number;
          endMs: number;
          timestampMs: number | null;
          confidence: number | null;
        }>,
        durationInFrames: 300,
      }}
      calculateMetadata={async ({ props }) => {
        return {
          durationInFrames: props.durationInFrames,
        };
      }}
    />
  );
};
