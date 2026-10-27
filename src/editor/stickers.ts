// Main-thread side of the sticker Worker (DESIGN §5.3). The Worker starts on
// first use, so pages that never upload or import an image never load it.
import type { stickerOptions } from '../core/sticker';

export type Efectos = Parameters<typeof stickerOptions>[0];
export type StickerFailure = 'not-image' | 'no-figure' | 'too-large' | 'invalid-pixels';

type Request = { kind: 'sticker'; file: Blob; efectos: Efectos; closedBottom: boolean } | { kind: 'reencode'; dataUri: string };
export type WorkerRequest = Request & { id: number };
export type WorkerReply = { id: number; ok: true; dataUri: string } | { id: number; ok: false; error: StickerFailure };

type Outcome = { ok: true; dataUri: string } | { ok: false; error: StickerFailure };

let worker: Worker | undefined;
let nextId = 0;
const pending = new Map<number, (reply: Outcome) => void>();

function call(request: Request): Promise<Outcome> {
  if (!worker) {
    worker = new Worker(new URL('./sticker.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }: MessageEvent<WorkerReply>) => {
      const resolve = pending.get(data.id);
      pending.delete(data.id);
      resolve?.(data.ok ? { ok: true, dataUri: data.dataUri } : { ok: false, error: data.error });
    };
  }
  const id = nextId++;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    worker!.postMessage({ ...request, id } satisfies WorkerRequest);
  });
}

/** Turns an uploaded file into a sticker PNG data URI (FR-E6). */
export function stickerFromFile(file: Blob, efectos: Efectos, closedBottom: boolean): Promise<Outcome> {
  return call({ kind: 'sticker', file, efectos, closedBottom });
}

/** Re-encodes an untrusted PNG data URI (NFR-4); rejects when it isn't a decodable PNG. */
export async function reencode(dataUri: string): Promise<string> {
  const result = await call({ kind: 'reencode', dataUri });
  if (!result.ok) throw new Error(result.error);
  return result.dataUri;
}
