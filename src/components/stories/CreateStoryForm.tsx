"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { READING_LEVEL_CONFIG } from "@/lib/ai/prompts";
import { ReadingLevel } from "@/types/database";

const readingLevels: { value: ReadingLevel; label: string }[] = [
  { value: "kindergarten", label: "Kindergarten (Ages 4-6)" },
  { value: "grade1", label: "1st Grade (Ages 6-7)" },
  { value: "grade2", label: "2nd Grade (Ages 7-8)" },
  { value: "grade3", label: "3rd Grade (Ages 8-9)" },
  { value: "grade4", label: "4th Grade (Ages 9-10)" },
  { value: "grade5", label: "5th Grade (Ages 10-11)" },
];

export default function CreateStoryForm() {
  const [title, setTitle] = useState("");
  const [outline, setOutline] = useState("");
  const [readingLevel, setReadingLevel] = useState<ReadingLevel>("grade1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatingStatus, setGeneratingStatus] = useState("");
  const { user } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError("");
    setLoading(true);
    setGeneratingStatus("Creating story...");

    try {
      // Step 1: Create the story
      const createResponse = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          title,
          outline,
          readingLevel,
        }),
      });

      if (!createResponse.ok) {
        const data = await createResponse.json();
        throw new Error(data.error || "Failed to create story");
      }

      const { storyId } = await createResponse.json();
      setGeneratingStatus("Generating story with AI...");

      // Step 2: Generate the story content
      const generateResponse = await fetch(`/api/stories/${storyId}/generate`, {
        method: "POST",
      });

      if (!generateResponse.ok) {
        const data = await generateResponse.json();
        throw new Error(data.error || "Failed to generate story");
      }

      const { pageCount } = await generateResponse.json();
      setGeneratingStatus(`Generated ${pageCount} pages! Redirecting...`);

      // Redirect to the story editor
      setTimeout(() => {
        router.push(`/stories/${storyId}`);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
      setGeneratingStatus("");
    }
  };

  const selectedConfig = READING_LEVEL_CONFIG[readingLevel];

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Create a New Story
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Story Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              placeholder="The Adventures of Luna the Rabbit"
            />
          </div>

          <div>
            <label
              htmlFor="readingLevel"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Reading Level
            </label>
            <select
              id="readingLevel"
              value={readingLevel}
              onChange={(e) => setReadingLevel(e.target.value as ReadingLevel)}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              {readingLevels.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              ~{selectedConfig.suggestedPages} pages, {selectedConfig.sentenceGuidance.toLowerCase()}
            </p>
          </div>

          <div>
            <label
              htmlFor="outline"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Story Outline
            </label>
            <textarea
              id="outline"
              value={outline}
              onChange={(e) => setOutline(e.target.value)}
              required
              disabled={loading}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 resize-none"
              placeholder="Describe your story idea... For example:

A little rabbit named Luna who is afraid of the dark learns to be brave when she has to help her friend who is lost in the forest at night. Along the way, she discovers that the stars and fireflies make the night beautiful and friendly."
            />
            <p className="mt-1 text-sm text-gray-500">
              {outline.length}/2000 characters
            </p>
          </div>

          {generatingStatus && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600"></div>
              {generatingStatus}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !title || !outline || outline.length < 10}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? "Generating..." : "Generate Story ✨"}
          </button>
        </form>
      </div>
    </div>
  );
}
