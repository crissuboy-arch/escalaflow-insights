import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";

interface OpportunityMediaProps {
  imageUrl: string | null;
  videoUrl: string | null;
  title: string;
}

// Same media-resolution priority already used by the offer card on
// /minerar (image first, then video, then a placeholder) — reused here so
// handoff-derived project cards show the REAL opportunity media instead of
// an empty block, without duplicating or altering that card's own code.
export function OpportunityMedia({ imageUrl, videoUrl, title }: OpportunityMediaProps) {
  const [imgError, setImgError] = useState(false);
  const [videoError, setVideoError] = useState(false);

  if (videoUrl && !videoError) {
    return (
      <video
        src={videoUrl}
        poster={imageUrl ?? undefined}
        className="h-full w-full object-cover"
        muted
        loop
        playsInline
        controls
        onError={() => setVideoError(true)}
      />
    );
  }
  if (imageUrl && !imgError) {
    return (
      <img
        src={imageUrl}
        alt={title}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
      <ImageIcon className="h-8 w-8 opacity-40" />
      <span className="text-sm font-medium">sem mídia capturada</span>
    </div>
  );
}
