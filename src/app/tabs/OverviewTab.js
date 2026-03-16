import { React, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from '../../shared/runtime.js';
import { TEXT_STYLES } from '../../shared/uiTokens.js';
import { getMissingFields, gradeColor, placeholderSummary } from '../../domain/display.js';
export default function OverviewTab(props) {
  const {
    sectionTitleStyle,
    overviewTableMinWidth,
    overviewRankColWidth,
    overviewColumns,
    isMobile,
    onOverviewSort,
    overviewSortKey,
    overviewSortIndicator,
    overviewRows,
    rankByHomeId,
    overviewRowTone,
    setHoveredOverviewHomeId,
    toggleOverviewRowLock,
    onOverviewRowKeyDown,
    factorPairForHome,
    overviewAddress,
    chartXAxisTickStyle,
    chartYAxisTickStyle,
    chartTooltipLabelStyle,
    FONT_STACKS,
    COLORS
  } = props;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#1e293b",
      borderRadius: 12,
      padding: 16,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      ...sectionTitleStyle,
      marginBottom: 12
    }
  }, "\uD83C\uDFC6 Rankings"), /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: "auto"
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      tableLayout: "fixed",
      fontSize: isMobile ? 10 : 12,
      minWidth: overviewTableMinWidth
    }
  }, /*#__PURE__*/React.createElement("colgroup", null, /*#__PURE__*/React.createElement("col", {
    style: {
      width: overviewRankColWidth,
      minWidth: overviewRankColWidth
    }
  }), overviewColumns.map(col => /*#__PURE__*/React.createElement("col", {
    key: col.key,
    style: {
      width: isMobile ? col.mobileMinWidth ?? col.minWidth ?? 70 : col.minWidth ?? 70,
      minWidth: isMobile ? col.mobileMinWidth ?? col.minWidth ?? 70 : col.minWidth ?? 70
    }
  }))), /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: {
      ...TEXT_STYLES.label,
      textAlign: "left",
      padding: isMobile ? "5px 4px" : "7px 5px",
      fontSize: isMobile ? 10 : 12,
      color: "#94a3b8",
      width: overviewRankColWidth,
      whiteSpace: "nowrap"
    }
  }, "#"), overviewColumns.map(col => /*#__PURE__*/React.createElement("th", {
    key: col.key,
    onClick: () => onOverviewSort(col.key),
    style: {
      ...TEXT_STYLES.label,
      textAlign: col.align,
      padding: isMobile ? "5px 4px" : "7px 5px",
      fontSize: isMobile ? 10 : 12,
      color: overviewSortKey === col.key ? "#e2e8f0" : "#94a3b8",
      cursor: "pointer",
      whiteSpace: "nowrap",
      userSelect: "none",
      overflow: "hidden",
      textOverflow: "ellipsis"
    },
    title: "Click to sort"
  }, col.label, overviewSortIndicator(col.key))))), /*#__PURE__*/React.createElement("tbody", null, overviewRows.map(h => {
    const missingCount = getMissingFields(h).length;
    const lockedRank = rankByHomeId.get(h.homeId);
    const rowTone = overviewRowTone(h.homeId);
    const rowBg = rowTone === "locked" ? "#1f2350" : rowTone === "hover" ? "#1d253f" : "transparent";
    const rowBorder = rowTone === "locked" ? "#6366f1" : rowTone === "hover" ? "#475569" : "#334155";
    const rowOutline = rowTone === "locked" ? "0 0 0 1px #6366f155 inset" : "none";
    return /*#__PURE__*/React.createElement("tr", {
      key: h.homeId,
      tabIndex: 0,
      "aria-selected": rowTone === "locked",
      onMouseEnter: () => setHoveredOverviewHomeId(h.homeId),
      onMouseLeave: () => setHoveredOverviewHomeId(prev => prev === h.homeId ? null : prev),
      onFocus: () => setHoveredOverviewHomeId(h.homeId),
      onBlur: () => setHoveredOverviewHomeId(prev => prev === h.homeId ? null : prev),
      onClick: () => toggleOverviewRowLock(h.homeId),
      onKeyDown: e => onOverviewRowKeyDown(e, h.homeId),
      style: {
        cursor: "pointer",
        outline: "none",
        boxShadow: rowOutline
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        ...TEXT_STYLES.label,
        padding: isMobile ? "7px 4px" : "9px 5px",
        color: rowTone === "locked" ? "#a5b4fc" : "#64748b",
        borderTop: `1px solid ${rowBorder}`,
        verticalAlign: "top",
        fontSize: isMobile ? 10 : 12,
        whiteSpace: "nowrap",
        background: rowBg
      }
    }, "#", lockedRank ?? "—"), overviewColumns.map(col => {
      if (col.key === "address") {
        return /*#__PURE__*/React.createElement("td", {
          key: col.key,
          style: {
            padding: isMobile ? "7px 4px" : "9px 5px",
            borderTop: `1px solid ${rowBorder}`,
            verticalAlign: "top",
            minWidth: isMobile ? 210 : 240,
            background: rowBg
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            ...TEXT_STYLES.bodyStrong,
            fontSize: isMobile ? 10 : 12,
            color: rowTone === "locked" ? "#eef2ff" : "#f1f5f9",
            lineHeight: 1.25,
            overflowWrap: "anywhere",
            whiteSpace: "normal"
          }
        }, overviewAddress(h)), missingCount > 0 && /*#__PURE__*/React.createElement("div", {
          style: {
            ...TEXT_STYLES.caption,
            marginTop: 2,
            fontSize: isMobile ? 9 : 10,
            color: "#fbbf24"
          }
        }, "Missing ", missingCount, ": ", placeholderSummary(h)));
      }
      if (col.type === "factor") {
        const pair = factorPairForHome(h, col.key);
        return /*#__PURE__*/React.createElement("td", {
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
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            ...TEXT_STYLES.bodyStrong,
            color: "#e2e8f0",
            fontSize: isMobile ? 10 : 11,
            overflow: "hidden",
            textOverflow: "ellipsis"
          }
        }, pair.raw), /*#__PURE__*/React.createElement("div", {
          style: {
            ...TEXT_STYLES.captionStrong,
            marginTop: 1,
            color: Number.isFinite(pair.scoreNum) ? gradeColor(pair.scoreNum) : "#64748b",
            fontSize: isMobile ? 9 : 10
          }
        }, "Score: ", pair.score));
      }
      const value = col.key === "weightedTotal" ? h.weightedTotal?.toFixed(2) ?? "—" : "—";
      const isWeightedTotal = col.key === "weightedTotal";
      return /*#__PURE__*/React.createElement("td", {
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
      }, value);
    }));
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#1e293b",
      borderRadius: 12,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      ...sectionTitleStyle,
      marginBottom: 12
    }
  }, "Weighted Score"), /*#__PURE__*/React.createElement(ResponsiveContainer, {
    width: "100%",
    height: 260
  }, /*#__PURE__*/React.createElement(BarChart, {
    data: overviewRows,
    margin: {
      top: 0,
      right: 0,
      bottom: 50,
      left: 0
    }
  }, /*#__PURE__*/React.createElement(XAxis, {
    dataKey: "short",
    tick: chartXAxisTickStyle,
    angle: -35,
    textAnchor: "end",
    interval: 0,
    height: 60
  }), /*#__PURE__*/React.createElement(YAxis, {
    domain: [0, 100],
    tick: chartYAxisTickStyle
  }), /*#__PURE__*/React.createElement(Tooltip, {
    contentStyle: {
      background: "#1e293b",
      border: "1px solid #334155",
      borderRadius: 8,
      fontFamily: FONT_STACKS.sans
    },
    labelStyle: chartTooltipLabelStyle,
    formatter: (v, n) => [n === "weightedTotal" ? Number(v).toFixed(2) : v, n]
  }), /*#__PURE__*/React.createElement(Bar, {
    dataKey: "weightedTotal",
    radius: [4, 4, 0, 0]
  }, overviewRows.map((h, i) => /*#__PURE__*/React.createElement(Cell, {
    key: h.homeId,
    fill: COLORS[i % COLORS.length]
  })))))));
}
