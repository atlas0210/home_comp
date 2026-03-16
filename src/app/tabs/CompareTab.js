import { React, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, Tooltip, Legend } from '../../shared/runtime.js';
import { EMPTY } from '../../shared/constants.js';
import { TEXT_STYLES } from '../../shared/uiTokens.js';
import { getMissingFields, placeholderSummary } from '../../domain/display.js';
export default function CompareTab(props) {
  const {
    labelTextStyle,
    selectStyle,
    compareHomesPool,
    compareA,
    setCompareA,
    compareB,
    setCompareB,
    compareC,
    setCompareC,
    captionTextStyle,
    rawRadarData,
    weightedRadarData,
    a,
    b,
    c,
    chartXAxisTickStyle,
    chartTooltipLabelStyle,
    chartLegendStyle,
    chartLegendFormatter,
    cardTitleStyle,
    compareTableStyle,
    compareHeaderCellStyle,
    compareHeaderColors,
    compareMetricCellStyle,
    compareViewModel,
    compareValueCellStyle,
    compareScoreCellStyle,
    FONT_STACKS,
    pick
  } = props;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: FONT_STACKS.sans
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
      gap: 12,
      marginBottom: 12
    }
  }, [["A", compareA, setCompareA, "#6366f1"], ["B", compareB, setCompareB, "#f59e0b"], ["C", compareC, setCompareC, "#22c55e"]].map(([label, val, setter, color]) => {
    const slotHome = pick(val, null);
    const missingCount = slotHome ? getMissingFields(slotHome).length : 0;
    return /*#__PURE__*/React.createElement("div", {
      key: label,
      style: {
        background: "#1e293b",
        borderRadius: 12,
        padding: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...labelTextStyle,
        color,
        marginBottom: 6
      }
    }, "Home ", label), /*#__PURE__*/React.createElement("select", {
      value: val,
      onChange: e => setter(e.target.value),
      style: selectStyle
    }, /*#__PURE__*/React.createElement("option", {
      value: EMPTY
    }, "Blank"), compareHomesPool.map(h => /*#__PURE__*/React.createElement("option", {
      key: h.homeId,
      value: h.homeId
    }, h.name))), slotHome && /*#__PURE__*/React.createElement("div", {
      style: {
        ...TEXT_STYLES.caption,
        marginTop: 8,
        color: missingCount ? "#fbbf24" : "#64748b"
      }
    }, missingCount ? `Missing ${missingCount}: ${placeholderSummary(slotHome)}` : "No missing fields"));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))",
      gap: 12,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#1e293b",
      borderRadius: 12,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...cardTitleStyle,
      marginBottom: 4
    }
  }, "Raw Score Radar"), /*#__PURE__*/React.createElement("div", {
    style: {
      ...captionTextStyle,
      marginBottom: 6
    }
  }, "Each axis uses the raw factor score (0-100)."), /*#__PURE__*/React.createElement(ResponsiveContainer, {
    width: "100%",
    height: 340
  }, /*#__PURE__*/React.createElement(RadarChart, {
    data: rawRadarData
  }, /*#__PURE__*/React.createElement(PolarGrid, {
    stroke: "#334155"
  }), /*#__PURE__*/React.createElement(PolarAngleAxis, {
    dataKey: "subject",
    tick: chartXAxisTickStyle
  }), /*#__PURE__*/React.createElement(Tooltip, {
    formatter: v => {
      const n = typeof v === "number" ? v : Number(v);
      return [Number.isFinite(n) ? n.toFixed(2) : "—", "Raw Score"];
    },
    contentStyle: {
      background: "#1e293b",
      border: "1px solid #334155",
      borderRadius: 8,
      fontFamily: FONT_STACKS.sans
    },
    labelStyle: chartTooltipLabelStyle
  }), a && /*#__PURE__*/React.createElement(Radar, {
    name: a.short,
    dataKey: "a",
    stroke: "#6366f1",
    fill: "#6366f1",
    fillOpacity: 0.16
  }), b && /*#__PURE__*/React.createElement(Radar, {
    name: b.short,
    dataKey: "b",
    stroke: "#f59e0b",
    fill: "#f59e0b",
    fillOpacity: 0.14
  }), c && /*#__PURE__*/React.createElement(Radar, {
    name: c.short,
    dataKey: "c",
    stroke: "#22c55e",
    fill: "#22c55e",
    fillOpacity: 0.12
  }), /*#__PURE__*/React.createElement(Legend, {
    wrapperStyle: chartLegendStyle,
    formatter: chartLegendFormatter
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#1e293b",
      borderRadius: 12,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...cardTitleStyle,
      marginBottom: 4
    }
  }, "Weighted Impact Radar"), /*#__PURE__*/React.createElement("div", {
    style: {
      ...captionTextStyle,
      marginBottom: 6
    }
  }, "Each axis uses weighted contribution points (score x effective weight)."), /*#__PURE__*/React.createElement(ResponsiveContainer, {
    width: "100%",
    height: 340
  }, /*#__PURE__*/React.createElement(RadarChart, {
    data: weightedRadarData
  }, /*#__PURE__*/React.createElement(PolarGrid, {
    stroke: "#334155"
  }), /*#__PURE__*/React.createElement(PolarAngleAxis, {
    dataKey: "subject",
    tick: chartXAxisTickStyle
  }), /*#__PURE__*/React.createElement(Tooltip, {
    formatter: v => {
      const n = typeof v === "number" ? v : Number(v);
      return [Number.isFinite(n) ? `${n.toFixed(2)} pts` : "—", "Weighted Impact"];
    },
    contentStyle: {
      background: "#1e293b",
      border: "1px solid #334155",
      borderRadius: 8,
      fontFamily: FONT_STACKS.sans
    },
    labelStyle: chartTooltipLabelStyle
  }), a && /*#__PURE__*/React.createElement(Radar, {
    name: `${a.short} (pts)`,
    dataKey: "a",
    stroke: "#6366f1",
    fill: "#6366f1",
    fillOpacity: 0.16
  }), b && /*#__PURE__*/React.createElement(Radar, {
    name: `${b.short} (pts)`,
    dataKey: "b",
    stroke: "#f59e0b",
    fill: "#f59e0b",
    fillOpacity: 0.14
  }), c && /*#__PURE__*/React.createElement(Radar, {
    name: `${c.short} (pts)`,
    dataKey: "c",
    stroke: "#22c55e",
    fill: "#22c55e",
    fillOpacity: 0.12
  }), /*#__PURE__*/React.createElement(Legend, {
    wrapperStyle: chartLegendStyle,
    formatter: chartLegendFormatter
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#1e293b",
      borderRadius: 12,
      padding: 16,
      overflowX: "auto"
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: compareTableStyle
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: {
      ...compareHeaderCellStyle,
      textAlign: "left",
      color: "#94a3b8"
    }
  }, "Metric"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...compareHeaderCellStyle,
      color: compareHeaderColors[0]
    }
  }, a?.short ?? "Blank"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...compareHeaderCellStyle,
      color: compareHeaderColors[1]
    }
  }, b?.short ?? "Blank"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...compareHeaderCellStyle,
      color: compareHeaderColors[2]
    }
  }, c?.short ?? "Blank"))), /*#__PURE__*/React.createElement("tbody", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    style: compareMetricCellStyle
  }, "Weighted Score"), compareViewModel.weightedTotals.map((value, i) => {
    const isBest = Number.isFinite(value) && Number.isFinite(compareViewModel.bestWeightedScore) && value === compareViewModel.bestWeightedScore;
    return /*#__PURE__*/React.createElement("td", {
      key: `weighted-${i}`,
      style: {
        fontFamily: FONT_STACKS.sans,
        padding: "8px 6px",
        textAlign: "right",
        borderTop: "1px solid #334155",
        color: "#f1f5f9",
        fontWeight: isBest ? 800 : 700,
        background: isBest ? "#33415555" : "transparent"
      }
    }, Number.isFinite(value) ? value.toFixed(2) : "—");
  })), compareViewModel.factors.map(row => {
    return /*#__PURE__*/React.createElement("tr", {
      key: row.key
    }, /*#__PURE__*/React.createElement("td", {
      style: compareMetricCellStyle
    }, row.label), row.pairs.map((pair, i) => {
      const scoreNum = pair?.scoreNum;
      const isBest = Number.isFinite(scoreNum) && Number.isFinite(row.bestScore) && scoreNum === row.bestScore;
      return /*#__PURE__*/React.createElement("td", {
        key: `${row.key}-${i}`,
        style: {
          fontFamily: FONT_STACKS.sans,
          padding: "8px 6px",
          textAlign: "right",
          borderTop: "1px solid #334155",
          background: isBest ? "#33415555" : "transparent"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: compareValueCellStyle
      }, pair?.raw ?? "—"), /*#__PURE__*/React.createElement("div", {
        style: {
          ...compareScoreCellStyle,
          color: "#94a3b8",
          fontWeight: 700
        }
      }, "Score: ", pair?.score ?? "—"));
    }));
  })))));
}
