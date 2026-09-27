import { NextResponse } from "next/server";
import { answerDocumentQuestion } from "@/lib/documents/understanding";
import {
  errorResponse,
  PublicApiError,
  requireRequestUser,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const user = await requireRequestUser(request);
    const { documentId } = await params;
    if (!UUID_PATTERN.test(documentId)) {
      return NextResponse.json({ error: "Invalid document identifier." }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new PublicApiError("The question request must be valid JSON.");
    }

    if (typeof body !== "object" || body === null || !("question" in body)) {
      throw new PublicApiError("Enter a question about this document.");
    }

    const question = body.question;
    const conversationId =
      "conversationId" in body && typeof body.conversationId === "string"
        ? body.conversationId
        : undefined;
    if (typeof question !== "string" || !question.trim() || question.length > 1000) {
      throw new PublicApiError("Questions must contain 1 to 1,000 characters.");
    }
    if (conversationId && !UUID_PATTERN.test(conversationId)) {
      throw new PublicApiError("Invalid conversation identifier.");
    }

    const result = await answerDocumentQuestion({
      documentId,
      user,
      question: question.trim(),
      conversationId,
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
