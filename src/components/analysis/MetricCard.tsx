export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-card border border-line bg-raised px-4 py-3">
      <p className="text-[11px] uppercase tracking-[1px] text-muted">{label}</p>
      <p className="mt-1 font-mono text-[18px] text-ink">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-muted">{hint}</p> : null}
    </div>
  );
}
