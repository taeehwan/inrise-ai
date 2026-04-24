import path from "path";

const SAFE_EXTENSION_PATTERN = /^\.[a-z0-9]{1,10}$/i;

export function sanitizeUploadedFilename(originalName: string | undefined, fallbackExt = ".bin"): string {
  const baseName = path.basename(originalName || "");
  const rawExt = path.extname(baseName).toLowerCase();
  const safeExt = SAFE_EXTENSION_PATTERN.test(rawExt) ? rawExt : fallbackExt;
  const nameWithoutExt = rawExt ? baseName.slice(0, -rawExt.length) : baseName;
  const safeName = nameWithoutExt
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 64);

  return `${safeName || "upload"}${safeExt}`;
}
