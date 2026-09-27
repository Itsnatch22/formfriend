import { NextResponse } from "next/server";
import {
  createDocumentUnderstanding,
  createEmbeddings,
  extractDocumentPages,
} from "@/lib/documents/understanding";
import {
  errorResponse,
  getSupabaseAdminClient,
  requireRequestUser,
  DOCUMENTS_BUCKET,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];
const XLS_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

function matchesFileType(bytes: Uint8Array, fileType: string) {
  if (fileType === "application/pdf") {
    return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  }
  if (fileType === "image/png") {
    return PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);
  }
  if (fileType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (fileType === "application/vnd.ms-excel") {
    return XLS_SIGNATURE.every((byte, index) => bytes[index] === byte);
  }
  if (
    fileType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileType === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    return ZIP_SIGNATURE.every((byte, index) => bytes[index] === byte);
  }
  return false;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  let documentId: string | undefined;
  let userId: string | undefined;

  try {
    const user = await requireRequestUser(request);
    userId = user.id;
    ({ documentId } = await params);
    if (!UUID_PATTERN.test(documentId)) {
      return NextResponse.json({ error: "Invalid document identifier." }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("id, user_id, title, file_path, file_type, file_size, status")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (documentError || !document) {
      return NextResponse.json({ error: "This document was not found in your session." }, { status: 404 });
    }

    const { error: statusError } = await supabase
      .from("documents")
      .update({ status: "processing" })
      .eq("id", documentId)
      .eq("user_id", user.id);
    if (statusError) throw new Error(`Could not update document status: ${statusError.message}`);

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .download(document.file_path);
    if (downloadError || !fileBlob) {
      throw new Error(`Could not read stored document: ${downloadError?.message ?? "file missing"}`);
    }

    const fileBytes = new Uint8Array(await fileBlob.arrayBuffer());
    if (fileBytes.byteLength <= 0 || fileBytes.byteLength > 20 * 1024 * 1024) {
      throw new Error("The stored document exceeds the 20 MB upload limit.");
    }
    if (fileBytes.byteLength !== Number(document.file_size)) {
      throw new Error("Stored document size does not match its metadata.");
    }
    if (!matchesFileType(fileBytes, document.file_type)) {
      throw new Error("The stored file does not match its declared document type.");
    }

    const pages = await extractDocumentPages(fileBytes, document.file_type);
    const analysis = await createDocumentUnderstanding(pages, fileBytes, document.file_type);
    const extractedPages = new Map(
      analysis.extractedPages.map((page) => [page.pageNumber, page.text]),
    );
    const textPages = pages.map((page) => ({
      ...page,
      text: page.text.trim() || extractedPages.get(page.pageNumber) || "",
    }));

    const chunks = textPages.flatMap((page) => {
      const chunkLength = 3_500;
      const overlap = 300;
      const result: Array<{
        document_id: string;
        page_number: number;
        chunk_index: number;
        content: string;
      }> = [];

      for (let offset = 0; offset < page.text.length; offset += chunkLength - overlap) {
        const content = page.text.slice(offset, offset + chunkLength).trim();
        if (content) {
          result.push({
            document_id: document.id,
            page_number: page.pageNumber,
            chunk_index: 0,
            content,
          });
        }
      }
      return result;
    });
    chunks.forEach((chunk, index) => {
      chunk.chunk_index = index;
    });

    if (chunks.length === 0) {
      throw new Error("The document contains no readable text. Try a clearer scan or another file.");
    }

    const officeMimeTypes = new Set([
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ]);
    const sourceSections = officeMimeTypes.has(document.file_type)
      ? textPages.map((page) => ({
          sourceNumber: page.pageNumber,
          text: page.text,
        }))
      : undefined;

    const embeddingResult = await createEmbeddings(
      chunks.map((chunk) => chunk.content),
      "RETRIEVAL_DOCUMENT",
    );
    const { embeddings } = embeddingResult;
    if (embeddings.length !== chunks.length) {
      throw new Error("The embedding provider returned an incomplete set of document vectors.");
    }
    if (!embeddingResult.provider || !embeddingResult.model) {
      throw new Error("No provider returned document embeddings.");
    }

    const { error: deleteChunksError } = await supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", document.id);
    if (deleteChunksError) {
      throw new Error(`Could not prepare document text: ${deleteChunksError.message}`);
    }

    for (let offset = 0; offset < chunks.length; offset += 100) {
      const { error: insertChunksError } = await supabase
        .from("document_chunks")
        .insert(
          chunks.slice(offset, offset + 100).map((chunk) => ({
            ...chunk,
            embedding: `[${embeddings[chunk.chunk_index].join(",")}]`,
          })),
        );
      if (insertChunksError) {
        throw new Error(`Could not save extracted text: ${insertChunksError.message}`);
      }
    }

    const { data: savedDocument, error: saveError } = await supabase
      .from("documents")
      .update({
        page_count: pages.length,
        summary: analysis.understanding.summary,
        understanding: analysis.understanding,
        embedding_provider: embeddingResult.provider,
        embedding_model: embeddingResult.model,
        status: "ready",
      })
      .eq("id", document.id)
      .eq("user_id", user.id)
      .select("id")
      .single();
    if (saveError || !savedDocument) {
      throw new Error(`Could not save document understanding: ${saveError?.message ?? "record not found"}`);
    }

    return NextResponse.json({
      documentId: document.id,
      pageCount: pages.length,
      provider: analysis.provider,
      embeddingProvider: embeddingResult.provider,
      understanding: analysis.understanding,
      extractedChunkCount: chunks.length,
      ...(sourceSections ? { sourceSections } : {}),
    });
  } catch (error) {
    if (documentId && userId) {
      const supabase = getSupabaseAdminClient();
      const { error: updateError } = await supabase
        .from("documents")
        .update({ status: "failed" })
        .eq("id", documentId)
        .eq("user_id", userId);
      if (updateError) console.error("Could not mark document processing as failed", updateError);
    }
    return errorResponse(error);
  }
}
