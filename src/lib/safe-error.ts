/**
 * Extracts a user-friendly error message from any error object.
 * Hides technical details like PGRST codes, JWT errors, FetchErrors, and edge function internals.
 */
export function safeError(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === "string") {
    if (isInternalError(error)) return fallback;
    return error;
  }
  if (error instanceof Error || (typeof error === "object" && error !== null && "message" in error)) {
    const msg = (error as { message: string }).message;
    if (isInternalError(msg)) return fallback;
    return msg;
  }
  return fallback;
}

function isInternalError(msg: string): boolean {
  const patterns = [
    "PGRST",
    "JWT",
    "FetchError",
    "NetworkError",
    "Failed to fetch",
    "Load failed",
    "AbortError",
    "TypeError: Failed",
    "net::ERR_",
    "edge function",
    "Edge Function",
    "supabase",
    "Supabase",
    "unexpected end of JSON",
    "Unexpected token",
    "Cannot coerce",
    "invalid input syntax",
    "violates row-level security",
    "duplicate key value",
  ];
  return patterns.some((p) => msg.includes(p));
}

/**
 * Wraps an async operation with user-friendly error handling via toast.
 * Returns the result or null on error.
 */
export async function withErrorToast<T>(
  fn: () => Promise<T>,
  fallbackMessage: string,
  showToast: (msg: string) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    showToast(safeError(e, fallbackMessage));
    return null;
  }
}
