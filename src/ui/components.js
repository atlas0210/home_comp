import { React } from '../shared/runtime.js';
import { TEXT_STYLES } from '../shared/uiTokens.js';
import { gradeColor } from '../domain/display.js';
import { toNum } from '../domain/records.js';
function CardMetric({
  label,
  value
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#0d1117",
      borderRadius: 8,
      padding: "8px 10px",
      borderLeft: "2px solid #2d3748"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...TEXT_STYLES.eyebrow,
      color: "#4b5a6e",
      marginBottom: 3
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      ...TEXT_STYLES.bodyStrong,
      color: "#e2e8f0",
      fontSize: 13
    }
  }, value));
}
function ScoreBar({
  value
}) {
  const numericValue = toNum(value);
  const widthPct = Number.isFinite(numericValue) ? Math.max(0, Math.min(100, numericValue)) : 0;
  const fillColor = Number.isFinite(numericValue) ? gradeColor(numericValue) : "#334155";
  return /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    style: {
      height: 6,
      borderRadius: 999,
      overflow: "hidden",
      background: "#0d1117",
      border: "1px solid #1e293b"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${widthPct}%`,
      height: "100%",
      borderRadius: 999,
      background: `linear-gradient(90deg, ${fillColor}88, ${fillColor})`,
      boxShadow: widthPct > 0 ? `0 0 6px ${fillColor}55` : "none"
    }
  }));
}
export { CardMetric, ScoreBar };
