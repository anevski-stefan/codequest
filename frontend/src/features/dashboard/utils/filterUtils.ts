import type { CSSProperties } from 'react';

export const isHexColor = (color: string): boolean => /^[0-9a-fA-F]{6}$/.test(color.trim());

// The palette has a single blue accent and no violet. Label colors are repo
// data, but a violet "good first issue" pill still reads as a purple accent,
// so hues in the violet band (240–320°) are rotated onto the brand blue.
const shiftVioletToBlue = (r: number, g: number, b: number): [number, number, number] => {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d === 0) return [r, g, b];
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  if (h < 240 || h > 320) return [r, g, b];
  const l = (max + min) / 510, s = d / 255 / (1 - Math.abs(2 * l - 1) || 1);
  const target = 220; // brand blue hue (#3B7BFF)
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((target / 60) % 2) - 1)), m = l - c / 2;
  // 220° lies in the 180–240 sector: (0, x, c)
  return [Math.round(m * 255), Math.round((x + m) * 255), Math.round((c + m) * 255)];
};

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
  let r = parseInt(normalized.slice(0, 2), 16);
  let g = parseInt(normalized.slice(2, 4), 16);
  let b = parseInt(normalized.slice(4, 6), 16);
  [r, g, b] = shiftVioletToBlue(r, g, b);
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
