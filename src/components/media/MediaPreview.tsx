/* eslint-disable @next/next/no-img-element -- PRD section 10: preview must show the raw object URL without Next Image transforms. */

export function ImagePreview({ src, alt = "Preview", className }: { src: string; alt?: string; className?: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className={`${className ?? "max-h-72 w-full rounded-control border border-line bg-canvas object-contain"} p5-media-enter`}
    />
  );
}

export function AudioPreview({ src }: { src: string }) {
  return <audio controls src={src} className="p5-audio-enter w-full" />;
}
