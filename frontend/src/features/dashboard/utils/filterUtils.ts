export const isHexColor = (color: string): boolean => /^[0-9a-fA-F]{6}$/.test(color.trim());
export const getLabelColors = (color: string) => {
  const normalized = color?.trim() ?? '';
  if (!isHexColor(normalized)) {
    return {
      backgroundColor: '#6b7280',
      color: '#ffffff'
    };
  }
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return {
    backgroundColor: `#${normalized}`,
    color: yiq >= 128 ? '#000000' : '#ffffff'
  };
};