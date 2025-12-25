import { getAdminDb } from "./admin";
import { FieldValue } from "firebase-admin/firestore";
import { Story, Page, Job, ReadingLevel, Asset } from "@/types/database";

// Helper to get db instance
const db = () => getAdminDb();

// ============ STORIES ============

export interface CreateStoryInput {
  userId: string;
  title: string;
  outline: string;
  readingLevel: ReadingLevel;
  metadata?: {
    tone?: string;
    illustrationHints?: string;
  };
}

export async function createStory(input: CreateStoryInput): Promise<string> {
  const storyData = {
    userId: input.userId,
    title: input.title,
    outline: input.outline,
    readingLevel: input.readingLevel,
    status: "draft" as const,
    pageCount: 0,
    stylePresetId: "default",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    generationJobId: null,
    rawAIResponse: null,
    metadata: input.metadata || {},
  };

  const docRef = await db().collection("stories").add(storyData);
  return docRef.id;
}

export async function getStory(storyId: string): Promise<Story | null> {
  const docSnap = await db().collection("stories").doc(storyId).get();

  if (docSnap.exists) {
    return { id: docSnap.id, ...docSnap.data() } as Story;
  }
  return null;
}

export async function getUserStories(userId: string): Promise<Story[]> {
  const querySnapshot = await db()
    .collection("stories")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Story[];
}

export async function updateStory(
  storyId: string,
  updates: Record<string, unknown>
): Promise<void> {
  await db().collection("stories").doc(storyId).update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deleteStory(storyId: string): Promise<void> {
  const batch = db().batch();

  // Delete all pages first
  const pagesSnapshot = await db()
    .collection("stories")
    .doc(storyId)
    .collection("pages")
    .get();

  pagesSnapshot.docs.forEach((pageDoc) => {
    batch.delete(pageDoc.ref);
  });

  // Delete the story
  batch.delete(db().collection("stories").doc(storyId));
  await batch.commit();
}

// ============ PAGES ============

export async function createPages(
  storyId: string,
  pageTexts: string[]
): Promise<string[]> {
  const batch = db().batch();
  const pageIds: string[] = [];

  const pagesCollection = db()
    .collection("stories")
    .doc(storyId)
    .collection("pages");

  pageTexts.forEach((text, index) => {
    const pageRef = pagesCollection.doc();
    pageIds.push(pageRef.id);

    batch.set(pageRef, {
      storyId,
      pageNumber: index + 1,
      originalText: text,
      currentText: text,
      isLocked: false,
      imageId: null,
      imageStatus: "none",
      visualNotes: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  return pageIds;
}

export async function getPages(storyId: string): Promise<Page[]> {
  const querySnapshot = await db()
    .collection("stories")
    .doc(storyId)
    .collection("pages")
    .orderBy("pageNumber", "asc")
    .get();

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Page[];
}

export async function updatePage(
  storyId: string,
  pageId: string,
  updates: Record<string, unknown>
): Promise<void> {
  await db()
    .collection("stories")
    .doc(storyId)
    .collection("pages")
    .doc(pageId)
    .update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function deletePage(storyId: string, pageId: string): Promise<void> {
  await db()
    .collection("stories")
    .doc(storyId)
    .collection("pages")
    .doc(pageId)
    .delete();
}

// ============ JOBS ============

export interface CreateJobInput {
  type: Job["type"];
  userId: string;
  storyId: string;
  pageId?: string;
  input: Record<string, unknown>;
}

export async function createJob(input: CreateJobInput): Promise<string> {
  const jobData = {
    type: input.type,
    status: "pending" as const,
    userId: input.userId,
    storyId: input.storyId,
    pageId: input.pageId || null,
    input: input.input,
    output: null,
    error: null,
    retryCount: 0,
    maxRetries: 3,
    createdAt: FieldValue.serverTimestamp(),
    startedAt: null,
    completedAt: null,
  };

  const docRef = await db().collection("jobs").add(jobData);
  return docRef.id;
}

export async function getJob(jobId: string): Promise<Job | null> {
  const docSnap = await db().collection("jobs").doc(jobId).get();

  if (docSnap.exists) {
    return { id: docSnap.id, ...docSnap.data() } as Job;
  }
  return null;
}

export async function updateJob(
  jobId: string,
  updates: Record<string, unknown>
): Promise<void> {
  await db().collection("jobs").doc(jobId).update(updates);
}

// ============ ASSETS ============

export interface CreateAssetInput {
  storyId: string;
  pageId: string;
  type: "image" | "pdf";
  source: "upload" | "generated";
  storageUrl: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
  generationJobId?: string;
}

export async function createAsset(input: CreateAssetInput): Promise<string> {
  const assetData = {
    storyId: input.storyId,
    pageId: input.pageId,
    type: input.type,
    source: input.source,
    storageUrl: input.storageUrl,
    thumbnailUrl: null,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    createdAt: FieldValue.serverTimestamp(),
    generationJobId: input.generationJobId || null,
    publicUrl: input.publicUrl,
  };

  const docRef = await db().collection("assets").add(assetData);
  return docRef.id;
}

export async function getAsset(assetId: string): Promise<Asset | null> {
  const docSnap = await db().collection("assets").doc(assetId).get();

  if (docSnap.exists) {
    return { id: docSnap.id, ...docSnap.data() } as Asset;
  }
  return null;
}

export async function getPageAssets(storyId: string, pageId: string): Promise<Asset[]> {
  const querySnapshot = await db()
    .collection("assets")
    .where("storyId", "==", storyId)
    .where("pageId", "==", pageId)
    .get();

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Asset[];
}

export async function deleteAsset(assetId: string): Promise<void> {
  await db().collection("assets").doc(assetId).delete();
}

// ============ PAGE IMAGE HELPERS ============

export async function updatePageWithImage(
  storyId: string,
  pageId: string,
  assetId: string,
  imageUrl: string
): Promise<void> {
  await updatePage(storyId, pageId, {
    imageId: assetId,
    imageStatus: "generated",
    imageUrl: imageUrl, // Store the public URL for easy access
  });
}

export async function getPage(storyId: string, pageId: string): Promise<Page | null> {
  const docSnap = await db()
    .collection("stories")
    .doc(storyId)
    .collection("pages")
    .doc(pageId)
    .get();

  if (docSnap.exists) {
    return { id: docSnap.id, ...docSnap.data() } as Page;
  }
  return null;
}
