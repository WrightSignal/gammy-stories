import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createStory, getUserStories } from "@/lib/firebase/admin-stories";

const createStorySchema = z.object({
  userId: z.string().min(1),
  title: z.string().min(1).max(200),
  outline: z.string().min(10).max(2000),
  readingLevel: z.enum([
    "kindergarten",
    "grade1",
    "grade2",
    "grade3",
    "grade4",
    "grade5",
  ]),
  metadata: z
    .object({
      tone: z.string().optional(),
      illustrationHints: z.string().optional(),
    })
    .optional(),
});

// POST /api/stories - Create a new story
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createStorySchema.parse(body);

    const storyId = await createStory(validated);

    return NextResponse.json({ storyId }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating story:", error);
    return NextResponse.json(
      { error: "Failed to create story" },
      { status: 500 }
    );
  }
}

// GET /api/stories?userId=xxx - Get user's stories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const stories = await getUserStories(userId);

    return NextResponse.json({ stories });
  } catch (error) {
    console.error("Error fetching stories:", error);
    return NextResponse.json(
      { error: "Failed to fetch stories" },
      { status: 500 }
    );
  }
}
