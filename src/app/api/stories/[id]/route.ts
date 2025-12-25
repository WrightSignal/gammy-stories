import { NextRequest, NextResponse } from "next/server";
import { getStory, updateStory, deleteStory, getPages } from "@/lib/firebase/admin-stories";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/stories/[id] - Get story with pages
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const story = await getStory(id);

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    const pages = await getPages(id);

    return NextResponse.json({ story, pages });
  } catch (error) {
    console.error("Error fetching story:", error);
    return NextResponse.json(
      { error: "Failed to fetch story" },
      { status: 500 }
    );
  }
}

// PATCH /api/stories/[id] - Update story
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    await updateStory(id, body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating story:", error);
    return NextResponse.json(
      { error: "Failed to update story" },
      { status: 500 }
    );
  }
}

// DELETE /api/stories/[id] - Delete story
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await deleteStory(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting story:", error);
    return NextResponse.json(
      { error: "Failed to delete story" },
      { status: 500 }
    );
  }
}
