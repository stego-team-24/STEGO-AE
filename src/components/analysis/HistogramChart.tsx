"use client";

import type { RgbHistogram } from "@/lib/contracts/types";

export function HistogramChart({ cover, stego }: { cover: RgbHistogram; stego: RgbHistogram }) {
  const width = 640;
  const height = 320;
  const left = 58;
  const right = 18;
  const top = 18;
  const bottom = 42;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const channels = [
    { key: "r" as const, color: "#ef6262", label: "Red" },
    { key: "g" as const, color: "#4dc58a", label: "Green" },
    { key: "b" as const, color: "#6595ef", label: "Blue" },
  ];
  const max = Math.max(1, ...channels.flatMap(({ key }) => [...cover[key], ...stego[key]]));
  const renderBars = (data: number[], color: string, opacity: number, offset: number) => data.map((value, index) => {
    const barHeight = (value / max) * plotHeight;
    const binWidth = plotWidth / 256;
    return <rect key={index} x={left + index * binWidth + offset} y={top + plotHeight - barHeight} width={Math.max(0.7, binWidth / 2 - 0.25)} height={barHeight} fill={color} opacity={opacity} />;
  });

  return <div className="rounded-control border border-line bg-canvas p-3">
    <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
      {channels.map(({ key, color, label }) => <span key={key} className="inline-flex items-center gap-2"><i className="size-2 rounded-full" style={{ backgroundColor: color }} />{label}</span>)}
      <span className="ml-auto">Solid: cover · translucent: stego</span>
    </div>
    <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label="RGB pixel intensity histograms comparing cover and stego">
      {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
        const y = top + plotHeight * (1 - fraction);
        return <g key={fraction}><line x1={left} x2={width - right} y1={y} y2={y} stroke="#343448" strokeDasharray={fraction === 0 ? undefined : "3 4"} /><text x={left - 9} y={y + 5} textAnchor="end" fill="#b1b1c3" fontSize="13">{Math.round(max * fraction)}</text></g>;
      })}
      {channels.map(({ key, color }) => <g key={key}>{renderBars(cover[key], color, 0.82, 0)}{renderBars(stego[key], color, 0.38, (plotWidth / 256) / 2)}</g>)}
      {[0, 64, 128, 192, 255].map((tick) => <text key={tick} x={left + (tick / 255) * plotWidth} y={height - 15} textAnchor={tick === 0 ? "start" : tick === 255 ? "end" : "middle"} fill="#b1b1c3" fontSize="13">{tick}</text>)}
    </svg>
    <div className="text-right text-[11px] text-muted">Pixel intensity (0–255)</div>
  </div>;
}
