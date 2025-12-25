import { ReadingLevel } from "@/types/database";

interface ReadingLevelConfig {
  name: string;
  vocabularyGuidance: string;
  sentenceGuidance: string;
  suggestedPages: number;
}

export const READING_LEVEL_CONFIG: Record<ReadingLevel, ReadingLevelConfig> = {
  kindergarten: {
    name: "Kindergarten (Ages 4-6)",
    vocabularyGuidance: "Use only simple sight words and very basic vocabulary that a 5-year-old would understand",
    sentenceGuidance: "Keep sentences very short, 3-6 words each",
    suggestedPages: 8,
  },
  grade1: {
    name: "1st Grade (Ages 6-7)",
    vocabularyGuidance: "Use basic vocabulary with simple phonetic words",
    sentenceGuidance: "Keep sentences short, 5-8 words each",
    suggestedPages: 10,
  },
  grade2: {
    name: "2nd Grade (Ages 7-8)",
    vocabularyGuidance: "Use expanding vocabulary with some descriptive words",
    sentenceGuidance: "Sentences can be 6-10 words",
    suggestedPages: 10,
  },
  grade3: {
    name: "3rd Grade (Ages 8-9)",
    vocabularyGuidance: "Use grade-level vocabulary with more complex words",
    sentenceGuidance: "Sentences can be 8-12 words with varied structure",
    suggestedPages: 12,
  },
  grade4: {
    name: "4th Grade (Ages 9-10)",
    vocabularyGuidance: "Use more sophisticated vocabulary and descriptive language",
    sentenceGuidance: "Sentences can be 10-15 words with compound structures",
    suggestedPages: 12,
  },
  grade5: {
    name: "5th Grade (Ages 10-11)",
    vocabularyGuidance: "Use advanced vocabulary appropriate for pre-teens",
    sentenceGuidance: "Sentences can be 12-18 words with complex structures",
    suggestedPages: 14,
  },
};

export function buildStoryPrompt(
  title: string,
  outline: string,
  readingLevel: ReadingLevel
): string {
  const config = READING_LEVEL_CONFIG[readingLevel];

  return `You are a children's book author. Write a complete story based on the following information.

TITLE: ${title}

STORY OUTLINE:
${outline}

REQUIREMENTS:
- Reading level: ${config.name}
- Vocabulary: ${config.vocabularyGuidance}
- Sentence length: ${config.sentenceGuidance}
- Target length: ${config.suggestedPages} pages (one paragraph per page)

CRITICAL FORMATTING RULES:
- Write exactly one paragraph per page
- Each paragraph should describe a single scene or moment
- Separate each page with the exact text "---PAGE---" on its own line
- Do NOT include page numbers
- Do NOT include any markdown formatting
- Do NOT include the title in the output
- Write ONLY the story text, nothing else

EXAMPLE OUTPUT FORMAT:
Once upon a time, there was a little rabbit named Lily who loved to explore the forest.
---PAGE---
One sunny morning, Lily hopped out of her cozy burrow and looked around with excitement.
---PAGE---
She saw a beautiful butterfly with rainbow wings dancing in the air.

BEGIN STORY:`;
}

export function parseStoryIntoPages(rawResponse: string): string[] {
  // Split by the page delimiter
  const pages = rawResponse
    .split("---PAGE---")
    .map((page) => page.trim())
    .filter((page) => page.length > 0);

  return pages;
}
