import "server-only";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const DOCUMENTS_BUCKET = "formfriend-documents";
let adminClient: SupabaseClient | undefined;

export function getSupabaseAdminClient() {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Server Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  adminClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}

export async function requireRequestUser(request: Request): Promise<User> {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new RequestAuthError("A signed-in guest session is required.");

  const { data, error } = await getSupabaseAdminClient().auth.getUser(token);
  if (error || !data.user) {
    throw new RequestAuthError("Your session is invalid or expired. Please upload again.");
  }

  return data.user;
}

export class RequestAuthError extends Error {}
export class PublicApiError extends Error {}

export function errorResponse(error: unknown) {
  if (error instanceof RequestAuthError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (error instanceof PublicApiError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  console.error("FormFriend API error", error);
  return NextResponse.json(
    { error: "We couldn’t complete that request. Please try again." },
    { status: 500 },
  );
}

export { DOCUMENTS_BUCKET };
