import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { isPathWithinDirectory, resolveSafeUploadPath } from "../../server/lib/uploadPath";

const uploadsRoot = path.resolve("/tmp/inrise-test-uploads");

test("isPathWithinDirectory accepts paths inside the upload root", () => {
  assert.equal(
    isPathWithinDirectory(path.join(uploadsRoot, "audio/example.mp3"), uploadsRoot),
    true,
  );
});

test("isPathWithinDirectory rejects traversal outside the upload root", () => {
  assert.equal(
    isPathWithinDirectory(path.resolve(uploadsRoot, "../secrets.txt"), uploadsRoot),
    false,
  );
});

test("resolveSafeUploadPath returns null for traversal attempts", () => {
  assert.equal(resolveSafeUploadPath(uploadsRoot, "../../etc/passwd"), null);
});

test("resolveSafeUploadPath resolves a safe relative file path", () => {
  assert.equal(
    resolveSafeUploadPath(uploadsRoot, "/audio/example.mp3"),
    path.join(uploadsRoot, "audio/example.mp3"),
  );
});
