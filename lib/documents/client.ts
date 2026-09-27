"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { DocumentAnalysis, QuestionAnswer } from "@/lib/documents/types";

async function getAccessToken() {
  const { data, error } = await getSupabaseBrowserClient().auth.getSession();
  if (error) throw new Error(`Could not read your private session: ${error.message}`);
  const token = data.session?.access_token;
  if (!token) throw new Error("Your private session expired. Upload the document again.");
  return token;
}

async function readApiResponse<T>(response: Response): Promise<T> {
  const body: unknown = await response.json();
  if (typeof body !== "object" || body === null) {
    throw new Error("The document service returned an invalid response.");
  }
  if (!response.ok) {
    const message = "error" in body && typeof body.error === "string"
      ? body.error
      : "The document service could not complete the request.";
    throw new Error(message);
  }
  return body as T;
}

export async function processDocument(documentId: string) {
  const token = await getAccessToken();
  const response = await fetch(`/api/documents/${documentId}/process`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  });
  return readApiResponse<DocumentAnalysis>(response);
}

export async function askDocumentQuestion({
  documentId,
  conversationId,
  question,
}: {
  documentId: string;
  conversationId?: string;
  question: string;
}) {
  const token = await getAccessToken();
  const response = await fetch(`/api/documents/${documentId}/questions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ question, conversationId }),
  });
  return readApiResponse<QuestionAnswer>(response);
}
