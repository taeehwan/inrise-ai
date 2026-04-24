import path from "path";

export function isPathWithinDirectory(targetPath: string, rootDir: string): boolean {
  const normalizedRoot = path.resolve(rootDir);
  const normalizedTarget = path.resolve(targetPath);
  return normalizedTarget === normalizedRoot || normalizedTarget.startsWith(`${normalizedRoot}${path.sep}`);
}

export function resolveSafeUploadPath(rootDir: string, relativePath: string): string | null {
  const safeRelativePath = relativePath.replace(/^\/+/, "");
  const resolvedPath = path.resolve(rootDir, safeRelativePath);
  return isPathWithinDirectory(resolvedPath, rootDir) ? resolvedPath : null;
}
