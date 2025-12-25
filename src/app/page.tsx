import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-800 mb-6">
            Gammy Stories
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Create custom, illustrated children&apos;s storybooks powered by AI
          </p>

          <div className="flex gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-blue-600 text-white py-3 px-8 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="bg-white text-gray-700 py-3 px-8 rounded-md hover:bg-gray-100 transition-colors font-medium border border-gray-300"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Write Your Outline
            </h3>
            <p className="text-gray-600">
              Describe your story idea and select a reading level
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-4xl mb-4">✨</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              AI Generates Your Story
            </h3>
            <p className="text-gray-600">
              Our AI creates a complete story with beautiful illustrations
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-4xl mb-4">📚</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Edit & Export
            </h3>
            <p className="text-gray-600">
              Customize every page and download your finished book
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
