import { MAX_IMAGE_BYTES } from "./api";

/** Long edge we scale down to: the editor's hint says 2048 px is plenty for every block. */
export const MAX_IMAGE_EDGE = 2048;

const KEEP_AS_IS = ["image/svg+xml", "image/gif"];

/**
 * Makes an image fit the upload rules (5 MB): photos larger than 2048 px or 5 MB are scaled in the
 * browser, so a 20 MB Drive original still goes in. SVG and GIF stay untouched (scaling would
 * flatten them); those are refused when too big.
 */
export async function prepareImage(blob: Blob, name: string): Promise<File> {
  const type = blob.type || "image/jpeg";
  if (!type.startsWith("image/")) throw Object.assign(new Error("not an image"), { code: "not_image" });
  const asFile = () => new File([blob], name, { type });
  if (KEEP_AS_IS.includes(type)) {
    if (blob.size > MAX_IMAGE_BYTES) throw Object.assign(new Error("too big"), { code: "too_big" });
    return asFile();
  }
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && blob.size <= MAX_IMAGE_BYTES) {
    bitmap.close();
    return asFile();
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  // PNG and WebP may be transparent (logos): WebP keeps that. Everything else becomes JPEG.
  const out = type === "image/png" || type === "image/webp" ? "image/webp" : "image/jpeg";
  for (const quality of [0.9, 0.8, 0.7, 0.6]) {
    const result = await new Promise<Blob | null>((r) => canvas.toBlob(r, out, quality));
    if (result && result.size <= MAX_IMAGE_BYTES) {
      return new File([result], name.replace(/\.[a-z0-9]+$/i, "") + (out === "image/webp" ? ".webp" : ".jpg"), { type: out });
    }
  }
  throw Object.assign(new Error("too big"), { code: "too_big" });
}
