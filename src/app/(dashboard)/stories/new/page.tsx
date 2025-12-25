import CreateStoryForm from "@/components/stories/CreateStoryForm";
import AuthGuard from "@/components/auth/AuthGuard";
import Link from "next/link";

export default function NewStoryPage() {
  return (
    <AuthGuard>
      <main className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back
              </Link>
              <h1 className="text-2xl font-bold text-gray-800">
                Create a Story
              </h1>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <CreateStoryForm />
        </div>
      </main>
    </AuthGuard>
  );
}
