'use client';
export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="state-panel error-panel" role="alert">
      <h1>Something went wrong</h1>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
