import { NextRequest, NextResponse } from "next/server";
import { generateStoryContent } from "@/lib/ai/gemini";
import { buildStoryPrompt, parseStoryIntoPages } from "@/lib/ai/prompts";
import {
  getStory,
  updateStory,
  createPages,
  createJob,
  updateJob,
} from "@/lib/firebase/admin-stories";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/stories/[id]/generate - Generate story content with AI
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: storyId } = await params;

    // Get the story
    const story = await getStory(storyId);
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    // Check if already generating
    if (story.status === "generating") {
      return NextResponse.json(
        { error: "Story is already being generated" },
        { status: 409 }
      );
    }

    // Create a job to track generation
    const jobId = await createJob({
      type: "story_generation",
      userId: story.userId,
      storyId,
      input: {
        title: story.title,
        outline: story.outline,
        readingLevel: story.readingLevel,
      },
    });

    // Update story status to generating
    await updateStory(storyId, {
      status: "generating",
      generationJobId: jobId,
    });

    // Update job to processing
    await updateJob(jobId, {
      status: "processing",
    });

    try {
      // Build the prompt
      const prompt = buildStoryPrompt(
        story.title,
        story.outline,
        story.readingLevel
      );

      // Call Gemini
      const rawResponse = await generateStoryContent(prompt);

      // Parse into pages
      const pageTexts = parseStoryIntoPages(rawResponse);

      if (pageTexts.length === 0) {
        throw new Error("No pages generated from AI response");
      }

      // Create page documents
      const pageIds = await createPages(storyId, pageTexts);

      // Update story with results
      await updateStory(storyId, {
        status: "editing",
        pageCount: pageTexts.length,
        rawAIResponse: rawResponse,
      });

      // Update job as completed
      await updateJob(jobId, {
        status: "completed",
        output: {
          pageCount: pageTexts.length,
          pageIds,
        },
      });

      return NextResponse.json({
        success: true,
        pageCount: pageTexts.length,
        jobId,
      });
    } catch (aiError) {
      // Update job as failed
      await updateJob(jobId, {
        status: "failed",
        error: aiError instanceof Error ? aiError.message : "Unknown error",
      });

      // Revert story status
      await updateStory(storyId, {
        status: "draft",
      });

      throw aiError;
    }
  } catch (error) {
    console.error("Error generating story:", error);
    return NextResponse.json(
      {
        error: "Failed to generate story",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
