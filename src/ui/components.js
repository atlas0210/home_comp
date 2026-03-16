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
      background: "#0f172a",
      borderRadius: 10,
      padding: "8px 10px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...TEXT_STYLES.eyebrow,
      color: "#64748b"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      ...TEXT_STYLES.bodyStrong,
      color: "#f1f5f9"
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
      height: 7,
      borderRadius: 999,
      overflow: "hidden",
      background: "#0f172a",
      border: "1px solid #1f2937"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${widthPct}%`,
      height: "100%",
      borderRadius: 999,
      background: `linear-gradient(90deg, ${fillColor}aa, ${fillColor})`
    }
  }));
}
export { CardMetric, ScoreBar };
