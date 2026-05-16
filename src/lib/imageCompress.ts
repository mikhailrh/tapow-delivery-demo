/**
 * Client-side image compression for chat attachments.
 *
 * Demo constraint: images ride inside `Order` objects, which persist to
 * localStorage (~5MB ceiling) and sync over BroadcastChannel. Uncompressed
 * or lightly-compressed images would overflow localStorage and silently
 * corrupt the order sync the demo depends on. Hard cap below is mandatory.
 *
 * Production (Supabase object storage path): raise to ~1600px / 0.8 quality.
 * Dispute/refund evidence must stay legible under zoom — the 1000px/0.7
 * cap here is a deliberate storage workaround, NOT the target quality.
 * Tie image-retention deletion to the dispute resolution window so evidence
 * survives any open dispute.
 */
const MAX_LONGEST_EDGE_PX = 1000;
const JPEG_QUALITY = 0.7;

export type CompressResult = {
  dataUrl: string;
  width: number;
  height: number;
  /** Approx bytes — useful for guard rails when chaining multiple uploads. */
  byteLength: number;
};

export async function compressImageToDataUrl(file: File): Promise<CompressResult> {
  const bitmap = await loadBitmap(file);
  const scale = Math.min(
    1,
    MAX_LONGEST_EDGE_PX / Math.max(bitmap.width, bitmap.height),
  );
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't get 2D context for compression");
  ctx.drawImage(bitmap, 0, 0, w, h);

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  return {
    dataUrl,
    width: w,
    height: h,
    byteLength: approxDataUrlBytes(dataUrl),
  };
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall through to HTMLImageElement path.
    }
  }
  return await loadViaImage(file);
}

function loadViaImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/** Approximate byte length of a base64 data URL payload. */
function approxDataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return dataUrl.length;
  const b64 = dataUrl.slice(comma + 1);
  return Math.floor((b64.length * 3) / 4);
}
