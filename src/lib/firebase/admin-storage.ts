import { getAdminApp } from "./admin";
import { getStorage as getAdminStorage } from "firebase-admin/storage";

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "gammy-stories.firebasestorage.app";

function getStorageBucket() {
  const app = getAdminApp();
  const storage = getAdminStorage(app);
  return storage.bucket(STORAGE_BUCKET);
}

export interface UploadResult {
  success: boolean;
  storageUrl?: string;
  publicUrl?: string;
  error?: string;
}

/**
 * Upload a base64-encoded image to Firebase Storage
 */
export async function uploadImage(
  base64Data: string,
  storagePath: string,
  mimeType: string = "image/png"
): Promise<UploadResult> {
  try {
    const bucket = getStorageBucket();
    const file = bucket.file(storagePath);

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, "base64");

    // Upload the file
    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
      },
    });

    // Make the file publicly accessible
    await file.makePublic();

    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    return {
      success: true,
      storageUrl: `gs://${bucket.name}/${storagePath}`,
      publicUrl,
    };
  } catch (error) {
    console.error("Storage upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown upload error",
    };
  }
}

/**
 * Delete an image from Firebase Storage
 */
export async function deleteImage(storagePath: string): Promise<boolean> {
  try {
    const bucket = getStorageBucket();
    const file = bucket.file(storagePath);
    await file.delete();
    return true;
  } catch (error) {
    console.error("Storage delete error:", error);
    return false;
  }
}

/**
 * Generate the storage path for a page image
 */
export function getPageImagePath(storyId: string, pageId: string): string {
  return `stories/${storyId}/pages/${pageId}/illustration.png`;
}

/**
 * Generate the storage path for a thumbnail
 */
export function getPageThumbnailPath(storyId: string, pageId: string): string {
  return `stories/${storyId}/pages/${pageId}/thumbnail.png`;
}
