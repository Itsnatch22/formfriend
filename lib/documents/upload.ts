"use client";

import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const DOCUMENTS_BUCKET = "formfriend-documents";
const MIME_TYPES: Readonly<Record<string, string>> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
} as const;

function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

async function getAnonymousUser(): Promise<User> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) throw new Error(`Could not check your private session: ${error.message}`);
  if (data.session?.user) return data.session.user;

  const { data: anonymousData, error: signInError } =
    await supabase.auth.signInAnonymously();

  if (signInError || !anonymousData.user) {
    throw new Error(
      signInError
        ? `Could not start a private guest session: ${signInError.message}. Check that Anonymous Sign-Ins are enabled in Supabase Auth.`
        : "Could not start a private guest session. Check that Anonymous Sign-Ins are enabled in Supabase Auth.",
    );
  }

  return anonymousData.user;
}

export async function uploadDocument(file: File) {
  const extension = getExtension(file.name);
  const contentType = MIME_TYPES[extension];

  if (!contentType) {
    throw new Error("Choose a PDF, JPG, PNG, Excel, Word, or PowerPoint file to continue.");
  }

  if (file.size <= 0 || file.size > 20 * 1024 * 1024) {
    throw new Error("Choose a file smaller than 20 MB.");
  }

  const supabase = getSupabaseBrowserClient();
  const user = await getAnonymousUser();
  const documentId = crypto.randomUUID();
  const filePath = `${user.id}/${documentId}.${extension}`;

  const { error: insertError } = await supabase.from("documents").insert({
    id: documentId,
    user_id: user.id,
    title: file.name.trim() || `Form.${extension}`,
    file_path: filePath,
    file_type: contentType,
    file_size: file.size,
    status: "processing",
  });

  if (insertError) {
    throw new Error(`Could not prepare your document: ${insertError.message}`);
  }

  let fileStored = false;

  try {
    const { error: uploadError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(filePath, file, { contentType, upsert: false });

    if (uploadError) {
      throw new Error(`Could not upload your document: ${uploadError.message}`);
    }

    fileStored = true;

    const { error: updateError } = await supabase
      .from("documents")
      .update({ status: "uploaded" })
      .eq("id", documentId)
      .eq("user_id", user.id)
      .select("id")
      .single();

    if (updateError) {
      throw new Error(`Your file was uploaded, but its status could not be saved: ${updateError.message}`);
    }

    return { id: documentId };
  } catch (uploadError) {
    const cleanupErrors: string[] = [];

    if (fileStored) {
      const { error } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .remove([filePath]);
      if (error) cleanupErrors.push(`Stored file cleanup failed: ${error.message}`);
    }

    const { error: updateError } = await supabase
      .from("documents")
      .update({ status: "failed" })
      .eq("id", documentId)
      .eq("user_id", user.id);
    if (updateError) cleanupErrors.push(`Document status cleanup failed: ${updateError.message}`);

    const message =
      uploadError instanceof Error ? uploadError.message : "The upload failed unexpectedly.";

    if (cleanupErrors.length > 0) {
      console.error("FormFriend upload cleanup failed", cleanupErrors);
      throw new Error(`${message} ${cleanupErrors.join(" ")}`);
    }

    throw uploadError;
  }
}
