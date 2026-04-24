import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeUploadedFilename } from "../../server/lib/uploadFilename";

test("sanitizeUploadedFilename removes path traversal sequences and keeps the basename", () => {
  assert.equal(sanitizeUploadedFilename("../../etc/passwd.mp3"), "passwd.mp3");
});

test("sanitizeUploadedFilename normalizes unsafe characters", () => {
  assert.equal(sanitizeUploadedFilename("my qa recording (final).wav"), "my-qa-recording-final.wav");
});

test("sanitizeUploadedFilename falls back to a safe default name", () => {
  assert.equal(sanitizeUploadedFilename(undefined, ".webm"), "upload.webm");
});
