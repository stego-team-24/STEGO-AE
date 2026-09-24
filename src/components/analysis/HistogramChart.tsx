"use client";

export function HistogramChart({
  cover,
  stego,
  coverColor = "#AEB8C8",
  stegoColor = "#E4BE70",
  height = 180,
}: {
  cover: number[];
  stego: number[];
  coverColor?: string;
  stegoColor?: string;
  height?: number;
}) {
  const bins = cover.length;
  const max = Math.max(1, ...cover, ...stego);

  // The viewBox is `0 0 bins height`, so one bin is exactly 1 unit wide.
  const renderBars = (data: number[], color: string, inset: number, opacity: number) =>
    data.map((value, index) => {
      const h = (value / max) * height;
      return (
        <rect
          key={index}
          x={index + inset}
          y={height - h}
          width={1 - inset * 2}
          height={h}
          fill={color}
          opacity={opacity}
        />
      );
    });

  return (
    <div>
      <svg
        viewBox={`0 0 ${bins} ${height}`}
        preserveAspectRatio="none"
        className="w-full rounded-control border border-line bg-canvas"
        style={{ height }}
        role="img"
        aria-label="RGB histogram, cover and stego overlaid"
      >
        {renderBars(cover, coverColor, 0.06, 0.6)}
        {renderBars(stego, stegoColor, 0.2, 0.75)}
      </svg>
      <div className="mt-2 flex justify-between text-[11px] text-muted">
        <span>0</span>
        <span>128</span>
        <span>255</span>
      </div>
    </div>
  );
}
