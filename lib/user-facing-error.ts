const friendlyErrorPatterns: Array<[RegExp, string]> = [
  [
    /anonymous sign.?ins? (?:are |is )?disabled|anonymous provider is disabled/i,
    "Private uploads aren’t available right now. Please try again later, or contact the FormFriend team if this keeps happening.",
  ],
  [
    /AuthApiError|StorageApiError|PostgrestError|AuthRetryableFetchError|FunctionsHttpError/i,
    "We couldn’t complete that request right now. Please try again.",
  ],
  [
    /supabase is not configured|server supabase is not configured|NEXT_PUBLIC_SUPABASE|SUPABASE_SERVICE_ROLE_KEY/i,
    "Secure file storage isn’t available right now. Please try again later.",
  ],
  [
    /GEMINI_API_KEY|OPENAI_COMPATIBLE_|no document AI provider|embedding provider|all configured document AI providers failed|all configured embedding providers failed/i,
    "We couldn’t understand this document right now. Please try again shortly.",
  ],
  [
    /gemini|openai-compatible|document AI provider|embedding provider/i,
    "The document service is having trouble right now. Please try again shortly.",
  ],
  [
    /row-level security|permission denied|postgres|database|could not (?:save|read|search|create conversation|prepare document text)/i,
    "We couldn’t access your document data right now. Please try again.",
  ],
  [
    /failed to fetch|network request failed|load failed|fetch failed|networkerror/i,
    "We couldn’t connect to FormFriend. Check your internet connection and try again.",
  ],
  [
    /invalid jwt|jwt expired|token is expired|session is invalid or expired/i,
    "Your private session has expired. Please choose the file again to start a fresh session.",
  ],
];

export function getUserFacingError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  for (const [pattern, friendlyMessage] of friendlyErrorPatterns) {
    if (pattern.test(message)) return friendlyMessage;
  }

  if (
    !message ||
    /(?:^|\b)(?:error|exception|stack|undefined|null)(?:\b|$)/i.test(message) ||
    /(?:SUPABASE|GEMINI|OPENAI|POSTGRES|JWT|HTTP\/\d|ECONN[A-Z]+|ENOTFOUND)/i.test(message)
  ) {
    return fallback;
  }
  return message;
}
