import { CURRENT_YEAR, SAFETY_SCORING_ENABLED } from '../shared/constants.js';
import { PLACEHOLDER_FIELD_LABELS } from '../data/editorConfig.js';
import { toNum } from './records.js';

const RADAR = [["rating","Rating"],["monthlyPayment","Mo Pmt"],["sizeValue","Sqft"],["lot","Lot"],["kitchen","Kitchen"],["yard","Yard"],["ageScore","Age"], ...(!SAFETY_SCORING_ENABLED ? [] : [["safety","Safety"]])];
const fmtUsd = (n, digits = 0) => Number.isFinite(n)
  ? `$${n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
  : null;
const getImageKey = (home) => `${home.homeId}::${home.photo || ""}`;
const CARD_FIELDS = (h) => {
  const ageYears = Number.isFinite(h?.built) ? Math.max(0, CURRENT_YEAR - h.built) : null;
  const rows = [
    // Raw values used by weighted scoring factors.
    ["Price", fmtUsd(h?.price, 0)],
    ["Sqft", Number.isFinite(h?.sqft) ? h.sqft.toLocaleString() : null],
    ["Lot Sqft", Number.isFinite(h?.lotSqft) ? h.lotSqft.toLocaleString() : null],
    ["Kitchen", h?.kitchenSize ?? null],
    ["Yard", h?.yardCondition ?? null],
    ["Greg", Number.isFinite(h?.greg) ? `${h.greg}/10` : null],
    ["Bre", Number.isFinite(h?.bre) ? `${h.bre}/10` : null],
    ["Year Built", Number.isFinite(h?.built) ? String(h.built) : null],
    ["Home Age", Number.isFinite(ageYears) ? `${ageYears} yrs` : null],
    ["HOA (Annual)", fmtUsd(h?.hoa, 0)],
    ["Tax (Annual)", fmtUsd(h?.tax, 2)],
    // Monthly payment calculation components.
    ["P&I", fmtUsd(h?.piMo, 0)],
    ["Tax/Mo", fmtUsd(h?.taxMo, 0)],
    ["HOA/Mo", fmtUsd(h?.hoaMo, 0)],
    ["Monthly Total", fmtUsd(h?.totalMo, 0)],
  ];
  if (SAFETY_SCORING_ENABLED) {
    rows.push(
      ["Assault Index", Number.isFinite(h?.safetyAssaultIndex) ? String(h.safetyAssaultIndex) : null],
      ["Burglary Index", Number.isFinite(h?.safetyBurglaryIndex) ? String(h.safetyBurglaryIndex) : null],
      ["Larceny/Theft Index", Number.isFinite(h?.safetyLarcenyTheftIndex) ? String(h.safetyLarcenyTheftIndex) : null],
      ["Vehicle Theft Index", Number.isFinite(h?.safetyVehicleTheftIndex) ? String(h.safetyVehicleTheftIndex) : null]
    );
  }
  return rows.filter(([, value]) => value != null && value !== "" && value !== "N/A" && value !== "—");
};
const SCORED_FACTOR_BASE = [
  { key: "rating", label: "Personal Appeal", minWidth: 150, mobileMinWidth: 132 },
  { key: "monthlyPayment", label: "Monthly", minWidth: 140, mobileMinWidth: 124 },
  { key: "sizeValue", label: "Size", minWidth: 130, mobileMinWidth: 116 },
  { key: "lot", label: "Lot", minWidth: 126, mobileMinWidth: 112 },
  { key: "kitchen", label: "Kitchen", minWidth: 130, mobileMinWidth: 116 },
  { key: "yard", label: "Yard", minWidth: 126, mobileMinWidth: 112 },
  { key: "ageScore", label: "Age", minWidth: 130, mobileMinWidth: 116 },
  { key: "masterBed", label: "Master Bed", minWidth: 142, mobileMinWidth: 124 },
  { key: "safety", label: "Safety", minWidth: 130, mobileMinWidth: 116 },
];

const arraysEqual = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);
const displayFieldValue = (v) => {
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (v == null || v === "") return "—";
  return String(v);
};
const displayHoaFieldValue = (annualValue) => {
  const annual = toNum(annualValue);
  if (!Number.isFinite(annual)) return "—";
  return `${fmtUsd(annual / 12, 2)}/mo (${fmtUsd(annual, 2)}/yr)`;
};

const PLACEHOLDER_FIELD_LABELS_LOCAL = PLACEHOLDER_FIELD_LABELS;
const placeholderLabel = (fieldKey) => PLACEHOLDER_FIELD_LABELS_LOCAL[fieldKey] ?? fieldKey;
const getMissingFields = (home) => {
  if (home && Object.prototype.hasOwnProperty.call(home, "blankFields")) {
    return Array.isArray(home.blankFields) ? home.blankFields : [];
  }
  const legacy = Array.isArray(home?.placeholderFields) ? home.placeholderFields : [];
  return legacy;
};
const placeholderSummary = (home, limit = 3) => {
  const fields = getMissingFields(home);
  if (!fields.length) return "Complete";
  const labels = fields.slice(0, limit).map(placeholderLabel);
  const extra = fields.length - labels.length;
  return `${labels.join(", ")}${extra > 0 ? ` +${extra} more` : ""}`;
};

function fmt(n) {
  return (n == null ? "?" : "$" + n.toLocaleString());
}
function fmtCompactUsd(n) {
  return n == null || !Number.isFinite(n) ? "—" : "$" + Math.round(n).toLocaleString();
}
const gradeColor = (s) => s >= 85 ? "#16a34a" : s >= 80 ? "#22c55e" : s >= 75 ? "#84cc16" : s >= 70 ? "#eab308" : s >= 65 ? "#f59e0b" : "#f97316";
const gradeLabel = (s) => s >= 85 ? "A — Excellent" : s >= 80 ? "A-" : s >= 75 ? "B+" : s >= 70 ? "B" : s >= 65 ? "C+" : "C — Fair";

export {
  RADAR,
  fmtUsd,
  getImageKey,
  CARD_FIELDS,
  SCORED_FACTOR_BASE,
  arraysEqual,
  displayFieldValue,
  displayHoaFieldValue,
  placeholderLabel,
  getMissingFields,
  placeholderSummary,
  fmt,
  fmtCompactUsd,
  gradeColor,
  gradeLabel,
};
