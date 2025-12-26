import { GoogleGenAI } from "@google/genai";

// Lazy initialization to avoid build-time errors when env vars aren't available
let genAI: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genAI;
}

// Style presets for different reading levels
const stylePresets: Record<string, string> = {
  K: "bright, colorful, simple shapes, friendly cartoon style, very playful and whimsical",
  "1": "warm watercolor illustration, friendly characters, soft colors, storybook style",
  "2": "vibrant digital illustration, expressive characters, dynamic scenes",
  "3": "detailed storybook illustration, rich colors, engaging compositions",
  "4": "polished book illustration, realistic yet stylized, atmospheric lighting",
  "5": "sophisticated children's book art, detailed environments, expressive characters",
};

export interface ImageGenerationResult {
  success: boolean;
  imageBase64?: string;
  mimeType?: string;
  error?: string;
}

function buildImagePrompt(
  pageText: string,
  storyTitle: string,
  readingLevel: string,
  pageNumber: number
): string {
  const style = stylePresets[readingLevel] || stylePresets["2"];

  return `Create a beautiful children's book illustration for a story titled "${storyTitle}".

This is page ${pageNumber} of the story. The page text reads:
"${pageText}"

Art Style: ${style}

Requirements:
- Create a scene that captures the key moment or emotion from this page text
- Child-friendly and age-appropriate for ${readingLevel === "K" ? "Kindergarten" : `Grade ${readingLevel}`} readers
- DO NOT include any text, words, letters, or numbers in the image
- Focus on the main characters and action described in the text
- Use bright, engaging colors that appeal to young readers
- The illustration should be warm and inviting
- Horizontal/landscape orientation suitable for a book page
- No scary, violent, or inappropriate content`;
}

export async function generatePageImage(
  pageText: string,
  storyTitle: string,
  readingLevel: string,
  pageNumber: number
): Promise<ImageGenerationResult> {
  try {
    const prompt = buildImagePrompt(pageText, storyTitle, readingLevel, pageNumber);

    const response = await getGenAI().models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    });

    // Extract image from response
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return {
            success: true,
            imageBase64: part.inlineData.data,
            mimeType: part.inlineData.mimeType || "image/png",
          };
        }
      }
    }

    return {
      success: false,
      error: "No image was generated in the response",
    };
  } catch (error) {
    console.error("Image generation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function generateImageWithRetry(
  pageText: string,
  storyTitle: string,
  readingLevel: string,
  pageNumber: number,
  maxRetries: number = 3
): Promise<ImageGenerationResult> {
  let lastError: string = "";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await generatePageImage(pageText, storyTitle, readingLevel, pageNumber);

    if (result.success) {
      return result;
    }

    lastError = result.error || "Unknown error";

    // If rate limited, wait before retrying
    if (lastError.includes("429") || lastError.includes("quota")) {
      const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  return {
    success: false,
    error: `Failed after ${maxRetries} attempts. Last error: ${lastError}`,
  };
}
