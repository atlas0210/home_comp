import {
  CURRENT_YEAR,
  DP,
  IMPACT_STRETCH_MAX_SCORE,
  IMPACT_STRETCH_MIN_SCORE,
  PI_FACTOR,
  SAFETY_INDEX_MAX,
  SAFETY_SCORING_ENABLED,
} from '../shared/constants.js';
import { DEFAULT_RAW_WEIGHT_POINTS, normalizeEffectiveWeights } from './weights.js';
import { gradeLabel } from './display.js';
import { toNum } from './records.js';

const interp = (v, pts) => {
  if (!Number.isFinite(v)) return 0;
  const a = [...pts].sort((x, y) => x.value - y.value);
  if (v <= a[0].value) return a[0].score;
  if (v >= a[a.length - 1].value) return a[a.length - 1].score;
  for (let i = 0; i < a.length - 1; i++) {
    const l = a[i];
    const r = a[i + 1];
    if (v >= l.value && v <= r.value) {
      const t = (v - l.value) / (r.value - l.value);
      return l.score + (r.score - l.score) * t;
    }
  }
  return a[a.length - 1].score;
};
const quantile = (sorted, q) => {
  if (!Array.isArray(sorted) || !sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  const t = pos - lo;
  return sorted[lo] * (1 - t) + sorted[hi] * t;
};
const buildRangeContext = (values, opts = {}) => {
  const { minSpread = 1, lowQuantile = 0.1, highQuantile = 0.9 } = opts;
  const nums = (values || []).map((v) => toNum(v)).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!nums.length) return null;
  const qLow = Math.max(0, Math.min(1, toNum(lowQuantile) ?? 0.1));
  const qHigh = Math.max(qLow, Math.min(1, toNum(highQuantile) ?? 0.9));
  const pLow = quantile(nums, qLow);
  const pHigh = quantile(nums, qHigh);
  let low = Number.isFinite(pLow) ? pLow : nums[0];
  let high = Number.isFinite(pHigh) ? pHigh : nums[nums.length - 1];
  if (high - low < minSpread) {
    low = nums[0];
    high = nums[nums.length - 1];
  }
  if (!Number.isFinite(low) || !Number.isFinite(high) || high - low < minSpread) return null;
  return { low, high, min: nums[0], max: nums[nums.length - 1] };
};
const scoreFromContext = (value, ctx, opts = {}) => {
  const { lowerBetter = false, minScore = 30, maxScore = 100, gamma = 0.9 } = opts;
  const v = toNum(value);
  const low = ctx?.low;
  const high = ctx?.high;
  if (!Number.isFinite(v) || !Number.isFinite(low) || !Number.isFinite(high) || high <= low) return null;
  let t = Math.max(0, Math.min(1, (v - low) / (high - low)));
  if (lowerBetter) t = 1 - t;
  const eased = Math.pow(t, gamma);
  return +(minScore + eased * (maxScore - minScore)).toFixed(1);
};
const scoreSqftLegacy = (s) => interp(s, [{ value: 1200, score: 30 }, { value: 1500, score: 50 }, { value: 2000, score: 70 }, { value: 2500, score: 85 }, { value: 3000, score: 100 }]);
const scoreSqft = (s, ctx) => scoreFromContext(s, ctx, { lowerBetter: false, minScore: 30, maxScore: 100, gamma: 0.88 }) ?? scoreSqftLegacy(s);
const scoreLotLegacy = (s) => interp(s, [{ value: 3000, score: 45 }, { value: 5000, score: 65 }, { value: 7500, score: 85 }, { value: 10000, score: 100 }]);
const scoreLot = (s, ctx) => scoreFromContext(s, ctx, { lowerBetter: false, minScore: 30, maxScore: 100, gamma: 0.9 }) ?? scoreLotLegacy(s);
const scoreMasterBedLegacy = (s) => interp(s, [
  { value: 100, score: 20 },
  { value: 120, score: 28 },
  { value: 140, score: 38 },
  { value: 160, score: 50 },
  { value: 180, score: 62 },
  { value: 200, score: 74 },
  { value: 220, score: 84 },
  { value: 240, score: 91 },
  { value: 260, score: 96 },
  { value: 300, score: 100 },
]);
const scoreMasterBed = (s, ctx) => scoreFromContext(s, ctx, { lowerBetter: false, minScore: 20, maxScore: 100, gamma: 0.9 }) ?? scoreMasterBedLegacy(s);
const scoreKitchen = (k) => k === "Gourmet" ? 100 : k === "Large" ? 73 : k === "Medium" ? 47 : 20;
const scoreYard = (y) => y === "Excellent" ? 100 : y === "Good" ? 71 : y === "Fair" ? 43 : 15;
const buildWeightedResult = (vals, weights) => {
  const weightedEntries = Object.entries(weights).filter(([, weight]) => Number.isFinite(toNum(weight)) && toNum(weight) > 0);
  const activeEntries = weightedEntries.filter(([key]) => Number.isFinite(toNum(vals[key])));
  const activeWeightTotal = activeEntries.reduce((sum, [, weight]) => sum + (toNum(weight) ?? 0), 0);
  const contributions = Object.fromEntries(
    weightedEntries.map(([key, weight]) => {
      const value = toNum(vals[key]);
      if (!Number.isFinite(value) || activeWeightTotal <= 0) return [key, null];
      return [key, +((value * ((toNum(weight) ?? 0) / activeWeightTotal)).toFixed(2))];
    })
  );
  const weightedTotal = +Object.values(contributions)
    .reduce((sum, value) => sum + (Number.isFinite(toNum(value)) ? (toNum(value) ?? 0) : 0), 0)
    .toFixed(2);
  return { contributions, weightedTotal };
};
const scoreAgeLegacy = (yearBuilt) => {
  const built = Number.isFinite(yearBuilt) ? yearBuilt : null;
  if (built == null) return 50;
  const age = Math.max(0, CURRENT_YEAR - built);
  return interp(age, [
    { value: 0, score: 100 },
    { value: 5, score: 95 },
    { value: 10, score: 85 },
    { value: 20, score: 70 },
    { value: 30, score: 55 },
    { value: 40, score: 40 },
    { value: 60, score: 20 },
  ]);
};
const scoreAge = (yearBuilt, ctx) => {
  const built = Number.isFinite(yearBuilt) ? yearBuilt : null;
  if (built == null) return 50;
  const ageYears = Math.max(0, CURRENT_YEAR - built);
  return scoreFromContext(ageYears, ctx, { lowerBetter: true, minScore: 20, maxScore: 100, gamma: 1 }) ?? scoreAgeLegacy(yearBuilt);
};
const scoreCombinedRating = (greg, bre, ctx) => {
  const raw = ((greg + bre) / 20) * 100;
  // Use full observed min/max (not p10/p90) so top-end homes do not clip to
  // the same 100 score when their underlying combined ratings differ.
  const low = Number.isFinite(ctx?.min) ? ctx.min : ctx?.low;
  const high = Number.isFinite(ctx?.max) ? ctx.max : ctx?.high;
  if (!Number.isFinite(low) || !Number.isFinite(high) || high <= low) return raw;
  const t = Math.max(0, Math.min(1, (raw - low) / (high - low)));
  const eased = Math.pow(t, 0.8);
  return +(20 + eased * 80).toFixed(1);
};
const scoreMonthlyPaymentLegacy = (m) => interp(m, [{ value: 2600, score: 100 }, { value: 2750, score: 95 }, { value: 2900, score: 85 }, { value: 3050, score: 72 }, { value: 3200, score: 58 }, { value: 3400, score: 42 }, { value: 3600, score: 25 }]);
const scoreMonthlyPayment = (m, ctx) => scoreFromContext(m, ctx, { lowerBetter: true, minScore: 20, maxScore: 100, gamma: 0.9 }) ?? scoreMonthlyPaymentLegacy(m);
const estimateMonthlyTotal = (h) => {
  const price = toNum(h?.price);
  const hoa = toNum(h?.hoa) ?? 0;
  const tax = toNum(h?.tax) ?? 0;
  if (!Number.isFinite(price)) return null;
  const loan = Math.max(price - DP, 0);
  const piMo = Math.round(loan * PI_FACTOR);
  const hoaMo = Math.round(hoa / 12);
  const taxMo = Math.round(tax / 12);
  return Math.round(piMo + hoaMo + taxMo);
};
const safePct = (v) => {
  if (!Number.isFinite(v)) return null;
  const normalized = 100 * (1 - (v / SAFETY_INDEX_MAX));
  return +Math.max(0, Math.min(100, normalized)).toFixed(1);
};
const scoreSafety = (h) => {
  if (!SAFETY_SCORING_ENABLED) return null;
  const parts = [
    { value: safePct(h.safetyAssaultIndex), weight: 0.55 },
    { value: safePct(h.safetyBurglaryIndex), weight: 0.15 },
    { value: safePct(h.safetyLarcenyTheftIndex), weight: 0.15 },
    { value: safePct(h.safetyVehicleTheftIndex), weight: 0.15 },
  ].filter((x) => x.value != null);
  if (!parts.length) return 50;
  const totalWeight = parts.reduce((sum, x) => sum + x.weight, 0);
  const weighted = parts.reduce((sum, x) => sum + x.value * x.weight, 0) / totalWeight;
  return +weighted.toFixed(1);
};

