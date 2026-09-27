export type DocumentUnderstanding = {
  summary: string;
  purpose: string;
  intended_for: string;
  before_you_begin: Array<{ item: string; page: number | null }>;
  important_requirements: Array<{ item: string; page: number | null }>;
};

export type DocumentAnalysis = {
  documentId: string;
  pageCount: number;
  provider: "gemini" | "openai";
  understanding: DocumentUnderstanding;
  extractedChunkCount: number;
  sourceSections?: Array<{ sourceNumber: number; text: string }>;
};

export type QuestionAnswer = {
  conversationId: string;
  answer: string;
  sources: number[];
  provider: "gemini" | "openai" | null;
  retrievalMode: "semantic" | "keyword";
};
