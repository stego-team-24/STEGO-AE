"use client";

import { useState } from "react";
import type { RgbHistogram } from "@/lib/contracts/types";

interface HistogramChartProps {
  cover: RgbHistogram;
  stego: RgbHistogram;
  coverLabel?: string;
  stegoLabel?: string;
  layout?: "stack" | "columns" | "compare";
  focusChannel?: "r" | "g" | "b";
  onZoomChannel?: (channel: "r" | "g" | "b") => void;
}

const channels = [
  { key: "r" as const, label: "Red (R)", coverColor: "#f87171", stegoColor: "#991b1b" },
  { key: "g" as const, label: "Green (G)", coverColor: "#4ade80", stegoColor: "#166534" },
  { key: "b" as const, label: "Blue (B)", coverColor: "#60a5fa", stegoColor: "#1e40af" },
];

function ChannelHistogram({
  coverValues,
  stegoValues,
  label,
  coverLabel,
  stegoLabel,
  coverColor,
  stegoColor,
  onZoom,
}: {
  coverValues: number[];
  stegoValues: number[];
  label: string;
  coverLabel: string;
  stegoLabel: string;
  coverColor: string;
  stegoColor: string;
  onZoom?: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState(128);
  const width = 1000;
  const height = 430;
  const left = 68;
  const right = 22;
  const top = 35;
  const bottom = 48;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const visibleBins = Math.max(1, Math.floor(256 / zoom));
  const start = Math.max(0, Math.min(256 - visibleBins, Math.round(center - visibleBins / 2)));
  const end = start + visibleBins;
  const binWidth = plotWidth / visibleBins;
  const max = Math.max(1, ...coverValues.slice(start, end), ...stegoValues.slice(start, end));
  const barWidth = binWidth * 0.43;

  return <section className="min-w-0 rounded-control border border-line bg-canvas p-3 sm:p-4">
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <h4 className="mr-auto flex items-center gap-2 text-[12px] font-semibold text-ink">{label}{onZoom ? <button type="button" onClick={onZoom} className="rounded-control border border-line px-2 py-1 text-[11px] text-muted hover:text-ink" aria-label={`Expand ${label} histogram`}>⤢</button> : null}</h4>
      <span className="inline-flex items-center gap-2 text-[10px] text-muted"><i className="size-2.5 rounded-sm" style={{ backgroundColor: coverColor }} />{coverLabel}</span>
      <span className="inline-flex items-center gap-2 text-[10px] text-muted"><i className="size-2.5 rounded-sm" style={{ backgroundColor: stegoColor }} />{stegoLabel}</span>
    </div>
    <div className="mb-2 grid grid-cols-[auto_1fr_auto] items-center gap-2 text-[10px] text-muted">
      <span>Zoom</span>
      <input aria-label={`${label} histogram zoom`} type="range" min="1" max="16" step="1" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
      <span>{zoom}×</span>
    </div>
    {zoom > 1 ? <div className="mb-2 grid grid-cols-[auto_1fr_auto] items-center gap-2 text-[10px] text-muted">
      <span>Intensity</span>
      <input aria-label={`${label} histogram intensity position`} type="range" min={visibleBins / 2} max={256 - visibleBins / 2} step="1" value={center} onChange={(event) => setCenter(Number(event.target.value))} />
      <span>{start}–{end - 1}</span>
    </div> : null}
    <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label={`${label} intensity histogram comparing ${coverLabel} and ${stegoLabel}`}>
      {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
        const y = top + plotHeight * (1 - fraction);
        return <g key={fraction}>
          <line x1={left} x2={width - right} y1={y} y2={y} stroke="#343448" strokeDasharray={fraction === 0 ? undefined : "3 4"} />
          <text x={left - 9} y={y + 5} textAnchor="end" fill="#b1b1c3" fontSize="14">{Math.round(max * fraction)}</text>
        </g>;
      })}
      {Array.from({ length: visibleBins }, (_, offset) => {
        const index = start + offset;
        const coverHeight = (coverValues[index] / max) * plotHeight;
        const stegoHeight = (stegoValues[index] / max) * plotHeight;
        return <g key={index}>
          <rect x={left + offset * binWidth + binWidth * 0.04} y={top + plotHeight - coverHeight} width={barWidth} height={coverHeight} fill={coverColor} />
          <rect x={left + offset * binWidth + binWidth * 0.52} y={top + plotHeight - stegoHeight} width={barWidth} height={stegoHeight} fill={stegoColor} />
        </g>;
      })}
      {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
        const value = Math.round(start + fraction * (visibleBins - 1));
        return <text key={fraction} x={left + fraction * plotWidth} y={height - 12} textAnchor={fraction === 0 ? "start" : fraction === 1 ? "end" : "middle"} fill="#b1b1c3" fontSize="14">{value}</text>;
      })}
    </svg>
    <div className="text-right text-[10px] text-muted">Pixel intensity (0–255)</div>
  </section>;
}

