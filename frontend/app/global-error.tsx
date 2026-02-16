"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ padding: 40 }}>
          <h2>Application error</h2>
          <pre>{error.message}</pre>
          <button onClick={reset}>Reload</button>
        </div>
      </body>
    </html>
  );
}
