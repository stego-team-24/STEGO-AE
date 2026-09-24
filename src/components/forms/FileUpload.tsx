"use client";

import { useRef } from "react";

interface FileUploadProps {
  label: string;
  accept: string;
  hint: string;
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function FileUpload({ label, accept, hint, onFile, disabled }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={`rounded-card border border-dashed border-line bg-canvas p-6 text-center ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <h3 className="text-[15px] font-medium">{label}</h3>
      <p className="mt-2 text-[12px] text-muted">{hint}</p>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="mt-4 inline-flex min-h-[44px] items-center rounded-control border border-line px-5 text-[15px] hover:bg-raised"
      >
        Choose file
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}
