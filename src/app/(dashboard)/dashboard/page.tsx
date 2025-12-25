"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/contexts/AuthContext";
import StoryCard from "@/components/stories/StoryCard";
import { Story } from "@/types/database";

export default function DashboardPage() {
  const { user, profile, signOut } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStories() {
      if (!user) return;

      try {
        const response = await fetch(`/api/stories?userId=${user.uid}`);
        if (response.ok) {
          const data = await response.json();
          setStories(data.stories);
        }
      } catch (error) {
        console.error("Failed to fetch stories:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStories();
  }, [user]);

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Gammy Stories</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">
                {profile?.displayName || user?.email}
              </span>
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header with create button */}
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-semibold text-gray-800">Your Stories</h2>
            <Link
              href="/stories/new"
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              + Create a Story
            </Link>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Stories grid */}
          {!loading && stories.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stories.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && stories.length === 0 && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="text-4xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                No stories yet
              </h3>
              <p className="text-gray-600 mb-6">
                Create your first AI-powered children&apos;s storybook!
              </p>
              <Link
                href="/stories/new"
                className="inline-block bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors"
              >
                Create a Story ✨
              </Link>
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
