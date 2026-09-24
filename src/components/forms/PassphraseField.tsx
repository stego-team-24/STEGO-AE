"use client";

import { useState } from "react";

interface PassphraseFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  confirm?: string;
  onConfirmChange?: (value: string) => void;
  label?: string;
  autoComplete?: string;
}

export function PassphraseField({
  id,
  value,
  onChange,
  confirm,
  onConfirmChange,
  label = "Passphrase",
  autoComplete = "new-password",
}: PassphraseFieldProps) {
  const [visible, setVisible] = useState(false);

  const field = (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        minLength={12}
        maxLength={128}
        placeholder="At least 12 characters"
        className="w-full rounded-control border border-line bg-canvas px-4 py-3 pr-12 text-ink placeholder:text-muted"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-2 px-2 text-[13px] text-muted hover:text-ink"
        aria-label={visible ? "Hide passphrase" : "Show passphrase"}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-[13px] text-muted">
        {label}
      </label>
      {field}
      {onConfirmChange ? (
        <>
          <label htmlFor={`${id}-confirm`} className="text-[13px] text-muted">
            Confirm passphrase
          </label>
          <div className="relative">
            <input
              id={`${id}-confirm`}
              type={visible ? "text" : "password"}
              value={confirm}
              onChange={(event) => onConfirmChange(event.target.value)}
              autoComplete={autoComplete}
              placeholder="Re-enter your passphrase"
              className="w-full rounded-control border border-line bg-canvas px-4 py-3 pr-12 text-ink placeholder:text-muted"
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
