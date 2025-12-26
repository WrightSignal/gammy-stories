import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

// Lazy initialization to avoid build-time errors when env vars aren't available
let genAI: GoogleGenerativeAI | null = null;
let geminiModelInstance: GenerativeModel | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

function getGeminiModel(): GenerativeModel {
  if (!geminiModelInstance) {
    geminiModelInstance = getGenAI().getGenerativeModel({
      model: "gemini-2.0-flash",
    });
  }
  return geminiModelInstance;
}

export async function generateStoryContent(prompt: string): Promise<string> {
  const result = await getGeminiModel().generateContent(prompt);
  const response = result.response;
  return response.text();
}
