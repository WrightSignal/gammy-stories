import { NextRequest, NextResponse } from "next/server";
import { generateImageWithRetry } from "@/lib/ai/image-generation";
import { uploadImage, getPageImagePath } from "@/lib/firebase/admin-storage";
import {
  getStory,
  getPage,
  createJob,
  updateJob,
  createAsset,
  updatePageWithImage,
  updatePage,
} from "@/lib/firebase/admin-stories";
import { FieldValue } from "firebase-admin/firestore";

interface RouteParams {
  params: Promise<{
    id: string;
    pageId: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: storyId, pageId } = await params;

    // Get auth header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = authHeader.split("Bearer ")[1];

    // Get the story
    const story = await getStory(storyId);
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    if (story.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get the page
    const page = await getPage(storyId, pageId);
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Create a job to track the image generation
    const jobId = await createJob({
      type: "image_generation",
      userId,
      storyId,
      pageId,
      input: {
        pageText: page.currentText,
        storyTitle: story.title,
        readingLevel: story.readingLevel,
        pageNumber: page.pageNumber,
      },
    });

    // Update job status to processing
    await updateJob(jobId, {
      status: "processing",
      startedAt: FieldValue.serverTimestamp(),
    });

    // Update page status to generating
    await updatePage(storyId, pageId, {
      imageStatus: "generating",
    });

    // Generate the image
    const result = await generateImageWithRetry(
      page.currentText,
      story.title,
      story.readingLevel,
      page.pageNumber
    );

    if (!result.success || !result.imageBase64) {
      await updateJob(jobId, {
        status: "failed",
        error: result.error,
        completedAt: FieldValue.serverTimestamp(),
      });

      await updatePage(storyId, pageId, {
        imageStatus: "none",
      });

      return NextResponse.json(
        { error: result.error || "Image generation failed" },
        { status: 500 }
      );
    }

    // Upload the image to Firebase Storage
    const storagePath = getPageImagePath(storyId, pageId);
    const uploadResult = await uploadImage(
      result.imageBase64,
      storagePath,
      result.mimeType
    );

    if (!uploadResult.success || !uploadResult.publicUrl) {
      await updateJob(jobId, {
        status: "failed",
        error: uploadResult.error,
        completedAt: FieldValue.serverTimestamp(),
      });

      await updatePage(storyId, pageId, {
        imageStatus: "none",
      });

      return NextResponse.json(
        { error: uploadResult.error || "Image upload failed" },
        { status: 500 }
      );
    }

    // Calculate approximate size (base64 is ~33% larger than binary)
    const sizeBytes = Math.floor((result.imageBase64.length * 3) / 4);

    // Create an asset record
    const assetId = await createAsset({
      storyId,
      pageId,
      type: "image",
      source: "generated",
      storageUrl: uploadResult.storageUrl!,
      publicUrl: uploadResult.publicUrl,
      mimeType: result.mimeType || "image/png",
      sizeBytes,
      generationJobId: jobId,
    });

    // Update the page with the image reference
    await updatePageWithImage(storyId, pageId, assetId, uploadResult.publicUrl);

    // Update job to completed
    await updateJob(jobId, {
      status: "completed",
      output: {
        assetId,
        imageUrl: uploadResult.publicUrl,
      },
      completedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      imageUrl: uploadResult.publicUrl,
      assetId,
      jobId,
    });
  } catch (error) {
    console.error("Error generating page image:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
