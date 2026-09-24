export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="mb-6 flex flex-wrap gap-2">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={step}
            className={`flex items-center gap-2 rounded-full border px-3 py-2 text-[13px] ${
              active
                ? "border-accent text-accent"
                : done
                  ? "border-success/40 text-success"
                  : "border-line text-muted"
            }`}
          >
            <span className="grid size-5 place-items-center rounded-full bg-raised text-[11px]">
              {done ? "✓" : index + 1}
            </span>
            {step}
          </li>
        );
      })}
    </ol>
  );
}
