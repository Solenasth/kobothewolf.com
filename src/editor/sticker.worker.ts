// Off the main thread (FR-E6, NFR-4, DESIGN §5.3): turns an uploaded image into
// a sticker, and re-encodes untrusted PNG data URIs so only pixels survive.
// Nothing here touches the network; the image never leaves the browser.
import { makeSticker, MAX_SIDE, stickerOptions } from '../core/sticker';
import type { WorkerReply, WorkerRequest } from './stickers';

function base64(bytes: Uint8Array): string {
  let text = '';
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text);
}

async function toPngDataUri(canvas: OffscreenCanvas): Promise<string> {
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return `data:image/png;base64,${base64(new Uint8Array(await blob.arrayBuffer()))}`;
}

async function decode(blob: Blob): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(blob);
  } catch {
    return null;
  }
}

async function handle(request: WorkerRequest): Promise<WorkerReply> {
  if (request.kind === 'reencode') {
    const match = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/.exec(request.dataUri);
    const bitmap = match ? await decode(new Blob([Uint8Array.from(atob(match[1]!), (c) => c.charCodeAt(0))], { type: 'image/png' })) : null;
    if (!bitmap) return { id: request.id, ok: false, error: 'not-image' };
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
    return { id: request.id, ok: true, dataUri: await toPngDataUri(canvas) };
  }

  const bitmap = await decode(request.file);
  if (!bitmap) return { id: request.id, ok: false, error: 'not-image' };
  const k = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * k));
  const h = Math.max(1, Math.round(bitmap.height * k));
  const source = new OffscreenCanvas(w, h);
  const ctx = source.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const result = makeSticker({ width: w, height: h, data: ctx.getImageData(0, 0, w, h).data }, stickerOptions(request.efectos, request.closedBottom));
  if (!result.ok) return { id: request.id, ok: false, error: result.error.code };
  const { width, height, data } = result.pixels;
  const out = new OffscreenCanvas(width, height);
  out.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(data), width, height), 0, 0);
  return { id: request.id, ok: true, dataUri: await toPngDataUri(out) };
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  self.postMessage(await handle(event.data));
};
