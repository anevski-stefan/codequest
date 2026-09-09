export function formatUrl(url: string): string {
  const trimmed = url.trim();
  const match = trimmed.match(/^([a-z][a-z0-9+.-]*):/i);
  if (match) return ['http', 'https'].includes(match[1].toLowerCase()) ? trimmed : '#';
  return `https://${trimmed}`;
}

export function formatDisplayUrl(url: string): string {
  try { return new URL(formatUrl(url)).hostname.replace(/^www\./, ''); } catch { return url; }
}
