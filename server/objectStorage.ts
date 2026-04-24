import { Response } from "express";
import { randomUUID } from "crypto";
import {
  createSignedUploadUrl,
  getRemoteObjectRoot,
  getStorageProvider,
  streamRemoteObjectToResponse,
} from "./storageProvider";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  getPrivateObjectDir(): string {
    const { bucketName, basePrefix } = getRemoteObjectRoot();
    return `/${[bucketName, basePrefix].filter(Boolean).join("/")}`;
  }

  async downloadObject(objectPath: string, res: Response, cacheTtlSec: number = 3600) {
    const entityId = this.getEntityIdFromPath(objectPath);
    try {
      await streamRemoteObjectToResponse(entityId, res, cacheTtlSec);
    } catch (error) {
      throw new ObjectNotFoundError();
    }
  }

  async getObjectEntityUploadTarget(): Promise<{ uploadURL: string; objectPath: string }> {
    if (getStorageProvider() === "none") {
      throw new Error("Remote object storage is not configured");
    }

    const entityId = `uploads/${randomUUID()}`;
    const uploadURL = await createSignedUploadUrl(entityId);
    return {
      uploadURL,
      objectPath: `/objects/${entityId}`,
    };
  }

  async getObjectEntityUploadURL(): Promise<string> {
    const target = await this.getObjectEntityUploadTarget();
    return target.uploadURL;
  }

  getEntityIdFromPath(objectPath: string): string {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const entityId = objectPath.slice("/objects/".length).replace(/^\/+/, "");
    if (!entityId) {
      throw new ObjectNotFoundError();
    }

    return entityId;
  }
}
