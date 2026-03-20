import { React, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "../../shared/runtime.js";
import { TEXT_STYLES } from "../../shared/uiTokens.js";
import { CardMetric, ScoreBar } from "../../ui/components.js";
import { CARD_FIELDS, getMissingFields, gradeColor, placeholderLabel, placeholderSummary } from "../../domain/display.js";
function OverviewTab(props) {
  const { sectionTitleStyle, overviewTableMinWidth, overviewRankColWidth, overviewColumns, isMobile, onOverviewSort, overviewSortKey, overviewSortIndicator, overviewRows, finalistHomes, rankByHomeId, overviewRowTone, setHoveredOverviewHomeId, toggleOverviewRowLock, onOverviewRowKeyDown, factorPairForHome, cardFactorPairsByHomeId, scoredFactorSpecs, overviewAddress, chartXAxisTickStyle, chartYAxisTickStyle, chartTooltipLabelStyle, FONT_STACKS, COLORS, isFinalistHomeId } = props;
  const fmtCurrency = (value) => Number.isFinite(value) ? `$${Math.round(value).toLocaleString()}` : "\u2014";
  const fmtInt = (value) => Number.isFinite(value) ? Math.round(value).toLocaleString() : "\u2014";
  const [expandedHomeIds, setExpandedHomeIds] = React.useState(() => []);
  const toggleExpanded = (homeId) => {
    setExpandedHomeIds((prev) => prev.includes(homeId) ? prev.filter((id) => id !== homeId) : [...prev, homeId]);
  };
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { background: "linear-gradient(135deg, #182235 0%, #111827 100%)", borderRadius: 16, padding: 16, marginBottom: 16, border: "1px solid #334155", boxShadow: "0 10px 30px rgba(15,23,42,.35)" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 12, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("h2", { style: { ...sectionTitleStyle, marginBottom: 0 } }, "Finalists"), /* @__PURE__ */ React.createElement("div", { style: { ...TEXT_STYLES.captionStrong, color: "#94a3b8" } }, "Pinned shortlist for quick comparison")), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 } }, finalistHomes.map((home, idx) => /* @__PURE__ */ React.createElement("div", { key: home.homeId, style: { background: "linear-gradient(180deg, #1e293b 0%, #111827 100%)", borderRadius: 14, padding: 14, border: "1px solid #475569", boxShadow: "0 6px 18px rgba(15,23,42,.35)" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8, alignItems: "flex-start" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { ...TEXT_STYLES.eyebrow, color: "#a5b4fc", marginBottom: 4 } }, "Finalist ", idx + 1), /* @__PURE__ */ React.createElement("div", { style: { ...TEXT_STYLES.bodyStrong, fontSize: 15, color: "#f8fafc" } }, home.short), /* @__PURE__ */ React.createElement("div", { style: { ...TEXT_STYLES.caption, color: "#94a3b8", marginTop: 4, lineHeight: 1.35 } }, overviewAddress(home))), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "right" } }, /* @__PURE__ */ React.createElement("div", { style: { ...TEXT_STYLES.captionStrong, color: "#94a3b8" } }, "Weighted"), /* @__PURE__ */ React.createElement("div", { style: { ...TEXT_STYLES.metric, fontSize: 24, color: gradeColor(home.weightedTotal) } }, home.weightedTotal.toFixed(2)))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 } }, /* @__PURE__ */ React.createElement("span", { style: { ...TEXT_STYLES.captionStrong, color: "#e2e8f0", background: "#312e81", border: "1px solid #6366f155", borderRadius: 999, padding: "4px 9px" } }, "Rank #", rankByHomeId.get(home.homeId) ?? "\u2014"), /* @__PURE__ */ React.createElement("span", { style: { ...TEXT_STYLES.captionStrong, color: "#cbd5e1", background: "#0f172a", border: "1px solid #334155", borderRadius: 999, padding: "4px 9px" } }, "Grade ", home.grade)), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 } }, [
    ["Monthly", `${fmtCurrency(home.totalMo)}/mo`],
    ["Living", `${fmtInt(home.sqft)} sqft`],
    ["Lot", `${fmtInt(home.lotSqft)} sqft`]
  ].map(([label, value]) => /* @__PURE__ */ React.createElement("div", { key: label, style: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "10px 9px" } }, /* @__PURE__ */ React.createElement("div", { style: { ...TEXT_STYLES.captionStrong, color: "#94a3b8", marginBottom: 3 } }, label), /* @__PURE__ */ React.createElement("div", { style: { ...TEXT_STYLES.bodyStrong, fontSize: 12, color: "#f1f5f9" } }, value)))), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12, paddingTop: 12, borderTop: "1px solid #334155" } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "aria-expanded": expandedHomeIds.includes(home.homeId),
      onClick: () => toggleExpanded(home.homeId),
      style: { ...TEXT_STYLES.captionStrong, width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "#0f172a", color: "#e2e8f0", border: "1px solid #334155", borderRadius: 10, padding: "10px 12px", cursor: "pointer" }
    },
    /* @__PURE__ */ React.createElement("span", null, expandedHomeIds.includes(home.homeId) ? "Hide full details" : "Show full details"),
    /* @__PURE__ */ React.createElement("span", { style: { color: "#94a3b8" } }, expandedHomeIds.includes(home.homeId) ? "\u2212" : "+")
  )), expandedHomeIds.includes(home.homeId) && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12, display: "grid", gap: 12 } }, getMissingFields(home).length > 0 && /* @__PURE__ */ React.createElement("div", { style: { ...TEXT_STYLES.caption, padding: "8px 10px", borderRadius: 10, background: "#3f2a12", border: "1px solid #f59e0b55", color: "#fbbf24" } }, "Missing data: ", getMissingFields(home).length, " field(s) (", placeholderSummary(home, 4), ")"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 } }, CARD_FIELDS(home).map(([label, value]) => /* @__PURE__ */ React.createElement(CardMetric, { key: `${home.homeId}-${label}`, label, value }))), /* @__PURE__ */ React.createElement("div", { style: { paddingTop: 12, borderTop: "1px solid #334155" } }, /* @__PURE__ */ React.createElement("div", { style: { ...TEXT_STYLES.eyebrow, color: "#94a3b8", marginBottom: 8 } }, "Scored Factors (Raw + Score)"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gap: 8 } }, scoredFactorSpecs.map((spec) => {
    const pair = cardFactorPairsByHomeId.get(home.homeId)?.[spec.key] ?? { raw: "\u2014", score: "\u2014", scoreNum: null };
    return /* @__PURE__ */ React.createElement("div", { key: `${home.homeId}-${spec.key}`, style: { display: "grid", gap: 5 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { ...TEXT_STYLES.captionStrong, color: "#e2e8f0" } }, spec.label), /* @__PURE__ */ React.createElement("div", { style: { ...TEXT_STYLES.caption, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, pair.raw)), /* @__PURE__ */ React.createElement("div", { style: { ...TEXT_STYLES.label, color: Number.isFinite(pair.scoreNum) ? gradeColor(pair.scoreNum) : "#64748b", fontWeight: 800, whiteSpace: "nowrap" } }, pair.score)), /* @__PURE__ */ React.createElement(ScoreBar, { value: pair.scoreNum }));
  }))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 12, borderTop: "1px solid #334155" } }, getMissingFields(home).map((fieldKey) => /* @__PURE__ */ React.createElement("span", { key: `${home.homeId}-missing-${fieldKey}`, style: { ...TEXT_STYLES.caption, color: "#fbbf24", background: "#3f2a12", border: "1px solid #f59e0b55", borderRadius: 999, padding: "3px 8px" } }, "Missing: ", placeholderLabel(fieldKey))), (home.tags || []).map((tag) => /* @__PURE__ */ React.createElement("span", { key: `${home.homeId}-${tag}`, style: { ...TEXT_STYLES.captionStrong, color: "#cbd5e1", background: "#0f172a", border: "1px solid #2d3748", borderRadius: 999, padding: "3px 8px" } }, tag)))))))), /* @__PURE__ */ React.createElement("div", { style: { background: "#161d2a", borderRadius: 12, padding: 16, marginBottom: 16 } }, /* @__PURE__ */ React.createElement("h2", { style: { ...sectionTitleStyle, marginBottom: 12 } }, "\u{1F3C6} Rankings"), /* @__PURE__ */ React.createElement("div", { style: { overflowX: "auto" } }, /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: isMobile ? 10 : 12, minWidth: overviewTableMinWidth } }, /* @__PURE__ */ React.createElement("colgroup", null, /* @__PURE__ */ React.createElement("col", { style: { width: overviewRankColWidth, minWidth: overviewRankColWidth } }), overviewColumns.map((col) => /* @__PURE__ */ React.createElement(
    "col",
    {
      key: col.key,
      style: {
        width: isMobile ? col.mobileMinWidth ?? col.minWidth ?? 70 : col.minWidth ?? 70,
        minWidth: isMobile ? col.mobileMinWidth ?? col.minWidth ?? 70 : col.minWidth ?? 70
      }
    }
  ))), /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { style: { ...TEXT_STYLES.label, textAlign: "left", padding: isMobile ? "5px 4px" : "7px 5px", fontSize: isMobile ? 10 : 12, color: "#94a3b8", width: overviewRankColWidth, whiteSpace: "nowrap" } }, "#"), overviewColumns.map((col) => /* @__PURE__ */ React.createElement(
    "th",
    {
      key: col.key,
      onClick: () => onOverviewSort(col.key),
      style: { ...TEXT_STYLES.label, textAlign: col.align, padding: isMobile ? "5px 4px" : "7px 5px", fontSize: isMobile ? 10 : 12, color: overviewSortKey === col.key ? "#e2e8f0" : "#94a3b8", cursor: "pointer", whiteSpace: "nowrap", userSelect: "none", overflow: "hidden", textOverflow: "ellipsis" },
      title: "Click to sort"
    },
    col.label,
    overviewSortIndicator(col.key)
  )))), /* @__PURE__ */ React.createElement("tbody", null, overviewRows.map((h) => {
    const missingCount = getMissingFields(h).length;
    const lockedRank = rankByHomeId.get(h.homeId);
    const rowTone = overviewRowTone(h.homeId);
    const isFinalist = isFinalistHomeId(h.homeId);
    const rowBg = rowTone === "locked" ? "#1f2350" : rowTone === "hover" ? "#1d253f" : isFinalist ? "#172036" : "transparent";
    const rowBorder = rowTone === "locked" ? "#6366f1" : rowTone === "hover" ? "#475569" : isFinalist ? "#4f46e5" : "#334155";
    const rowOutline = rowTone === "locked" ? "0 0 0 1px #6366f155 inset" : isFinalist ? "0 0 0 1px #4f46e533 inset" : "none";
    return /* @__PURE__ */ React.createElement(
      "tr",
      {
        key: h.homeId,
        tabIndex: 0,
        "aria-selected": rowTone === "locked",
        onMouseEnter: () => setHoveredOverviewHomeId(h.homeId),
        onMouseLeave: () => setHoveredOverviewHomeId((prev) => prev === h.homeId ? null : prev),
        onFocus: () => setHoveredOverviewHomeId(h.homeId),
        onBlur: () => setHoveredOverviewHomeId((prev) => prev === h.homeId ? null : prev),
        onClick: () => toggleOverviewRowLock(h.homeId),
        onKeyDown: (e) => onOverviewRowKeyDown(e, h.homeId),
        style: { cursor: "pointer", outline: "none", boxShadow: rowOutline }
      },
      /* @__PURE__ */ React.createElement("td", { style: { ...TEXT_STYLES.label, padding: isMobile ? "7px 4px" : "9px 5px", color: rowTone === "locked" ? "#a5b4fc" : "#64748b", borderTop: `1px solid ${rowBorder}`, verticalAlign: "top", fontSize: isMobile ? 10 : 12, whiteSpace: "nowrap", background: rowBg } }, "#", lockedRank ?? "\u2014"),
      overviewColumns.map((col) => {
        if (col.key === "address") {
          return /* @__PURE__ */ React.createElement("td", { key: col.key, style: { padding: isMobile ? "7px 4px" : "9px 5px", borderTop: `1px solid ${rowBorder}`, verticalAlign: "top", minWidth: isMobile ? 210 : 240, background: rowBg } }, isFinalist && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 6 } }, /* @__PURE__ */ React.createElement("span", { style: { ...TEXT_STYLES.captionStrong, color: "#c7d2fe", background: "#312e81", border: "1px solid #6366f166", borderRadius: 999, padding: "3px 8px" } }, "Finalist")), /* @__PURE__ */ React.createElement("div", { style: { ...TEXT_STYLES.bodyStrong, fontSize: isMobile ? 10 : 12, color: rowTone === "locked" ? "#eef2ff" : "#f1f5f9", lineHeight: 1.25, overflowWrap: "anywhere", whiteSpace: "normal" } }, overviewAddress(h)), missingCount > 0 && /* @__PURE__ */ React.createElement("div", { style: { ...TEXT_STYLES.caption, marginTop: 2, fontSize: isMobile ? 9 : 10, color: "#fbbf24" } }, "Missing ", missingCount, ": ", placeholderSummary(h)));
        }
        if (col.type === "factor") {
          const pair = factorPairForHome(h, col.key);
          return /* @__PURE__ */ React.createElement(
            "td",
            {
              key: col.key,
              style: {
                padding: isMobile ? "7px 4px" : "9px 5px",
                textAlign: col.align,
                borderTop: `1px solid ${rowBorder}`,
                background: rowBg,
                whiteSpace: "nowrap",
                fontFamily: FONT_STACKS.sans,
                fontSize: isMobile ? 10 : 11,
                overflow: "hidden",
                textOverflow: "ellipsis",
                verticalAlign: "top"
              }
            },
            /* @__PURE__ */ React.createElement("div", { style: { ...TEXT_STYLES.bodyStrong, color: "#e2e8f0", fontSize: isMobile ? 10 : 11, overflow: "hidden", textOverflow: "ellipsis" } }, pair.raw),
            /* @__PURE__ */ React.createElement("div", { style: { ...TEXT_STYLES.captionStrong, marginTop: 1, color: Number.isFinite(pair.scoreNum) ? gradeColor(pair.scoreNum) : "#64748b", fontSize: isMobile ? 9 : 10 } }, "Score: ", pair.score)
          );
        }
        const value = col.key === "weightedTotal" ? h.weightedTotal?.toFixed(2) ?? "\u2014" : "\u2014";
        const isWeightedTotal = col.key === "weightedTotal";
        return /* @__PURE__ */ React.createElement(
          "td",
          {
            key: col.key,
            style: {
              padding: isMobile ? "7px 4px" : "9px 5px",
              textAlign: col.align,
              borderTop: `1px solid ${rowBorder}`,
              background: rowBg,
              color: isWeightedTotal ? gradeColor(h.weightedTotal) : "#e2e8f0",
              fontWeight: isWeightedTotal ? 800 : 500,
              whiteSpace: "nowrap",
              fontFamily: FONT_STACKS.sans,
              fontSize: isMobile ? 10 : 11,
              overflow: "hidden",
              textOverflow: "ellipsis"
            }
          },
          value
        );
      })
    );
  }))))), /* @__PURE__ */ React.createElement("div", { style: { background: "#161d2a", borderRadius: 12, padding: 16 } }, /* @__PURE__ */ React.createElement("h2", { style: { ...sectionTitleStyle, marginBottom: 12 } }, "Weighted Score"), /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: 260 }, /* @__PURE__ */ React.createElement(BarChart, { data: overviewRows, margin: { top: 0, right: 0, bottom: 50, left: 0 } }, /* @__PURE__ */ React.createElement(XAxis, { dataKey: "short", tick: chartXAxisTickStyle, angle: -35, textAnchor: "end", interval: 0, height: 60 }), /* @__PURE__ */ React.createElement(YAxis, { domain: [0, 100], tick: chartYAxisTickStyle }), /* @__PURE__ */ React.createElement(Tooltip, { contentStyle: { background: "#161d2a", border: "1px solid #2d3748", borderRadius: 8, fontFamily: FONT_STACKS.sans }, labelStyle: chartTooltipLabelStyle, formatter: (v, n) => [n === "weightedTotal" ? Number(v).toFixed(2) : v, n] }), /* @__PURE__ */ React.createElement(Bar, { dataKey: "weightedTotal", radius: [4, 4, 0, 0] }, overviewRows.map((h, i) => /* @__PURE__ */ React.createElement(Cell, { key: h.homeId, fill: COLORS[i % COLORS.length] })))))));
}
export {
  OverviewTab as default
};
