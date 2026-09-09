export function extractErrorMessage(err: unknown, fallback = 'Unknown error'): string {
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    const apiError = (e.response as { data?: { error?: string } } | undefined)?.data?.error;
    if (typeof apiError === 'string') return apiError;
    if (typeof e.message === 'string') return e.message;
  }
  return fallback;
}
