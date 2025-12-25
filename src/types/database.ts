import { Timestamp } from "firebase/firestore";

// Reading level options
export type ReadingLevel =
  | "kindergarten"
  | "grade1"
  | "grade2"
  | "grade3"
  | "grade4"
  | "grade5";

// User document
export interface User {
  id: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  role: "user" | "admin";
  storiesCount: number;
  purchasesCount: number;
}

// Story document
export interface Story {
  id: string;
  userId: string;
  title: string;
  outline: string;
  readingLevel: ReadingLevel;
  status: "draft" | "generating" | "editing" | "complete" | "purchased";
  pageCount: number;
  stylePresetId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  generationJobId: string | null;
  rawAIResponse: string | null;
  metadata: {
    tone?: string;
    illustrationHints?: string;
  };
}

// Page document (subcollection of Story)
export interface Page {
  id: string;
  storyId: string;
  pageNumber: number;
  originalText: string;
  currentText: string;
  isLocked: boolean;
  imageId: string | null;
  imageStatus: "none" | "generating" | "uploaded" | "generated";
  imageUrl: string | null;
  visualNotes: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Asset document (subcollection of Story)
export interface Asset {
  id: string;
  storyId: string;
  pageId: string;
  type: "image" | "pdf";
  source: "upload" | "generated";
  storageUrl: string;
  thumbnailUrl: string | null;
  mimeType: string;
  sizeBytes: number;
  createdAt: Timestamp;
  generationJobId: string | null;
}

// Order document
export interface Order {
  id: string;
  userId: string;
  storyId: string;
  stripePaymentIntentId: string;
  stripeSessionId: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed" | "refunded";
  pdfAssetId: string | null;
  createdAt: Timestamp;
  completedAt: Timestamp | null;
}

// Job document
export interface Job {
  id: string;
  type: "story_generation" | "image_generation" | "pdf_export";
  status: "pending" | "processing" | "completed" | "failed";
  userId: string;
  storyId: string;
  pageId: string | null;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  retryCount: number;
  maxRetries: number;
  createdAt: Timestamp;
  startedAt: Timestamp | null;
  completedAt: Timestamp | null;
}

// Style preset document
export interface StylePreset {
  id: string;
  name: string;
  description: string;
  promptTemplate: string;
  isActive: boolean;
  isDefault: boolean;
  version: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
