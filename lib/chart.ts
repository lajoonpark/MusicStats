export function truncateLabel(label: string, maxLength: number): string {
  if (label.length <= maxLength) return label;
  return `${label.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export const chartTooltipContentStyle = {
  backgroundColor: "#18181b",
  borderColor: "#3f3f46",
  borderRadius: "0.75rem",
  color: "#f4f4f5",
  maxWidth: "260px",
  fontSize: "12px",
  padding: "8px 10px",
};

export const chartTooltipWrapperStyle = {
  pointerEvents: "none" as const,
  zIndex: 30,
};
