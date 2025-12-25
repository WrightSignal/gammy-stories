import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";
import { Story, Page, Job, ReadingLevel } from "@/types/database";

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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    generationJobId: null,
    rawAIResponse: null,
    metadata: input.metadata || {},
  };

  const docRef = await addDoc(collection(db, "stories"), storyData);
  return docRef.id;
}

export async function getStory(storyId: string): Promise<Story | null> {
  const docRef = doc(db, "stories", storyId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Story;
  }
  return null;
}

export async function getUserStories(userId: string): Promise<Story[]> {
  const q = query(
    collection(db, "stories"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Story[];
}

export async function updateStory(
  storyId: string,
  updates: Partial<Omit<Story, "id" | "createdAt">>
): Promise<void> {
  const docRef = doc(db, "stories", storyId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteStory(storyId: string): Promise<void> {
  // Delete all pages first
  const pagesQuery = query(collection(db, "stories", storyId, "pages"));
  const pagesSnapshot = await getDocs(pagesQuery);
  
  const batch = writeBatch(db);
  pagesSnapshot.docs.forEach((pageDoc) => {
    batch.delete(pageDoc.ref);
  });
  
  // Delete the story
  batch.delete(doc(db, "stories", storyId));
  await batch.commit();
}

// ============ PAGES ============

export interface CreatePageInput {
  storyId: string;
  pageNumber: number;
  originalText: string;
  currentText: string;
}

export async function createPages(
  storyId: string,
  pageTexts: string[]
): Promise<string[]> {
  const batch = writeBatch(db);
  const pageIds: string[] = [];

  pageTexts.forEach((text, index) => {
    const pageRef = doc(collection(db, "stories", storyId, "pages"));
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
  return pageIds;
}

export async function getPages(storyId: string): Promise<Page[]> {
  const q = query(
    collection(db, "stories", storyId, "pages"),
    orderBy("pageNumber", "asc")
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Page[];
}

export async function updatePage(
  storyId: string,
  pageId: string,
  updates: Partial<Omit<Page, "id" | "storyId" | "createdAt">>
): Promise<void> {
  const docRef = doc(db, "stories", storyId, "pages", pageId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePage(storyId: string, pageId: string): Promise<void> {
  const docRef = doc(db, "stories", storyId, "pages", pageId);
  await deleteDoc(docRef);
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
    createdAt: serverTimestamp(),
    startedAt: null,
    completedAt: null,
  };

  const docRef = await addDoc(collection(db, "jobs"), jobData);
  return docRef.id;
}

export async function getJob(jobId: string): Promise<Job | null> {
  const docRef = doc(db, "jobs", jobId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Job;
  }
  return null;
}

export async function updateJob(
  jobId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const docRef = doc(db, "jobs", jobId);
  await updateDoc(docRef, updates);
}
