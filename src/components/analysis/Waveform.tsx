export function Waveform({ values, color = "#E4BE70" }: { values: number[]; color?: string }) {
  return (
    <div className="flex h-24 items-center gap-[1px]" aria-hidden>
      {values.map((value, index) => (
        <div
          key={index}
          className="min-w-[1px] flex-1 rounded-sm"
          style={{ height: `${Math.max(2, value * 100)}%`, backgroundColor: color }}
        />
      ))}
    </div>
  );
}
