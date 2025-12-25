"use client";

import Link from "next/link";
import { Story } from "@/types/database";
import { READING_LEVEL_CONFIG } from "@/lib/ai/prompts";

interface StoryCardProps {
  story: Story;
}

const statusColors = {
  draft: "bg-gray-100 text-gray-700",
  generating: "bg-yellow-100 text-yellow-700",
  editing: "bg-blue-100 text-blue-700",
  complete: "bg-green-100 text-green-700",
  purchased: "bg-purple-100 text-purple-700",
};

const statusLabels = {
  draft: "Draft",
  generating: "Generating...",
  editing: "Editing",
  complete: "Complete",
  purchased: "Purchased",
};

export default function StoryCard({ story }: StoryCardProps) {
  const levelConfig = READING_LEVEL_CONFIG[story.readingLevel];
  const createdAt = story.createdAt?.toDate?.() || new Date();

  return (
    <Link href={`/stories/${story.id}`}>
      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-gray-800 line-clamp-1">
            {story.title}
          </h3>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              statusColors[story.status]
            }`}
          >
            {statusLabels[story.status]}
          </span>
        </div>

        <p className="text-gray-600 text-sm line-clamp-2 mb-4">
          {story.outline}
        </p>

        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>{levelConfig.name.split(" ")[0]}</span>
          <span>
            {story.pageCount > 0 ? `${story.pageCount} pages` : "No pages yet"}
          </span>
        </div>

        <div className="mt-2 text-xs text-gray-400">
          Created {createdAt.toLocaleDateString()}
        </div>
      </div>
    </Link>
  );
}
