import { AbsoluteFill } from "remotion";
import { Video } from "@remotion/media";
import { Caption } from "@remotion/captions";
import { CaptionOverlay } from "./CaptionOverlay";

export type ClipCompositionProps = {
  videoSrc: string;
  captions: Caption[];
  durationInFrames: number;
};

export const ClipComposition: React.FC<ClipCompositionProps> = ({
  videoSrc,
  captions,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Video
        src={videoSrc}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      <CaptionOverlay captions={captions} />
    </AbsoluteFill>
  );
};
