export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-control border border-error/40 bg-error/10 px-4 py-3 text-[14px] text-error"
    >
      {message}
    </div>
  );
}
