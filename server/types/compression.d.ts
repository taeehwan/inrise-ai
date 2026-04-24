// Minimal type declaration for the `compression` Express middleware.
// Used as a fallback when @types/compression isn't installed.
declare module "compression" {
  import type { RequestHandler } from "express";

  interface CompressionOptions {
    threshold?: number | string;
    level?: number;
    filter?: (req: any, res: any) => boolean;
    chunkSize?: number;
    memLevel?: number;
    strategy?: number;
    windowBits?: number;
  }

  function compression(options?: CompressionOptions): RequestHandler;
  export = compression;
}
