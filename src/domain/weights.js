import { SAFETY_SCORING_ENABLED } from '../shared/constants.js';

const WEIGHT_KEYS = ["rating", "monthlyPayment", "safety", "sizeValue", "lot", "kitchen", "yard", "ageScore", "masterBed"];
const WEIGHT_LABELS = {
  rating: "Personal Appeal",
  monthlyPayment: "Monthly Payment",
  safety: "Safety",
  sizeValue: "Living Space",
  lot: "Lot",
  kitchen: "Kitchen",
  yard: "Yard",
  ageScore: "Home Age",
  masterBed: "Master Suite",
};
const IMPACT_AUDIT_FACTOR_KEYS = ["rating", "monthlyPayment", "sizeValue", "lot", "kitchen", "yard", "ageScore", "masterBed", "safety"];
const DEFAULT_RAW_WEIGHT_POINTS = { rating: 0.22, monthlyPayment: 0.20, safety: 0.14, sizeValue: 0.20, lot: 0.09, kitchen: 0.05, yard: 0.07, ageScore: 0.08, masterBed: 0.05 };
const MIN_RAW_WEIGHT = 0;
const MAX_RAW_WEIGHT = 0.4;
const RAW_WEIGHT_STEP = 0.005;
const RAW_WEIGHT_EPS = 1e-9;
const MIN_RAW_TICKS = Math.round(MIN_RAW_WEIGHT / RAW_WEIGHT_STEP);
const MAX_RAW_TICKS = Math.round(MAX_RAW_WEIGHT / RAW_WEIGHT_STEP);
const clampRawWeight = (value) => Math.max(MIN_RAW_WEIGHT, Math.min(MAX_RAW_WEIGHT, Number.isFinite(value) ? value : 0));
const clampInt = (value, min, max) => Math.max(min, Math.min(max, value));
const quantizeRawWeight = (value) => {
  const clamped = clampRawWeight(value);
  return +(Math.round(clamped / RAW_WEIGHT_STEP) * RAW_WEIGHT_STEP).toFixed(6);
};
const toRawTicks = (value) => clampInt(Math.round(clampRawWeight(value) / RAW_WEIGHT_STEP), MIN_RAW_TICKS, MAX_RAW_TICKS);
const fromRawTicks = (ticks) => +((ticks * RAW_WEIGHT_STEP).toFixed(6));
const parseMaybeNumber = (value) => {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = String(value).trim().replace(/,/g, "").replace(/\$/g, "").replace(/%/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};
const sanitizeRawWeights = (candidate) =>
  Object.fromEntries(
    WEIGHT_KEYS.map((key) => {
      const fallback = DEFAULT_RAW_WEIGHT_POINTS[key] ?? 0;
      const raw = candidate && typeof candidate === "object" ? parseMaybeNumber(candidate[key]) : null;
      return [key, quantizeRawWeight(raw == null ? fallback : raw)];
    })
  );
const activeDefaultRawTicks = (activeKeys) => activeKeys.reduce((sum, key) => sum + toRawTicks(DEFAULT_RAW_WEIGHT_POINTS[key] ?? 0), 0);
const applyProportionalTickDelta = (ticksByKey, keys, deltaTicks) => {
  const next = { ...ticksByKey };
  let remaining = deltaTicks;
  let guard = 0;
  while (remaining !== 0 && guard++ < 1000) {
    const increasing = remaining > 0;
    const adjustable = keys.filter((key) => (increasing ? next[key] < MAX_RAW_TICKS : next[key] > MIN_RAW_TICKS));
    if (!adjustable.length) break;
    const absRemaining = Math.abs(remaining);
    const caps = adjustable.map((key) => (increasing ? MAX_RAW_TICKS - next[key] : next[key] - MIN_RAW_TICKS));
    const totalCap = caps.reduce((sum, cap) => sum + cap, 0);
    if (totalCap <= 0) break;
    const ideals = caps.map((cap) => (absRemaining * cap) / totalCap);
    const moves = ideals.map((ideal, idx) => Math.min(caps[idx], Math.floor(ideal)));
    let moved = moves.reduce((sum, move) => sum + move, 0);
    let leftover = absRemaining - moved;
    if (leftover > 0) {
      const ranked = adjustable
        .map((key, idx) => ({ idx, frac: ideals[idx] - moves[idx], room: caps[idx] - moves[idx] }))
        .filter((entry) => entry.room > 0)
        .sort((a, b) => (b.frac - a.frac) || (b.room - a.room));
      let r = 0;
      while (leftover > 0 && ranked.length) {
        const slot = ranked[r % ranked.length];
        if (slot.room > 0) {
          moves[slot.idx] += 1;
          slot.room -= 1;
          moved += 1;
          leftover -= 1;
        }
        r += 1;
      }
    }
    if (moved <= 0) {
      moves[0] = 1;
      moved = 1;
    }
    for (let i = 0; i < adjustable.length; i += 1) {
      const key = adjustable[i];
      if (!moves[i]) continue;
      next[key] += increasing ? moves[i] : -moves[i];
    }
    remaining += increasing ? -moved : moved;
  }
  return { ticksByKey: next, unallocated: remaining };
};
const alignActiveRawWeights = (rawWeights, activeKeys, lockedTotalTicks) => {
  const safe = sanitizeRawWeights(rawWeights);
  if (!activeKeys.length) return safe;
  const ticksByKey = Object.fromEntries(activeKeys.map((key) => [key, toRawTicks(safe[key])]));
  const totalTicks = activeKeys.reduce((sum, key) => sum + ticksByKey[key], 0);
  if (totalTicks === lockedTotalTicks) return safe;
  const deltaTicks = lockedTotalTicks - totalTicks;
  const { ticksByKey: adjusted } = applyProportionalTickDelta(ticksByKey, activeKeys, deltaTicks);
  const next = { ...safe };
  activeKeys.forEach((key) => {
    next[key] = fromRawTicks(adjusted[key]);
  });
  return sanitizeRawWeights(next);
};
const rebalanceLinkedRawWeights = (rawWeights, changedKey, targetRawValue, activeKeys, lockedTotalTicks) => {
  const aligned = alignActiveRawWeights(rawWeights, activeKeys, lockedTotalTicks);
  if (!activeKeys.includes(changedKey)) return aligned;
  const others = activeKeys.filter((key) => key !== changedKey);
  const ticksByKey = Object.fromEntries(activeKeys.map((key) => [key, toRawTicks(aligned[key])]));
  if (!others.length) {
    ticksByKey[changedKey] = clampInt(lockedTotalTicks, MIN_RAW_TICKS, MAX_RAW_TICKS);
    return sanitizeRawWeights({ ...aligned, [changedKey]: fromRawTicks(ticksByKey[changedKey]) });
  }
  const othersMinTicks = others.length * MIN_RAW_TICKS;
  const othersMaxTicks = others.length * MAX_RAW_TICKS;
  const minChangedTicks = clampInt(lockedTotalTicks - othersMaxTicks, MIN_RAW_TICKS, MAX_RAW_TICKS);
  const maxChangedTicks = clampInt(lockedTotalTicks - othersMinTicks, MIN_RAW_TICKS, MAX_RAW_TICKS);
  let targetChangedTicks = clampInt(toRawTicks(targetRawValue), minChangedTicks, maxChangedTicks);
  const currentOthersTicks = others.reduce((sum, key) => sum + ticksByKey[key], 0);
  const desiredOthersTicks = lockedTotalTicks - targetChangedTicks;
  const deltaOthersTicks = desiredOthersTicks - currentOthersTicks;
  const { ticksByKey: adjustedOthers } = applyProportionalTickDelta(ticksByKey, others, deltaOthersTicks);
  others.forEach((key) => {
    ticksByKey[key] = adjustedOthers[key];
  });
  const finalOthersTicks = others.reduce((sum, key) => sum + ticksByKey[key], 0);
  targetChangedTicks = clampInt(lockedTotalTicks - finalOthersTicks, minChangedTicks, maxChangedTicks);
  ticksByKey[changedKey] = targetChangedTicks;
  const finalTotalTicks = activeKeys.reduce((sum, key) => sum + ticksByKey[key], 0);
  if (finalTotalTicks !== lockedTotalTicks) {
    const correction = lockedTotalTicks - finalTotalTicks;
    if (correction !== 0) {
      const { ticksByKey: corrected } = applyProportionalTickDelta(ticksByKey, others, correction);
      others.forEach((key) => {
        ticksByKey[key] = corrected[key];
      });
      ticksByKey[changedKey] = clampInt(lockedTotalTicks - others.reduce((sum, key) => sum + ticksByKey[key], 0), minChangedTicks, maxChangedTicks);
    }
  }
  const next = { ...aligned };
  activeKeys.forEach((key) => {
    next[key] = fromRawTicks(ticksByKey[key]);
  });
  return sanitizeRawWeights(next);
};
const normalizeEffectiveWeights = (rawWeights) => {
  const safeRaw = sanitizeRawWeights(rawWeights);
  const enabledEntries = WEIGHT_KEYS.map((key) => [key, (!SAFETY_SCORING_ENABLED && key === "safety") ? 0 : safeRaw[key]]);
  const total = enabledEntries.reduce((sum, [, value]) => sum + value, 0);
  if (total <= 0) {
    const fallback = WEIGHT_KEYS.map((key) => [key, (!SAFETY_SCORING_ENABLED && key === "safety") ? 0 : (DEFAULT_RAW_WEIGHT_POINTS[key] ?? 0)]);
    const fallbackTotal = fallback.reduce((sum, [, value]) => sum + value, 0);
    if (fallbackTotal <= 0) return Object.fromEntries(WEIGHT_KEYS.map((key) => [key, 0]));
    return Object.fromEntries(fallback.map(([key, value]) => [key, value / fallbackTotal]));
  }
  return Object.fromEntries(enabledEntries.map(([key, value]) => [key, value / total]));
};
const isDefaultRawWeights = (rawWeights) =>
  WEIGHT_KEYS.every((key) => {
    const current = Number(rawWeights?.[key] ?? 0);
    const baseline = Number(DEFAULT_RAW_WEIGHT_POINTS[key] ?? 0);
    return Math.abs(current - baseline) < RAW_WEIGHT_EPS;
  });

export {
  WEIGHT_KEYS,
  WEIGHT_LABELS,
  IMPACT_AUDIT_FACTOR_KEYS,
  DEFAULT_RAW_WEIGHT_POINTS,
  MIN_RAW_WEIGHT,
  MAX_RAW_WEIGHT,
  RAW_WEIGHT_STEP,
  RAW_WEIGHT_EPS,
  MIN_RAW_TICKS,
  MAX_RAW_TICKS,
  clampRawWeight,
  clampInt,
  quantizeRawWeight,
  toRawTicks,
  fromRawTicks,
  parseMaybeNumber,
  sanitizeRawWeights,
  activeDefaultRawTicks,
  applyProportionalTickDelta,
  alignActiveRawWeights,
  rebalanceLinkedRawWeights,
  normalizeEffectiveWeights,
  isDefaultRawWeights,
};
