import { Storage } from "@google-cloud/storage";
import { Response } from "express";
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export type StorageProvider = "s3" | "gcs" | "none";

function hasS3Config(): boolean {
  return Boolean(
    process.env.S3_BUCKET &&
    process.env.S3_ENDPOINT &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY,
  );
}

function hasGcsConfig(): boolean {
  return Boolean(process.env.PRIVATE_OBJECT_DIR || process.env.REPLIT_DEFAULT_BUCKET_ID);
}

export function getStorageProvider(): StorageProvider {
  if (hasS3Config()) {
    return "s3";
  }
  if (hasGcsConfig()) {
    return "gcs";
  }
  return "none";
}

function parseObjectRoot(root: string): { bucketName: string; basePrefix: string } {
  const normalized = root.startsWith("/") ? root.slice(1) : root;
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length === 0) {
    throw new Error("Invalid object storage root");
  }
  return {
    bucketName: parts[0],
    basePrefix: parts.slice(1).join("/"),
  };
}

function joinKey(...parts: Array<string | undefined>): string {
  return parts
    .filter((part): part is string => Boolean(part))
    .map((part) => part.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

export function getRemoteObjectRoot(): { bucketName: string; basePrefix: string } {
  if (getStorageProvider() === "s3") {
    const bucketName = process.env.S3_BUCKET!;
    const basePrefix = (process.env.S3_PREFIX || "").replace(/^\/+|\/+$/g, "");
    return { bucketName, basePrefix };
  }

  const privateDir = process.env.PRIVATE_OBJECT_DIR;
  if (privateDir) {
    return parseObjectRoot(privateDir);
  }

  const fallbackBucket = process.env.REPLIT_DEFAULT_BUCKET_ID;
  if (fallbackBucket) {
    return { bucketName: fallbackBucket, basePrefix: "" };
  }

  throw new Error("No remote object storage is configured");
}

function createReplitGcsClient() {
  return new Storage({
    credentials: {
      audience: "replit",
      subject_token_type: "access_token",
      token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
      type: "external_account",
      credential_source: {
        url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
        format: {
          type: "json",
          subject_token_field_name: "access_token",
        },
      },
      universe_domain: "googleapis.com",
    },
    projectId: "",
  });
}

let cachedGcsClient: Storage | null = null;
function getGcsClient(): Storage {
  if (!cachedGcsClient) {
    cachedGcsClient =
      process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_PROJECT
        ? new Storage()
        : createReplitGcsClient();
  }
  return cachedGcsClient;
}

let cachedS3Client: S3Client | null = null;
function getS3Client(): S3Client {
  if (!cachedS3Client) {
    cachedS3Client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
  }
  return cachedS3Client;
}

export async function createSignedUploadUrl(
  relativeKey: string,
  contentType = "application/octet-stream",
): Promise<string> {
  const provider = getStorageProvider();
  const { bucketName, basePrefix } = getRemoteObjectRoot();
  const objectKey = joinKey(basePrefix, relativeKey);

  if (provider === "s3") {
    return getSignedUrl(
      getS3Client(),
      new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        ContentType: contentType,
      }),
      { expiresIn: 900 },
    );
  }

  if (provider === "gcs") {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_PROJECT) {
      const response = await fetch(`${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket_name: bucketName,
          object_name: objectKey,
          method: "PUT",
          expires_at: new Date(Date.now() + 900 * 1000).toISOString(),
        }),
      });
      if (!response.ok) {
        throw new Error(`Failed to sign GCS upload URL: ${response.status}`);
      }
      const { signed_url: signedUrl } = await response.json();
      return signedUrl;
    }

    const [signedUrl] = await getGcsClient()
      .bucket(bucketName)
      .file(objectKey)
      .getSignedUrl({
        version: "v4",
        action: "write",
        expires: Date.now() + 900 * 1000,
        contentType,
      });
    return signedUrl;
  }

  throw new Error("Remote object storage is not configured");
}

export async function uploadBufferToRemote(
  relativeKey: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  const provider = getStorageProvider();
  const { bucketName, basePrefix } = getRemoteObjectRoot();
  const objectKey = joinKey(basePrefix, relativeKey);

  if (provider === "s3") {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return;
  }

  if (provider === "gcs") {
    await getGcsClient().bucket(bucketName).file(objectKey).save(buffer, { contentType });
    return;
  }

  throw new Error("Remote object storage is not configured");
}

export async function doesRemoteObjectExist(relativeKey: string): Promise<boolean> {
  const provider = getStorageProvider();
  if (provider === "none") {
    return false;
  }

  const { bucketName, basePrefix } = getRemoteObjectRoot();
  const objectKey = joinKey(basePrefix, relativeKey);

  if (provider === "s3") {
    try {
      await getS3Client().send(new HeadObjectCommand({ Bucket: bucketName, Key: objectKey }));
      return true;
    } catch {
      return false;
    }
  }

  const [exists] = await getGcsClient().bucket(bucketName).file(objectKey).exists();
  return exists;
}

export async function downloadRemoteObject(relativeKey: string): Promise<Buffer | null> {
  const provider = getStorageProvider();
  if (provider === "none") {
    return null;
  }

  const { bucketName, basePrefix } = getRemoteObjectRoot();
  const objectKey = joinKey(basePrefix, relativeKey);

  if (provider === "s3") {
    try {
      const result = await getS3Client().send(
        new GetObjectCommand({ Bucket: bucketName, Key: objectKey }),
      );
      if (!result.Body) {
        return null;
      }
      const bytes = await (result.Body as any).transformToByteArray();
      return Buffer.from(bytes);
    } catch {
      return null;
    }
  }

  try {
    const [contents] = await getGcsClient().bucket(bucketName).file(objectKey).download();
    return contents;
  } catch {
    return null;
  }
}

export async function streamRemoteObjectToResponse(
  relativeKey: string,
  res: Response,
  cacheTtlSec = 3600,
) {
  const provider = getStorageProvider();
  const { bucketName, basePrefix } = getRemoteObjectRoot();
  const objectKey = joinKey(basePrefix, relativeKey);

  if (provider === "s3") {
    const result = await getS3Client().send(
      new GetObjectCommand({ Bucket: bucketName, Key: objectKey }),
    );
    res.set({
      "Content-Type": result.ContentType || "application/octet-stream",
      "Content-Length": result.ContentLength?.toString() || undefined,
      "Cache-Control": `public, max-age=${cacheTtlSec}`,
    });
    const body = result.Body as any;
    if (body?.pipe) {
      body.pipe(res);
      return;
    }
    if (body?.transformToByteArray) {
      const bytes = await body.transformToByteArray();
      res.send(Buffer.from(bytes));
      return;
    }
    throw new Error("Unsupported S3 body stream");
  }

  const file = getGcsClient().bucket(bucketName).file(objectKey);
  const [metadata] = await file.getMetadata();
  res.set({
    "Content-Type": metadata.contentType || "application/octet-stream",
    "Content-Length": metadata.size,
    "Cache-Control": `public, max-age=${cacheTtlSec}`,
  });
  file.createReadStream().pipe(res);
}
