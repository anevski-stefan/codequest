import type { CSSProperties } from 'react';

export const isHexColor = (color: string): boolean => /^[0-9a-fA-F]{6}$/.test(color.trim());

// Renders GitHub label colors the way GitHub's dark theme does: a tinted
// fill + hairline border, with the text lifted toward white until it reads
// on the slate surface. Raw saturated fills clash with the palette.
export const getLabelColors = (color: string): CSSProperties => {
  const normalized = color?.trim() ?? '';
  if (!isHexColor(normalized)) {
    return {
      backgroundColor: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      color: '#9ca3af',
    };
  }
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  // Darker labels need more lift to hit readable contrast on #2E3245.
  const lift = lum < 0.5 ? 0.55 : 0.25;
  const mix = (c: number) => Math.round(c + (255 - c) * lift);
  return {
    backgroundColor: `rgba(${r},${g},${b},0.14)`,
    border: `1px solid rgba(${r},${g},${b},0.32)`,
    color: `rgb(${mix(r)},${mix(g)},${mix(b)})`,
  };
};
