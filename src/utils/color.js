export function hexToRgba(hex, alpha = 1) {
  if (!hex) return `rgba(0, 0, 0, ${alpha})`;

  let normalized = String(hex).trim();

  if (normalized.startsWith("rgba(") || normalized.startsWith("rgb(")) {
    return normalized;
  }

  normalized = normalized.replace("#", "");

  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map((char) => char + char)
      .join("");
  }

  const num = Number.parseInt(normalized, 16);

  if (Number.isNaN(num)) {
    return `rgba(0, 0, 0, ${alpha})`;
  }

  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
