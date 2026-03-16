const COLORS = ["#22c55e","#22c55e","#3b82f6","#3b82f6","#3b82f6","#f59e0b","#f59e0b","#f59e0b","#f97316","#ef4444","#8b5cf6","#14b8a6"];
const FONT_STACKS = {
  sans: "system-ui, sans-serif",
};
const TEXT_STYLES = {
  heroTitle: { fontFamily: FONT_STACKS.sans, fontSize: 20, fontWeight: 700, lineHeight: 1.1 },
  sectionTitle: { fontFamily: FONT_STACKS.sans, fontSize: 15, fontWeight: 700, lineHeight: 1.2 },
  cardTitle: { fontFamily: FONT_STACKS.sans, fontSize: 13, fontWeight: 700, lineHeight: 1.25 },
  body: { fontFamily: FONT_STACKS.sans, fontSize: 13, fontWeight: 500, lineHeight: 1.4 },
  bodyStrong: { fontFamily: FONT_STACKS.sans, fontSize: 13, fontWeight: 700, lineHeight: 1.35 },
  label: { fontFamily: FONT_STACKS.sans, fontSize: 12, fontWeight: 700, lineHeight: 1.3 },
  caption: { fontFamily: FONT_STACKS.sans, fontSize: 11, fontWeight: 500, lineHeight: 1.35 },
  captionStrong: { fontFamily: FONT_STACKS.sans, fontSize: 11, fontWeight: 700, lineHeight: 1.3 },
  eyebrow: { fontFamily: FONT_STACKS.sans, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", lineHeight: 1.3 },
  metric: { fontFamily: FONT_STACKS.sans, fontSize: 20, fontWeight: 900, lineHeight: 1 },
};
const NO_PHOTO_STYLE = { ...TEXT_STYLES.eyebrow, margin: "-16px -16px 12px -16px", borderTopLeftRadius: 16, borderTopRightRadius: 16, background: "linear-gradient(135deg,#1e293b,#0f172a)", height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" };
const IMG_WRAP_STYLE = { margin: "-16px -16px 12px -16px", borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: "hidden", background: "#0f172a" };

export { COLORS, FONT_STACKS, TEXT_STYLES, NO_PHOTO_STYLE, IMG_WRAP_STYLE };
