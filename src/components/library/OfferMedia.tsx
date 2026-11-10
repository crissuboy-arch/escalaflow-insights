import { useEffect, useRef, useState } from "react";
import { ImageOff, Play } from "lucide-react";
import type { LibraryOffer } from "@/lib/library/offers";
import { cn } from "@/lib/utils";

/**
 * Mídia real da oferta. Ordem: cópia durável (Supabase Storage) → URL
 * original. Em cartões, o vídeo só toca no hover (como numa biblioteca de
 * swipes); no modo "full" mostra controles. Se nada carregar, mostra um
 * estado honesto — nunca uma imagem inventada.
 */
export function OfferMedia({
  offer,
  mode = "card",
  className,
  active,
}: {
  offer: LibraryOffer;
  mode?: "card" | "full" | "hero";
  className?: string;
  /** força reprodução (ex.: cartão em hover) */
  active?: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const showVideo = Boolean(offer.video) && !videoFailed;
  const showImage = Boolean(offer.image) && !imgFailed;

  useEffect(() => {
    const v = videoRef.current;
    if (!v || mode === "full") return;
    if (active) v.play().catch(() => {});
    else {
      v.pause();
      try {
        v.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
  }, [active, mode]);

  if (!showVideo && !showImage) {
    return (
      <div
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted to-muted/40 p-4 text-center text-muted-foreground",
          className,
        )}
        data-testid="offer-media-empty"
      >
        <ImageOff className="h-7 w-7 opacity-50" />
        <span className="text-xs font-medium">
          {imgFailed || videoFailed || offer.media_status === "expired"
            ? "Mídia original expirou antes de ser guardada"
            : "Oferta sem criativo capturado"}
        </span>
      </div>
    );
  }

  if (showVideo && (mode === "full" || !showImage || active)) {
    return (
      <video
        ref={videoRef}
        src={offer.video ?? undefined}
        poster={showImage ? (offer.image ?? undefined) : undefined}
        className={cn(
          "h-full w-full bg-black",
          mode === "full" ? "object-contain" : "object-cover",
          className,
        )}
        muted={mode !== "full"}
        loop={mode !== "full"}
        playsInline
        controls={mode === "full"}
        autoPlay={mode === "hero"}
        preload={mode === "full" ? "metadata" : "none"}
        onError={() => setVideoFailed(true)}
        data-testid="offer-media-video"
      />
    );
  }

  return (
    <div className={cn("relative h-full w-full", className)}>
      <img
        src={offer.image ?? undefined}
        alt={offer.headline || offer.advertiser}
        className={cn("h-full w-full", mode === "full" ? "object-contain" : "object-cover")}
        loading={mode === "hero" ? "eager" : "lazy"}
        onError={() => setImgFailed(true)}
        data-testid="offer-media-image"
      />
      {showVideo && mode === "card" && (
        <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
          <Play className="h-3 w-3 fill-white" /> Vídeo
        </span>
      )}
    </div>
  );
}
