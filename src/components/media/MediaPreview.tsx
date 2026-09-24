/* eslint-disable @next/next/no-img-element -- PRD section 10: preview must show the raw object URL without Next Image transforms. */

export function ImagePreview({ src, alt = "Preview" }: { src: string; alt?: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className="max-h-72 w-full rounded-control border border-line bg-canvas object-contain"
    />
  );
}

export function AudioPreview({ src }: { src: string }) {
  return <audio controls src={src} className="w-full" />;
}
