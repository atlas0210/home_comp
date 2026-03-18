const COLORS = ["#22c55e","#22c55e","#3b82f6","#3b82f6","#3b82f6","#f59e0b","#f59e0b","#f59e0b","#f97316","#ef4444","#8b5cf6","#14b8a6"];
const FONT_STACKS = {
  sans: "'Plus Jakarta Sans', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Courier New', monospace",
};
const TEXT_STYLES = {
  heroTitle: { fontFamily: FONT_STACKS.sans, fontSize: 22, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em" },
  sectionTitle: { fontFamily: FONT_STACKS.sans, fontSize: 15, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.01em" },
  cardTitle: { fontFamily: FONT_STACKS.sans, fontSize: 13, fontWeight: 700, lineHeight: 1.25 },
  body: { fontFamily: FONT_STACKS.sans, fontSize: 13, fontWeight: 400, lineHeight: 1.5 },
  bodyStrong: { fontFamily: FONT_STACKS.sans, fontSize: 13, fontWeight: 600, lineHeight: 1.35 },
  label: { fontFamily: FONT_STACKS.sans, fontSize: 12, fontWeight: 600, lineHeight: 1.3 },
  caption: { fontFamily: FONT_STACKS.sans, fontSize: 11, fontWeight: 400, lineHeight: 1.35 },
  captionStrong: { fontFamily: FONT_STACKS.sans, fontSize: 11, fontWeight: 600, lineHeight: 1.3 },
  eyebrow: { fontFamily: FONT_STACKS.sans, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1.3 },
  metric: { fontFamily: FONT_STACKS.mono, fontSize: 22, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.03em" },
};
const NO_PHOTO_STYLE = { ...TEXT_STYLES.eyebrow, margin: "-16px -16px 12px -16px", borderTopLeftRadius: 16, borderTopRightRadius: 16, background: "linear-gradient(135deg,#161d2a,#0d1117)", height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" };
const IMG_WRAP_STYLE = { margin: "-16px -16px 12px -16px", borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: "hidden", background: "#0d1117" };

export { COLORS, FONT_STACKS, TEXT_STYLES, NO_PHOTO_STYLE, IMG_WRAP_STYLE };