const calc = (h, opts = {}) => {
  const { scoreContexts, masterBedSqftFallback, effectiveWeights } = opts;
  const weights = effectiveWeights && typeof effectiveWeights === "object"
    ? effectiveWeights
    : normalizeEffectiveWeights(DEFAULT_RAW_WEIGHT_POINTS);
  const importDefaultBlankFields = new Set(Array.isArray(h?.importDefaultBlankFields) ? h.importDefaultBlankFields : []);
  const masterBedSqft = Number.isFinite(toNum(h.masterBedSqft))
    ? toNum(h.masterBedSqft)
    : (Number.isFinite(masterBedSqftFallback) ? masterBedSqftFallback : null);
  const loan = Math.max(h.price - DP, 0);
  const piMo = Math.round(loan * PI_FACTOR);
  const hoaMo = Math.round((h.hoa ?? 0) / 12);
  const taxMo = Math.round((h.tax ?? 0) / 12);
  const totalMo = Math.round(piMo + hoaMo + taxMo);
  const sqftScore = scoreSqft(h.sqft, scoreContexts?.sqft);
  const vals = {
    rating: scoreCombinedRating(h.greg, h.bre, scoreContexts?.rating),
    monthlyPayment: scoreMonthlyPayment(totalMo, scoreContexts?.monthly),
    // Size factor now uses total sqft only (PPSF excluded).
    sizeValue: sqftScore,
    sqftScore,
    lot: scoreLot(h.lotSqft, scoreContexts?.lot),
    // Keep backward compatibility with legacy manual condition overrides.
    kitchen: importDefaultBlankFields.has("kitchenSize") ? null : (h.kitchenOverride ?? h.conditionOverride ?? scoreKitchen(h.kitchenSize)),
    yard: importDefaultBlankFields.has("yardCondition") ? null : scoreYard(h.yardCondition),
    ageScore: scoreAge(h.built, scoreContexts?.age),
    safety: scoreSafety(h) ?? 0,
    masterBed: scoreMasterBed(masterBedSqft, scoreContexts?.masterBed),
  };
  const { contributions, weightedTotal } = buildWeightedResult(vals, weights);
  const pricePerSqft = Number.isFinite(h.price) && Number.isFinite(h.sqft) && h.sqft > 0 ? h.price / h.sqft : null;
  return { ...h, masterBedSqft, ...vals, piMo, hoaMo, taxMo, totalMo, pricePerSqft, contributions, weightedTotal, grade: gradeLabel(weightedTotal) };
};
const applyImpactStretch = (home, stretchByKey, weights) => {
  if (!home || !stretchByKey || !Object.keys(stretchByKey).length) return home;
  const next = { ...home };
  for (const [key, range] of Object.entries(stretchByKey)) {
    const raw = toNum(home[key]);
    const min = toNum(range?.min);
    const max = toNum(range?.max);
    if (!Number.isFinite(raw) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) continue;
    const t = Math.max(0, Math.min(1, (raw - min) / (max - min)));
    const stretched = IMPACT_STRETCH_MIN_SCORE + t * (IMPACT_STRETCH_MAX_SCORE - IMPACT_STRETCH_MIN_SCORE);
    next[key] = +stretched.toFixed(1);
  }
  const { contributions, weightedTotal } = buildWeightedResult(next, weights);
  return { ...next, contributions, weightedTotal, grade: gradeLabel(weightedTotal) };
};

export {
  interp,
  quantile,
  buildRangeContext,
  scoreFromContext,
  scoreSqftLegacy,
  scoreSqft,
  scoreLotLegacy,
  scoreLot,
  scoreMasterBedLegacy,
  scoreMasterBed,
  scoreKitchen,
  scoreYard,
  scoreAgeLegacy,
  scoreAge,
  scoreCombinedRating,
  scoreMonthlyPaymentLegacy,
  scoreMonthlyPayment,
  estimateMonthlyTotal,
  safePct,
  scoreSafety,
  calc,
  applyImpactStretch,
};
