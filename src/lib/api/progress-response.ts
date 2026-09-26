export interface ProgressEvent { completed: number; total: number; label: string }

export function streamProgressResponse(execute: (onProgress: (progress: ProgressEvent) => Promise<void>) => Promise<Response>) {
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const send = async (event: unknown) => writer.write(encoder.encode(`${JSON.stringify(event)}\n`));
  void (async () => {
    try {
      const response = await execute((progress) => send({ type: "progress", ...progress }));
      const body = await response.json();
      await send(response.ok ? { type: "result", body } : { type: "error", body });
    } catch {
      await send({ type: "error", body: { error: { message: "The operation failed." } } });
    } finally {
      await writer.close();
    }
  })();
  return new Response(readable, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