export function HistogramChart({ cover, stego, coverLabel = "Cover", stegoLabel = "Stego", layout = "stack", focusChannel, onZoomChannel }: HistogramChartProps) {
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState(128);
  const visibleBins = Math.max(1, Math.floor(256 / zoom));
  const start = Math.max(0, Math.min(256 - visibleBins, Math.round(center - visibleBins / 2)));
  const end = start + visibleBins;
  if (layout === "compare") {
    const sides = [
      { label: coverLabel, data: cover, color: "#f87171" },
      { label: stegoLabel, data: stego, color: "#60a5fa" },
    ];
    return <div className="w-full min-w-0">
      <div className="mb-3 rounded-control border border-line bg-canvas p-3">
        <label className="grid grid-cols-[auto_1fr_auto] items-center gap-3 text-[11px] text-muted"><span>Zoom histogram</span><input type="range" min="1" max="16" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /><span>{zoom}×</span></label>
        {zoom > 1 ? <label className="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-3 text-[11px] text-muted"><span>Intensity range</span><input type="range" min={visibleBins / 2} max={256 - visibleBins / 2} value={center} onChange={(event) => setCenter(Number(event.target.value))} /><span>{start}–{end - 1}</span></label> : null}
      </div>
      <div className="grid min-w-[1100px] grid-cols-2 gap-3">
        {sides.map(({ label: sideLabel, data, color }) => <section key={sideLabel} className="rounded-control border border-line bg-canvas p-3 sm:p-4">
          <h3 className="mb-3 text-center text-xs font-semibold text-ink">{sideLabel}</h3>
          <div className="grid gap-3">{channels.filter(({ key }) => !focusChannel || key === focusChannel).map(({ key, label }) => {
            const values = data[key].slice(start, end);
            const max = Math.max(1, ...values);
            const width = 1300;
            const height = 270;
            const left = 58;
            const plotW = width - left - 20;
            const plotH = height - 38;
            const bw = plotW / values.length;
            return <div key={key} className="border-t border-line pt-2"><h4 className="mb-1 text-[10px] text-muted">{label}</h4><svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label={`${label} histogram for ${sideLabel}`}>
              {[0, 0.5, 1].map((f) => { const y = 8 + plotH * (1 - f); return <g key={f}><line x1={left} x2={width - 20} y1={y} y2={y} stroke="#343448" strokeDasharray="3 4"/><text x={left - 8} y={y + 4} textAnchor="end" fill="#b1b1c3" fontSize="13">{Math.round(max * f)}</text></g>; })}
              {values.map((value, i) => { const bh = value / max * plotH; return <rect key={i} x={left + i * bw} y={8 + plotH - bh} width={Math.max(1, bw * 0.9)} height={bh} fill={key === "r" ? (sideLabel === coverLabel ? color : "#991b1b") : key === "g" ? (sideLabel === coverLabel ? "#4ade80" : "#166534") : (sideLabel === coverLabel ? "#60a5fa" : "#1e40af")} />; })}
              {[0, 0.5, 1].map((f) => <text key={f} x={left + f * plotW} y={height - 5} textAnchor={f === 0 ? "start" : f === 1 ? "end" : "middle"} fill="#b1b1c3" fontSize="13">{Math.round(start + f * (visibleBins - 1))}</text>)}
            </svg></div>;
          })}</div>
        </section>)}
      </div>
    </div>;
  }
  return <div className={layout === "columns" ? "grid min-w-0 grid-cols-3 gap-3" : "grid gap-3"}>
    {channels.map(({ key, label, coverColor, stegoColor }) => <ChannelHistogram
      key={key}
      coverValues={cover[key]}
      stegoValues={stego[key]}
      label={label}
      coverLabel={coverLabel}
      stegoLabel={stegoLabel}
      coverColor={coverColor}
      stegoColor={stegoColor}
      onZoom={onZoomChannel ? () => onZoomChannel(key) : undefined}
    />)}
  </div>;
}
