"use client";

export function OperationProgress({ label, value }: { label: string; value?: number | null }) {
  const determinate = value !== undefined && value !== null;
  const percent = determinate ? Math.max(0, Math.min(100, Math.round(value))) : null;
  return (
    <div className="operation-progress" role="status" aria-live="polite" aria-atomic="true">
      <div className="operation-progress-copy">
        <span>{label}</span>
        <span>{percent !== null ? `${percent}%` : <span className="operation-progress-pulse" aria-hidden="true">···</span>}</span>
      </div>
      <div
        className="operation-progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        {...(percent === null ? {} : { "aria-valuenow": percent, "aria-valuetext": `${percent}%` })}
      >
        <i className={determinate ? "is-determinate" : "is-indeterminate"} style={percent === null ? undefined : { width: `${percent}%` }} />
      </div>
    </div>
  );
}
