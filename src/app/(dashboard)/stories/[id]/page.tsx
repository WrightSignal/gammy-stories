"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { jsPDF } from "jspdf";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/contexts/AuthContext";
import { Story, Page } from "@/types/database";
import { READING_LEVEL_CONFIG } from "@/lib/ai/prompts";

interface StoryPageProps {
  params: Promise<{ id: string }>;
}

export default function StoryPage({ params }: StoryPageProps) {
  const { id } = use(params);
  const [story, setStory] = useState<Story | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());
  const [previewImage, setPreviewImage] = useState<{ url: string; pageNumber: number } | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function fetchStory() {
      try {
        const response = await fetch(`/api/stories/${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch story");
        }
        const data = await response.json();
        setStory(data.story);
        setPages(data.pages);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchStory();
  }, [id]);

  const generateImage = async (pageId: string) => {
    if (!user) return;

    setGeneratingImages((prev) => new Set(prev).add(pageId));

    try {
      const response = await fetch(
        `/api/stories/${id}/pages/${pageId}/generate-image`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user.uid}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate image");
      }

      const data = await response.json();

      // Update the page in state with the new image
      setPages((prev) =>
        prev.map((page) =>
          page.id === pageId
            ? { ...page, imageUrl: data.imageUrl, imageStatus: "generated" as const }
            : page
        )
      );
    } catch (err) {
      console.error("Error generating image:", err);
      alert(err instanceof Error ? err.message : "Failed to generate image");
    } finally {
      setGeneratingImages((prev) => {
        const next = new Set(prev);
        next.delete(pageId);
        return next;
      });
    }
  };

  const generateAllImages = async () => {
    if (!user) return;

    const pagesWithoutImages = pages.filter(
      (page) => !page.imageUrl && page.imageStatus !== "generating"
    );

    for (const page of pagesWithoutImages) {
      await generateImage(page.id);
    }
  };

  const exportToPdf = async () => {
    if (!story) return;

    const pagesWithImages = pages.filter((page) => page.imageUrl);
    if (pagesWithImages.length === 0) {
      alert("Please generate at least one image before exporting to PDF.");
      return;
    }

    setExportingPdf(true);

    try {
      // Create PDF in landscape orientation for storybook format
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const imageWidth = (pageWidth - margin * 3) / 2; // Half page for image
      const imageHeight = pageHeight - margin * 2;

      // Title page
      pdf.setFontSize(32);
      pdf.setFont("helvetica", "bold");
      const titleLines = pdf.splitTextToSize(story.title, pageWidth - margin * 2);
      const titleY = pageHeight / 2 - (titleLines.length * 12) / 2;
      pdf.text(titleLines, pageWidth / 2, titleY, { align: "center" });

      pdf.setFontSize(14);
      pdf.setFont("helvetica", "normal");
      const levelConfig = READING_LEVEL_CONFIG[story.readingLevel];
      pdf.text(`Reading Level: ${levelConfig.name}`, pageWidth / 2, titleY + titleLines.length * 12 + 10, { align: "center" });

      // Content pages
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        pdf.addPage();

        // Left side: Text
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "normal");
        const textX = margin;
        const textWidth = imageWidth - 10;
        const textLines = pdf.splitTextToSize(page.currentText, textWidth);
        
        // Center text vertically
        const textHeight = textLines.length * 8;
        const textY = (pageHeight - textHeight) / 2;
        pdf.text(textLines, textX, textY);

        // Page number
        pdf.setFontSize(10);
        pdf.text(`Page ${page.pageNumber}`, margin, pageHeight - 10);

        // Right side: Image (if available)
        if (page.imageUrl) {
          try {
            // Fetch the image and convert to base64
            const response = await fetch(page.imageUrl);
            const blob = await response.blob();
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });

            // Add image to PDF
            const imgX = pageWidth / 2 + margin / 2;
            const imgY = margin;
            pdf.addImage(base64, "PNG", imgX, imgY, imageWidth, imageHeight, undefined, "MEDIUM");
          } catch (imgError) {
            console.error(`Failed to add image for page ${page.pageNumber}:`, imgError);
          }
        }
      }

      // Save the PDF
      const filename = `${story.title.replace(/[^a-zA-Z0-9]/g, "_")}_storybook.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error("Error exporting PDF:", err);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setExportingPdf(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </AuthGuard>
    );
  }

  if (error || !story) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Story Not Found
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link
              href="/dashboard"
              className="text-blue-600 hover:text-blue-500"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const levelConfig = READING_LEVEL_CONFIG[story.readingLevel];

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
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {story.title}
                </h1>
                <p className="text-sm text-gray-500">
                  {levelConfig.name} • {pages.length} pages
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={generateAllImages}
                disabled={generatingImages.size > 0}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {generatingImages.size > 0 ? "Generating..." : "🎨 Generate All Images"}
              </button>
              <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors">
                Preview
              </button>
              <button
                onClick={exportToPdf}
                disabled={exportingPdf || pages.filter(p => p.imageUrl).length === 0}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exportingPdf ? "📄 Exporting..." : "📄 Export PDF"}
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid gap-6">
            {pages.map((page, index) => (
              <div
                key={page.id}
                className="bg-white rounded-lg shadow-md p-6 flex gap-6"
              >
                {/* Page number */}
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">
                    {page.pageNumber}
                  </span>
                </div>

                {/* Page content */}
                <div className="flex-grow">
                  <textarea
                    defaultValue={page.currentText}
                    className="w-full p-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-black"
                    rows={3}
                  />
                  <div className="mt-2 flex gap-2">
                    <button className="text-sm text-gray-500 hover:text-gray-700">
                      🔒 Lock
                    </button>
                    <button className="text-sm text-gray-500 hover:text-gray-700">
                      ↩️ Reset
                    </button>
                  </div>
                </div>

                {/* Image section */}
                <div className="flex-shrink-0 w-48 h-36">
                  {generatingImages.has(page.id) ? (
                    <div className="w-full h-full bg-purple-50 rounded-md flex items-center justify-center border-2 border-purple-200">
                      <div className="text-center text-purple-600">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600 mx-auto mb-2"></div>
                        <span className="text-xs">Generating...</span>
                      </div>
                    </div>
                  ) : page.imageUrl ? (
                    <div className="relative w-full h-full group">
                      <Image
                        src={page.imageUrl}
                        alt={`Page ${page.pageNumber} illustration`}
                        fill
                        className="object-cover rounded-md cursor-pointer"
                        unoptimized
                        onClick={() => setPreviewImage({ url: page.imageUrl!, pageNumber: page.pageNumber })}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center gap-2">
                        <button
                          onClick={() => setPreviewImage({ url: page.imageUrl!, pageNumber: page.pageNumber })}
                          className="bg-white text-gray-800 px-2 py-1 rounded text-xs hover:bg-gray-100"
                        >
                          🔍 View
                        </button>
                        <button
                          onClick={() => generateImage(page.id)}
                          className="bg-white text-gray-800 px-2 py-1 rounded text-xs hover:bg-gray-100"
                        >
                          🔄 Regenerate
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => generateImage(page.id)}
                      className="w-full h-full bg-gray-100 rounded-md flex items-center justify-center border-2 border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50 transition-colors cursor-pointer"
                    >
                      <div className="text-center text-gray-400 hover:text-purple-600">
                        <div className="text-2xl mb-1">🎨</div>
                        <span className="text-xs">Generate Image</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {pages.length === 0 && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600">
                No pages yet. The story is still being generated.
              </p>
            </div>
          )}
        </div>

        {/* Image Preview Modal */}
        {previewImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={() => setPreviewImage(null)}
          >
            <div
              className="relative max-w-4xl max-h-[90vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 text-xl"
              >
                ✕ Close
              </button>

              {/* Page number label */}
              <div className="absolute -top-12 left-0 text-white text-lg font-semibold">
                Page {previewImage.pageNumber}
              </div>

              {/* Image container */}
              <div className="relative w-full aspect-[4/3] bg-gray-900 rounded-lg overflow-hidden">
                <Image
                  src={previewImage.url}
                  alt={`Page ${previewImage.pageNumber} illustration`}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>

              {/* Navigation arrows */}
              <div className="flex justify-between mt-4">
                <button
                  onClick={() => {
                    const currentIndex = pages.findIndex(p => p.pageNumber === previewImage.pageNumber);
                    const prevPage = pages.slice(0, currentIndex).reverse().find(p => p.imageUrl);
                    if (prevPage?.imageUrl) {
                      setPreviewImage({ url: prevPage.imageUrl, pageNumber: prevPage.pageNumber });
                    }
                  }}
                  className="text-white hover:text-gray-300 px-4 py-2 disabled:opacity-50"
                  disabled={!pages.slice(0, pages.findIndex(p => p.pageNumber === previewImage.pageNumber)).some(p => p.imageUrl)}
                >
                  ← Previous
                </button>
                <button
                  onClick={() => {
                    const currentIndex = pages.findIndex(p => p.pageNumber === previewImage.pageNumber);
                    const nextPage = pages.slice(currentIndex + 1).find(p => p.imageUrl);
                    if (nextPage?.imageUrl) {
                      setPreviewImage({ url: nextPage.imageUrl, pageNumber: nextPage.pageNumber });
                    }
                  }}
                  className="text-white hover:text-gray-300 px-4 py-2 disabled:opacity-50"
                  disabled={!pages.slice(pages.findIndex(p => p.pageNumber === previewImage.pageNumber) + 1).some(p => p.imageUrl)}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
