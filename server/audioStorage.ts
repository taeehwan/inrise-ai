import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import {
  doesRemoteObjectExist,
  downloadRemoteObject,
  getRemoteObjectRoot,
  getStorageProvider,
  uploadBufferToRemote,
} from "./storageProvider";

const __filename_local = fileURLToPath(import.meta.url);
const __dirname_local = path.dirname(__filename_local);

function getBucketName(): string {
  return getRemoteObjectRoot().bucketName;
}

function isObjectStorageAvailable(): boolean {
  try {
    return getStorageProvider() !== "none" && Boolean(getBucketName());
  } catch {
    return false;
  }
}

function getLocalUploadsDir(): string {
  const dir = path.join(__dirname_local, '../uploads');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getLocalAudioDir(): string {
  const dir = path.join(__dirname_local, '../uploads/audio');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function saveLocalMp3(audioBuffer: Buffer, filename: string): void {
  try {
    const audioDir = getLocalAudioDir();
    const localPath = path.join(audioDir, filename);
    fs.writeFileSync(localPath, audioBuffer);
    console.log(`💾 MP3 saved locally: uploads/audio/${filename}`);
  } catch (err) {
    console.error(`Failed to save local MP3: ${filename}`, err);
  }
}

export async function uploadAudioToStorage(
  audioBuffer: Buffer,
  filename: string
): Promise<string> {
  saveLocalMp3(audioBuffer, filename);

  if (!isObjectStorageAvailable()) {
    console.log(`⚠️ Object Storage not available, using local file: ${filename}`);
    return `/uploads/audio/${filename}`;
  }

  try {
    await uploadBufferToRemote(`public/audio/${filename}`, audioBuffer, "audio/mpeg");

    console.log(`Audio uploaded to storage: public/audio/${filename}`);
    return `/api/audio/${filename}`;
  } catch (error) {
    console.error(`Failed to upload audio to Object Storage: ${filename}`, error);
    return `/uploads/audio/${filename}`;
  }
}

export async function getAudioFromStorage(
  filename: string
): Promise<Buffer | null> {
  const audioPath = path.join(getLocalAudioDir(), filename);
  if (fs.existsSync(audioPath)) {
    return fs.readFileSync(audioPath);
  }
  
  const localPath = path.join(getLocalUploadsDir(), filename);
  if (fs.existsSync(localPath)) {
    return fs.readFileSync(localPath);
  }

  if (!isObjectStorageAvailable()) {
    return null;
  }

  try {
    return await downloadRemoteObject(`public/audio/${filename}`);
  } catch (error) {
    console.error(`Failed to get audio from storage: ${filename}`, error);
    return null;
  }
}

export async function audioFileExistsInStorage(
  filename: string
): Promise<boolean> {
  const audioPath = path.join(getLocalAudioDir(), filename);
  if (fs.existsSync(audioPath)) {
    return true;
  }
  
  const localPath = path.join(getLocalUploadsDir(), filename);
  if (fs.existsSync(localPath)) {
    return true;
  }

  if (!isObjectStorageAvailable()) {
    return false;
  }

  try {
    return await doesRemoteObjectExist(`public/audio/${filename}`);
  } catch (error) {
    console.error(`Failed to check audio existence in storage: ${filename}`, error);
    return false;
  }
}

export async function migrateLocalFileToStorage(
  localPath: string,
  filename: string
): Promise<string | null> {
  try {
    if (!fs.existsSync(localPath)) {
      return null;
    }

    const fileBuffer = fs.readFileSync(localPath);
    const url = await uploadAudioToStorage(fileBuffer, filename);
    return url;
  } catch (error) {
    console.error(`Failed to migrate local file to storage: ${localPath}`, error);
    return null;
  }
}

export async function audioExistsInObjectStorageOnly(
  filename: string
): Promise<boolean> {
  if (!isObjectStorageAvailable()) {
    return false;
  }
  try {
    return await doesRemoteObjectExist(`public/audio/${filename}`);
  } catch {
    return false;
  }
}

export async function migrateAllLocalToObjectStorage(): Promise<{ migrated: number; skipped: number; failed: number }> {
  const uploadsDir = getLocalUploadsDir();
  const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.mp3'));
  let migrated = 0, skipped = 0, failed = 0;

  if (!isObjectStorageAvailable()) {
    console.log("⚠️ Object Storage not available, skipping bulk migration");
    return { migrated, skipped: files.length, failed };
  }

  for (const file of files) {
    try {
      const alreadyInStorage = await audioExistsInObjectStorageOnly(file);
      if (alreadyInStorage) {
        skipped++;
        continue;
      }
      const localPath = path.join(uploadsDir, file);
      const buffer = fs.readFileSync(localPath);
      await uploadBufferToRemote(`public/audio/${file}`, buffer, "audio/mpeg");
      migrated++;
    } catch (err) {
      failed++;
      console.error(`Failed to migrate ${file}:`, err);
    }
  }

  console.log(`🔄 Audio migration: ${migrated} migrated, ${skipped} already in storage, ${failed} failed out of ${files.length} total`);
  return { migrated, skipped, failed };
}

export { getBucketName, isObjectStorageAvailable };
