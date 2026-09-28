export function extractErrorMessage(err: unknown, fallback = 'Unknown error'): string {
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    const apiError = (e.response as { data?: { error?: string } } | undefined)?.data?.error;
    if (typeof apiError === 'string') return apiError;
    if (typeof e.message === 'string') return e.message;
  }
  return fallback;
}

const errorCode = (err: unknown) => (err as { response?: { data?: { code?: string } } } | null)?.response?.data?.code;

export function rateLimitTitle(err: unknown): string | null {
  const code = errorCode(err);
  if (code === 'GITHUB_RATE_LIMIT') return 'GitHub rate limit reached';
  if (code === 'RATE_LIMIT') return 'Request limit reached';
  return null;
}
