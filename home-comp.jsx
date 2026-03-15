import { useEffect, useMemo, useRef, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, RadarChart, Radar, PolarGrid, PolarAngleAxis, Legend, Cell } from "recharts";

const DP = 80000;
const MORTGAGE_RATE_ANNUAL = 0.065;
const MORTGAGE_TERM_MONTHS = 360;
const PI_FACTOR = (() => {
  const monthlyRate = MORTGAGE_RATE_ANNUAL / 12;
  const growth = Math.pow(1 + monthlyRate, MORTGAGE_TERM_MONTHS);
  return (monthlyRate * growth) / (growth - 1);
})();
const MERIDIAN_RANCH_HOA_ANNUAL = 230 * 12;
const CURRENT_YEAR = new Date().getFullYear();
const ADDRESS_BLOCK_REGEX = /(?:^|\n)\s*(\d{3,6}\s+[^\n]+?(?:CO|Colorado)\s+\d{5}(?:-\d{4})?)/g;
const TAX_RATE_BY_ZIP = {
  "80831": 0.0047,
  "80908": 0.0047,
  "80915": 0.0039,
  "80918": 0.0033,
  "80920": 0.0041,
  "80922": 0.0038,
  "80923": 0.0037,
  "80924": 0.0059,
  "80927": 0.0076,
};
const DEFAULT_TAX_RATE = 0.0047;
const SAFETY_SCORING_ENABLED = false;
const SAFETY_INDEX_MAX = 200;
const PLACEHOLDER_TAGS_ENABLED = false;
const IMPACT_AUDIT_THRESHOLD = 3.0;
const IMPACT_STRETCH_MIN_SCORE = 20;
const IMPACT_STRETCH_MAX_SCORE = 100;
const EMPTY = "__none__";
const DOM_ROLL_DATE_KEY = "homeComp.domRollDate.v1";

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
const EDIT_GROUPS = [
  {
    title: "Identity",
    fields: [
      { key: "name", label: "Address / Name", type: "text" },
      { key: "short", label: "Short Name", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Considering", "Ruled Out", "Sold"] },
      { key: "photo", label: "Photo URL", type: "text" },
    ],
  },
  {
    title: "Core Pricing / Size",
    fields: [
      { key: "price", label: "Price", type: "number" },
      { key: "pricePerSqft", label: "PPSF", type: "number" },
      { key: "sqft", label: "Sqft", type: "number" },
      { key: "lotSqft", label: "Lot Sqft", type: "number" },
      { key: "masterBedSqft", label: "Master Bed Sqft", type: "number" },
      { key: "built", label: "Year Built", type: "number" },
      { key: "dom", label: "Days On Market", type: "number" },
    ],
  },
  {
    title: "Costs",
    fields: [{ key: "hoa", label: "HOA (Monthly, auto-converts)", type: "number" }],
  },
  {
    title: "Ratings / Preferences",
    fields: [
      { key: "greg", label: "Greg (0-10)", type: "number" },
      { key: "bre", label: "Bre (0-10)", type: "number" },
      { key: "kitchenSize", label: "Kitchen Size", type: "select", options: ["Small", "Medium", "Large", "Gourmet"] },
      { key: "yardCondition", label: "Yard Condition", type: "select", options: ["Poor", "Fair", "Good", "Excellent"] },
    ],
  },
  {
    title: "Safety",
    fields: [
      { key: "safetyNeighborhood", label: "Safety Area", type: "text" },
      { key: "safetyGrade", label: "Safety Grade", type: "text" },
      { key: "safetyAssaultIndex", label: "Assault Index", type: "number" },
      { key: "safetyBurglaryIndex", label: "Burglary Index", type: "number" },
      { key: "safetyLarcenyTheftIndex", label: "Larceny/Theft Index", type: "number" },
      { key: "safetyVehicleTheftIndex", label: "Vehicle Theft Index", type: "number" },
    ],
  },
  {
    title: "Tags / Notes",
    fields: [{ key: "tags", label: "Tags", type: "tags" }],
  },
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

const homesRaw = [
  { name:"8091 Parsonage Lane", short:"8091 Parsonage", status:"Considering", photo:"https://www.compass.com/m/9ada19d681290ef7e9420f4760e9e2f463348c3c_img_0_a01d9/origin.webp", price:479000, sqft:2204, lotSqft:7153, built:2006, hoa:0, tax:2400, dom:44, greg:6, bre:6, kitchenSize:"Medium", yardCondition:"Good", aestheticsRating:0, neighborhood:72, safetyNeighborhood:"Claremont Ranch", safetyGrade:"A+", safetyAssaultIndex:9, safetyBurglaryIndex:53, safetyLarcenyTheftIndex:18, safetyVehicleTheftIndex:39, tags:["Kitchen medium","Yard good","Neighborhood 72","Safety: Claremont Ranch"] },
  { name:"6229 Dancing Water Drive", short:"6229 Dancing", status:"Ruled Out", photo:"https://property-images.realgeeks.com/coppa/6648478bdd4fa582896eb38b1306e4ec.jpg", price:485000, sqft:2792, lotSqft:7300, built:2014, hoa:0, tax:3582, dom:34, greg:6.5, bre:5, kitchenSize:"Large", yardCondition:"Good", aestheticsRating:0, neighborhood:60, safetyNeighborhood:"Fountain Valley Ranch (Fountain proxy)", safetyGrade:"A", safetyAssaultIndex:35, safetyBurglaryIndex:68, safetyLarcenyTheftIndex:55, safetyVehicleTheftIndex:94, tags:["DQ: Fountain safety concern","Kitchen large","Yard good","Neighborhood 60","Safety proxy: Fountain"] },
  { name:"10012 Emerald Vista Drive", short:"10012 Emerald", status:"Ruled Out", photo:"https://images-listings.century21.com/CO_PPAR/42/28/13/7/_P/4228137_P00.jpg?format=webp&quality=70&width=1200", price:507000, sqft:3004, lotSqft:8070, built:2018, hoa:2772, tax:3369, dom:86, greg:8.5, bre:8, kitchenSize:"Large", yardCondition:"Excellent", aestheticsRating:0, neighborhood:95, tags:["Kitchen large","Yard excellent","Neighborhood 95","Hot tub","Solar","Community pool"] },
  { name:"12726 Morning Breeze Way", short:"12726 Morning", status:"Considering", photo:"https://photos.zillowstatic.com/fp/6fc114e66c86ddf60ff5c1e544130e60-cc_ft_960.jpg", price:484900, sqft:2416, lotSqft:6799, built:2018, hoa:91, tax:3503, dom:12, greg:5, bre:4, kitchenSize:"Large", yardCondition:"Poor", aestheticsRating:0, neighborhood:85, safetyNeighborhood:"Falcon / Woodmen Hills area (proxy)", safetyGrade:"A", safetyAssaultIndex:41, safetyBurglaryIndex:103, safetyLarcenyTheftIndex:41, safetyVehicleTheftIndex:53, tags:["Kitchen large","Yard poor","Artificial turf","Neighborhood 85","Safety proxy: Falcon / Woodmen Hills"] },
  { name:"10135 Kings Canyon Drive", short:"10135 Kings", status:"Considering", photo:"https://ppar-photos.s3.amazonaws.com/photos/4081318-1.jpg", price:510000, sqft:3109, lotSqft:6454, built:2003, hoa:2820, tax:3254, dom:99, greg:9, bre:8.5, kitchenSize:"Large", yardCondition:"Excellent", aestheticsRating:0, neighborhood:90, safetyNeighborhood:"Meridian Ranch", safetyGrade:"A+", safetyAssaultIndex:11, safetyBurglaryIndex:16, safetyLarcenyTheftIndex:9, safetyVehicleTheftIndex:18, tags:["Kitchen large","Yard excellent","Neighborhood 90","Safety: Meridian Ranch"] },
  { name:"9403 St George Road", short:"9403 St George", status:"Sold", photo:"https://photos.zillowstatic.com/fp/100c606b4a052f5b818d59fdea87d793-cc_ft_960.jpg", price:515000, sqft:3552, lotSqft:7444, built:2006, hoa:2340, tax:2361, dom:36, greg:7, bre:6, kitchenSize:"Large", yardCondition:"Excellent", aestheticsRating:0, neighborhood:80, safetyNeighborhood:"Woodmen Hills (proxy stats)", safetyGrade:"A", safetyAssaultIndex:41, safetyBurglaryIndex:103, safetyLarcenyTheftIndex:41, safetyVehicleTheftIndex:53, tags:["Pending","Kitchen large","Yard excellent","Neighborhood 80","Firepit","Washer/dryer","Safety proxy: Woodmen Hills"] },
  { name:"4195 Greens Drive", short:"4195 Greens", status:"Considering", photo:"https://cdn02.deltamediagroup.com/listing_photos/active/18463/184628534/1.jpg?hash=68d62892a6d9468f2baf3bc5adbf52a4", price:520000, sqft:2842, lotSqft:6971, built:2001, hoa:3600, tax:1433, dom:19, greg:6.5, bre:5.5, kitchenSize:"Gourmet", yardCondition:"Fair", aestheticsRating:0, neighborhood:65, safetyNeighborhood:"Springs Ranch", safetyGrade:"A+", safetyAssaultIndex:14, safetyBurglaryIndex:46, safetyLarcenyTheftIndex:67, safetyVehicleTheftIndex:53, tags:["Kitchen gourmet","Yard fair","Neighborhood 65","Golf access","Community pool","Safety: Springs Ranch"] },
  { name:"9534 Feathergrass Drive", short:"9534 Feather", status:"Considering", photo:"https://cdn02.deltamediagroup.com/listing_photos/active/18406/184055125/1.jpg?hash=35304503ab84dabc4b869e41dc6a5d6b", price:515000, sqft:2647, lotSqft:4956, built:2023, hoa:400, tax:4554, dom:46, greg:4, bre:4, kitchenSize:"Large", yardCondition:"Good", aestheticsRating:0, neighborhood:75, safetyNeighborhood:"Banning Lewis Ranch", safetyGrade:"A", safetyAssaultIndex:120, safetyBurglaryIndex:58, safetyLarcenyTheftIndex:31, safetyVehicleTheftIndex:144, tags:["Kitchen large","Yard good","Neighborhood 75","Solar","HOA unconfirmed","Safety: Banning Lewis Ranch"] },
  { name:"765 Piros Drive", short:"765 Piros", status:"Considering", photo:"https://www.compass.com/m/666cae37c59317f19fdfc172c7b3d09c2c6823a6_img_0_31458/origin.webp", price:525000, sqft:2960, lotSqft:7000, built:1995, hoa:304, tax:1812.3, dom:9, greg:6.5, bre:8, kitchenSize:"Large", yardCondition:"Good", aestheticsRating:0, neighborhood:80, safetyNeighborhood:"Springs Ranch proxy", safetyGrade:"A+", safetyAssaultIndex:14, safetyBurglaryIndex:46, safetyLarcenyTheftIndex:67, safetyVehicleTheftIndex:53, tags:["Greenhouse","Shed","Gas fireplace","Mountain views","Office with French doors","Composite deck","Safety proxy: Springs Ranch"] },
  { name:"6709 Showhorse Court", short:"6709 Showhorse", status:"Considering", photo:"./assets/showhorse.png", price:499900, sqft:3440, lotSqft:7635, built:2000, hoa:3600, tax:2003.52, dom:47, greg:6.5, bre:7.5, kitchenSize:"Large", yardCondition:"Good", aestheticsRating:0, neighborhood:70, safetyNeighborhood:"Springs Ranch / Island at Springs Ranch", safetyGrade:"A+", safetyAssaultIndex:14, safetyBurglaryIndex:46, safetyLarcenyTheftIndex:67, safetyVehicleTheftIndex:53, tags:["Pikes Peak views","Finished basement","Wet bar","HOA includes lawn care","Exterior paint every 7–8 years","Snow removal","Trash","Safety: Springs Ranch"] },
  { name:"7352 Candelabra Drive", short:"7352 Candelabra", status:"Ruled Out", photo:"./assets/candelabra.png", price:519500, sqft:3093, lotSqft:8726, built:2005, hoa:0, tax:4450.34, dom:5, greg:8, bre:7.5, kitchenSize:"Large", yardCondition:"Good", aestheticsRating:0, neighborhood:70, safetyNeighborhood:"Widefield", safetyGrade:"A+", safetyAssaultIndex:21, safetyBurglaryIndex:72, safetyLarcenyTheftIndex:31, safetyVehicleTheftIndex:56, tags:["Safety: Widefield"] },
];

const IMPORT_UNFORMATTED_DATA = String.raw`
6380 Tenderfoot Drive Colorado Springs, CO 80923-7436
MLS #3917272
For Sale
$550,000
Price per Sq Ft.: $213
Size: 2,584 sqft
Lot Size Area: 6,541.00 sqft
Year Built: 2010
Days on OneHome: 16
HOA Fee: $225 Annually
Annual Taxes: $2,635.22
Subdivision: Indigo Ranch at Stetson Ridge

9095 Vanderwood Road Colorado Springs, CO 80908-5657
MLS #5994546
For Sale
$550,000
Price per Sq Ft.: $168
Size: 3,277 sqft
Lot Size Area: 5,567.00 sqft
Year Built: 2016
Days on OneHome: 34
HOA Fee: $326 Annually
Annual Taxes: $3,648.7
Subdivision: Trails At Forest Meadows

9416 Wolf Pack Terrace Colorado Springs, CO 80920-7678
MLS #6172323
For Sale
$550,000
Price per Sq Ft.: $219
Size: 2,506 sqft
Lot Size Area: 6,566.00 sqft
Year Built: 2003
Days on OneHome: 38
Annual Taxes: $2,124.83
Subdivision: Gatehouse Village At Briargate

8375 Winding Passage Drive Colorado Springs, CO 80924-8115
MLS #8202865
For Sale
$550,000
Price per Sq Ft.: $215
Size: 2,555 sqft
Lot Size Area: 7,037.00 sqft
Year Built: 2004
Days on OneHome: 92
HOA Fee: $35 Monthly
Annual Taxes: $3,072.28
Subdivision: Westcreek At Wolf Ranch

7660 Bullet Road Peyton, CO 80831
MLS #3822228
For Sale
$550,000
Price per Sq Ft.: $179
Size: 3,071 sqft
Lot Size Area: 26,400.00 sqft
Year Built: 1999
Days on OneHome: 134
Annual Taxes: $2,708.85
Subdivision: Woodmen Hills

7527 Colorado Tech Drive Colorado Springs, CO 80915-2037
MLS #6303123
For Sale
$549,999
Price per Sq Ft.: $163
Size: 3,367 sqft
Lot Size Area: 5,653.00 sqft
Year Built: 2014
Days on OneHome: 1
HOA Fee: $472 Annually
Annual Taxes: $2,407.55
Subdivision: Wilshire

6241 Donahue Drive Colorado Springs, CO 80923-7665
MLS #9020481
For Sale
$545,000
Price per Sq Ft.: $177
Size: 3,084 sqft
Lot Size Area: 5,500.00 sqft
Year Built: 2014
Days on OneHome: 27
Annual Taxes: $3,053.75
Subdivision: Dublin North

9729 Porch Swing Lane Peyton, CO 80831-4611
MLS #8141032
For Sale
$545,000
Price per Sq Ft.: $171
Size: 3,178 sqft
Lot Size Area: 7,726.00 sqft
Year Built: 2020
Days on OneHome: 34
HOA Fee: $120 Annually
Annual Taxes: $4,126.3
Subdivision: Windingwalk At Meridian Ranch

7160 Red Cardinal Loop Colorado Springs, CO 80908
MLS #9617623
For Sale
$545,000
Price per Sq Ft.: $184
Size: 2,968 sqft
Lot Size Area: 0.16 acres
Year Built: 2013
Days on OneHome: 55
HOA Fee: $70 Quarterly
Annual Taxes: $3,360.87
Subdivision: Forest Meadows

9962 Hidden Ranch Court Peyton, CO 80831-6530
MLS #1957788
For Sale
$544,999
Price per Sq Ft.: $213
Size: 2,556 sqft
Lot Size Area: 7,026.00 sqft
Year Built: 2022
Days on OneHome: 84
HOA Fee: $70 Monthly
Annual Taxes: $3,901.81
Subdivision: Stonebridge At Meridian Ranch

8014 Noble Fir Court Colorado Springs, CO 80927-4040
MLS #5252348
For Sale
$540,000
Price per Sq Ft.: $185
Size: 2,923 sqft
Lot Size Area: 4,842.00 sqft
Year Built: 2008
Days on OneHome: 29
Annual Taxes: $4,000.91
Subdivision: Banning Lewis Ranch

6731 Granite Peak Drive Colorado Springs, CO 80923
MLS #5703873
For Sale
$540,000
Price per Sq Ft.: $149
Size: 3,621 sqft
Lot Size Area: 0.22 acres
Year Built: 2000
Days on OneHome: 56
Annual Taxes: $1,892
Subdivision: Antelope Creek

5236 Stone Fence Drive Colorado Springs, CO 80922-3643
MLS #9798133
For Sale
$535,750
Price per Sq Ft.: $183
Size: 2,927 sqft
Lot Size Area: 10,005.00 sqft
Year Built: 2003
Days on OneHome: 3
Annual Taxes: $2,036.37
Subdivision: Stetson Ridge South

8261 Cypress Wood Drive Colorado Springs, CO 80927-4072
MLS #7099195
For Sale
$535,000
Price per Sq Ft.: $202
Size: 2,645 sqft
Lot Size Area: 3,200.00 sqft
Year Built: 2015
Days on OneHome: 6
Annual Taxes: $3,445.86
Subdivision: Banning Lewis Ranch

9222 Pacific Crest Drive Colorado Springs, CO 80927-4166
MLS #1506020
For Sale
$535,000
Price per Sq Ft.: $214
Size: 2,497 sqft
Lot Size Area: 4,500.00 sqft
Year Built: 2017
Days on OneHome: 21
Annual Taxes: $2,983.06
Subdivision: Banning Lewis Ranch

13256 Park Meadows Drive Peyton, CO 80831-4150
MLS #4495204
For Sale
$535,000
Price per Sq Ft.: $185
Size: 2,892 sqft
Lot Size Area: 6,768.00 sqft
Year Built: 2016
Days on OneHome: 94
HOA Fee: $210 Monthly
Annual Taxes: $3,263.41
Subdivision: Meridian Ranch

7784 Frigid Air Point Colorado Springs, CO 80908
MLS #4539098
For Sale
$530,000
Price per Sq Ft.: $180
Size: 2,943 sqft
Lot Size Area: 6,903.00 sqft
Year Built: 2022
Days on OneHome: 37
HOA Fee: $143 Monthly
Annual Taxes: $3,091.9
Subdivision: The Nook at Shiloh Mesa

5002 Sand Ripples Lane Colorado Springs, CO 80922-3566
MLS #1217348
For Sale
$530,000
Price per Sq Ft.: $172
Size: 3,083 sqft
Lot Size Area: 7,133.00 sqft
Year Built: 2003
Days on OneHome: 169
Annual Taxes: $1,902.78
Subdivision: Willowind at Stetson Hills

14020 Nichlas Court Colorado Springs, CO 80921-3307
MLS #3921720
For Sale
$529,900
Price per Sq Ft.: $171
Size: 3,102 sqft
Lot Size Area: 6,158.00 sqft
Year Built: 1995
Days on OneHome: 9
HOA Fee: $100 Monthly
Annual Taxes: $2,715.6
Subdivision: Muirfield

7713 Blue Vail Way Colorado Springs, CO 80922-6309
MLS #6334289
For Sale
$527,000
Price per Sq Ft.: $202
Size: 2,611 sqft
Lot Size Area: 15.00 acres
Year Built: 2006
HOA Fee: $462 Annually
Annual Taxes: $2,369.71
Subdivision: Eastview Estates

10247 Hidden Park Way Peyton, CO 80831-8353
MLS #9271246
For Sale
$530,000
Price per Sq Ft.: $185
Size: 2,871 sqft
Lot Size Area: 6,949.00 sqft
Year Built: 2017
Days on OneHome: 5
HOA Fee: $100 Annually
Annual Taxes: $3,072.22
Subdivision: Meridian Ranch

5860 Drifter Street Colorado Springs, CO 80918-5250
MLS #5900154
For Sale
$550,000
Price per Sq Ft.: $186
Size: 2,962 sqft
Lot Size Area: 7,425.00 sqft
Year Built: 1998
Days on OneHome: --
HOA Fee: $485 Annually
Annual Taxes: $1,882.9
Subdivision: Sierra Ridge

4735 Seton Place Colorado Springs, CO 80918-5230
MLS #1627467
For Sale
$550,000
Price per Sq Ft.: $190
Size: 2,892 sqft
Lot Size Area: 8,322.00 sqft
Year Built: 1996
Days on OneHome: 7
Annual Taxes: $1,992
Subdivision: Sierra Ridge

7662 Camille Court Colorado Springs, CO 80908-4715
MLS #1196446
For Sale
$499,900
Price per Sq Ft.: $158
Size: 3,162 sqft
Lot Size Area: 7,127.00 sqft
Year Built: 2016
Days on OneHome: --
HOA Fee: $130 Quarterly
Annual Taxes: $2,589.62
Subdivision: Forest Meadows

4255 Gracewood Drive Colorado Springs, CO 80920-6600
MLS #6832828
For Sale
$545,000
Price per Sq Ft.: $175
Size: 3,119 sqft
Lot Size Area: 4,950.00 sqft
Year Built: 1998
Days on OneHome: --
Annual Taxes: $1,858.09
Subdivision: Woodside At Briargate

11908 Eagle Crest Ct Peyton, CO 80831
For Sale
$449,000
Size: 2,418 sqft
Lot Size Area: 6,486.00 sqft
Year Built: 2016
Days on OneHome: 1
HOA Fee: $120 Monthly
Annual Taxes: $3,133
Subdivision: Meridian Ranch Filing No 4b

11310 Scenic Brush Dr Peyton, CO 80831
For Sale
$472,299
Size: 1,986 sqft
Lot Size Area: 5,497.00 sqft
Year Built: 2016
Days on OneHome: 29
Annual Taxes: $5,401
Subdivision: Scenic View At Paint Brush Hills
`;
const APPLIED_UPDATES_BY_HOME_ID = {
"imported-mls-1217348": {
      "photo": "https://photos.zillowstatic.com/fp/4f7e5d5681bb4c5eb423702cc9817763-cc_ft_768.webp",
      "lotSqft": 7133,
      "masterBedSqft": 195,
      "hoa": 1,
      "safetyAssaultIndex": 29,
      "safetyBurglaryIndex": 43,
      "safetyLarcenyTheftIndex": 73,
      "safetyVehicleTheftIndex": 65,
      "kitchenSize": "Large",
      "yardCondition": "Poor",
      "greg": 6,
      "bre": 5.5,
      "dom": 170
    },
    "imported-mls-5703873": {
      "photo": "https://photos.zillowstatic.com/fp/d384490c138682b7d2cf5f009a39a793-cc_ft_768.webp",
      "safetyAssaultIndex": 17,
      "safetyBurglaryIndex": 43,
      "safetyLarcenyTheftIndex": 69,
      "safetyVehicleTheftIndex": 45,
      "lotSqft": 9583.2,
      "masterBedSqft": 216,
      "yardCondition": "Fair",
      "kitchenSize": "Small",
      "greg": 5.1,
      "bre": 5.1,
      "hoa": 0.1,
      "dom": 57
    },
    "imported-mls-9798133": {
      "photo": "https://m1.cbhomes.com/p/723/9798133/E633205A44524b2/pdl23tp.webp",
      "safetyAssaultIndex": 29,
      "safetyBurglaryIndex": 43,
      "safetyLarcenyTheftIndex": 73,
      "safetyVehicleTheftIndex": 65,
      "greg": 7.5,
      "bre": 7,
      "lotSqft": 10005,
      "masterBedSqft": 270,
      "kitchenSize": "Large",
      "hoa": 0.1,
      "dom": 4
    },
    "imported-mls-3921720": {
      "photo": "https://photos.zillowstatic.com/fp/e50f9224bf21b296c8dd839bdaeec569-cc_ft_768.webp",
      "safetyAssaultIndex": 44,
      "safetyBurglaryIndex": 16,
      "safetyLarcenyTheftIndex": 7,
      "safetyVehicleTheftIndex": 28,
      "masterBedSqft": 234,
      "yardCondition": "Poor",
      "status": "Ruled Out",
      "dom": 10
    },
    "imported-mls-6334289": {
      "photo": "https://photos.zillowstatic.com/fp/988e32754c3777ea63d0ad90115f2427-cc_ft_768.webp",
      "safetyAssaultIndex": 29,
      "safetyBurglaryIndex": 43,
      "safetyLarcenyTheftIndex": 73,
      "safetyVehicleTheftIndex": 65,
      "greg": 8.5,
      "bre": 8,
      "kitchenSize": "Large",
      "lotSqft": 6600,
      "masterBedSqft": 221,
      "yardCondition": "Excellent",
      "dom": 2,
      "hoa": 5460
    },
    "imported-mls-6303123": {
      "photo": "https://photos.zillowstatic.com/fp/daf82f01b0b552aa9e427283e0a13975-cc_ft_768.webp",
      "safetyAssaultIndex": 81,
      "safetyBurglaryIndex": 93,
      "safetyLarcenyTheftIndex": 95,
      "safetyVehicleTheftIndex": 103,
      "bre": 8,
      "greg": 8,
      "kitchenSize": "Large",
      "lotSqft": 5653,
      "yardCondition": "Excellent",
      "hoa": 5844,
      "dom": 2
    },
    "imported-mls-9020481": {
      "photo": "https://photos.zillowstatic.com/fp/3ea4319389898d77b2818302c3045f1e-cc_ft_768.webp",
      "safetyAssaultIndex": 17,
      "safetyBurglaryIndex": 43,
      "safetyLarcenyTheftIndex": 69,
      "safetyVehicleTheftIndex": 45,
      "greg": 7,
      "kitchenSize": "Gourmet",
      "yardCondition": "Poor",
      "bre": 8,
      "lotSqft": 5500,
      "hoa": 0.1,
      "dom": 28,
      "masterBedSqft": 210
    },
    "imported-mls-3822228": {
      "photo": "https://photos.zillowstatic.com/fp/a8901e94f5dc1f0d07b26369c9383b4e-cc_ft_768.webp",
      "safetyAssaultIndex": 39,
      "safetyBurglaryIndex": 93,
      "safetyLarcenyTheftIndex": 6,
      "safetyVehicleTheftIndex": 27,
      "greg": 7,
      "bre": 8,
      "lotSqft": 26400,
      "kitchenSize": "Gourmet",
      "hoa": 0.1,
      "dom": 135
    },
    "imported-mls-9617623": {
      "photo": "https://photos.zillowstatic.com/fp/650549673f773fb6eba4dd73bfd4bcd0-cc_ft_768.webp",
      "safetyAssaultIndex": 32,
      "safetyBurglaryIndex": 39,
      "safetyLarcenyTheftIndex": 6,
      "safetyVehicleTheftIndex": 16,
      "kitchenSize": "Large",
      "greg": 7.5,
      "safetyGrade": "A+",
      "bre": 7.5,
      "lotSqft": 6969.6,
      "hoa": 720,
      "dom": 56
    },
    "imported-mls-4539098": {
      "photo": "https://photos.zillowstatic.com/fp/0406ecef6e38fdf5e432c00ecea7f925-cc_ft_768.webp",
      "safetyAssaultIndex": 32,
      "safetyBurglaryIndex": 39,
      "safetyLarcenyTheftIndex": 6,
      "safetyVehicleTheftIndex": 16,
      "kitchenSize": "Gourmet",
      "yardCondition": "Poor",
      "greg": 6.5,
      "bre": 7,
      "lotSqft": 6903,
      "dom": 38
    },
    "imported-mls-5252348": {
      "photo": "https://photos.zillowstatic.com/fp/e5b3fa77e284e6e146a1bda01e9af36d-cc_ft_768.webp",
      "safetyAssaultIndex": 119,
      "safetyBurglaryIndex": 58,
      "safetyLarcenyTheftIndex": 31,
      "safetyVehicleTheftIndex": 143,
      "yardCondition": "Poor",
      "status": "Ruled Out",
      "dom": 30
    },
    "imported-mls-8141032": {
      "photo": "https://photos.zillowstatic.com/fp/57f78ba0a74446b85d75f2e200d0ab02-cc_ft_768.webp",
      "safetyAssaultIndex": 39,
      "safetyBurglaryIndex": 93,
      "safetyLarcenyTheftIndex": 6,
      "safetyVehicleTheftIndex": 27,
      "lotSqft": 7726,
      "bre": 7,
      "greg": 6,
      "kitchenSize": "Gourmet",
      "yardCondition": "Fair",
      "hoa": 2820,
      "dom": 35,
      "masterBedSqft": 210
    },
    "imported-mls-5994546": {
      "photo": "https://photos.zillowstatic.com/fp/d73dbd5febbfa14c16e5ee8c29d131ba-cc_ft_768.webp",
      "safetyAssaultIndex": 32,
      "safetyBurglaryIndex": 39,
      "safetyLarcenyTheftIndex": 6,
      "safetyVehicleTheftIndex": 16,
      "bre": 8,
      "lotSqft": 5567,
      "greg": 7.5,
      "yardCondition": "Fair",
      "kitchenSize": "Large",
      "hoa": 3240,
      "dom": 35,
      "masterBedSqft": 210
    },
    "imported-mls-7099195": {
      "photo": "https://photos.zillowstatic.com/fp/6e64b983593dc9d72d51df095798e29d-cc_ft_768.webp",
      "safetyAssaultIndex": 119,
      "safetyBurglaryIndex": 58,
      "safetyLarcenyTheftIndex": 31,
      "safetyVehicleTheftIndex": 143,
      "lotSqft": 3200,
      "masterBedSqft": 221,
      "kitchenSize": "Large",
      "greg": 7,
      "bre": 7.5,
      "hoa": 0.1,
      "dom": 7
    },
    "imported-mls-1506020": {
      "photo": "https://photos.zillowstatic.com/fp/3f2b7a9d1615fe35ed59762feac28bf0-cc_ft_768.webp",
      "safetyAssaultIndex": 119,
      "safetyBurglaryIndex": 58,
      "safetyLarcenyTheftIndex": 31,
      "safetyVehicleTheftIndex": 143,
      "lotSqft": 4500,
      "greg": 6.5,
      "bre": 6,
      "kitchenSize": "Large",
      "yardCondition": "Fair",
      "hoa": 0.1,
      "dom": 22
    },
    "imported-mls-6172323": {
      "photo": "https://photos.zillowstatic.com/fp/bcb00ad016484524c4518a4d524b2c3a-cc_ft_768.webp",
      "safetyGrade": "A+",
      "safetyAssaultIndex": 34,
      "safetyBurglaryIndex": 38,
      "safetyLarcenyTheftIndex": 81,
      "safetyVehicleTheftIndex": 62,
      "lotSqft": 6566,
      "greg": 8.5,
      "kitchenSize": "Large",
      "bre": 8,
      "hoa": 0.1,
      "dom": 39,
      "status": "Ruled Out"
    },
    "imported-mls-3917272": {
      "photo": "https://photos.zillowstatic.com/fp/ba30eb1e84d265737fd1969c37582516-cc_ft_768.webp",
      "safetyGrade": "A+",
      "safetyAssaultIndex": 17,
      "safetyBurglaryIndex": 43,
      "safetyLarcenyTheftIndex": 69,
      "safetyVehicleTheftIndex": 45,
      "lotSqft": 6541,
      "yardCondition": "Excellent",
      "greg": 6.5,
      "kitchenSize": "Large",
      "bre": 7.5,
      "dom": 17,
      "masterBedSqft": 210
    },
    "imported-mls-4495204": {
      "photo": "https://photos.zillowstatic.com/fp/998a67e0f3e799aaf40b57faeaa26d2f-cc_ft_768.webp",
      "safetyGrade": "A+",
      "safetyAssaultIndex": 39,
      "safetyBurglaryIndex": 93,
      "safetyLarcenyTheftIndex": 6,
      "safetyVehicleTheftIndex": 27,
      "lotSqft": 6768,
      "masterBedSqft": 169,
      "greg": 8.5,
      "bre": 8.5,
      "kitchenSize": "Large",
      "yardCondition": "Excellent",
      "hoa": 1200,
      "dom": 95
    },
    "imported-mls-8202865": {
      "photo": "https://photos.zillowstatic.com/fp/9a9a260e1c23dc6b907a3b7eb381e6cd-sc_1344_896.webp",
      "safetyGrade": "A+",
      "safetyAssaultIndex": 17,
      "safetyBurglaryIndex": 23,
      "safetyLarcenyTheftIndex": 18,
      "safetyVehicleTheftIndex": 24,
      "lotSqft": 7037,
      "greg": 6.5,
      "bre": 6,
      "dom": 93,
      "masterBedSqft": 304
    },
    "imported-mls-1957788": {
      "photo": "https://photos.zillowstatic.com/fp/fbb76144febf1fd6548a22dc5104c950-cc_ft_768.webp",
      "safetyGrade": "A+",
      "safetyAssaultIndex": 39,
      "safetyBurglaryIndex": 93,
      "safetyLarcenyTheftIndex": 6,
      "safetyVehicleTheftIndex": 27,
      "lotSqft": 7026,
      "bre": 8.5,
      "greg": 8,
      "kitchenSize": "Gourmet",
      "yardCondition": "Excellent",
      "hoa": 816,
      "dom": 85,
      "masterBedSqft": 182
    },
    "imported-mls-5900154": {
      "photo": "https://photos.zillowstatic.com/fp/26ec4bdc0d474d53235ccdf1dc581340-cc_ft_1152.webp",
      "hoa": 5820,
      "lotSqft": 7425,
      "greg": 9,
      "bre": 8.5,
      "kitchenSize": "Large",
      "yardCondition": "Excellent",
      "dom": 2
    },
    "base-4": {
      "bre": 9,
      "dom": 104,
      "masterBedSqft": 234
    },
    "base-8": {
      "bre": 6.5,
      "dom": 10,
      "masterBedSqft": 198
    },
    "imported-mls-9271246": {
      "lotSqft": 6949,
      "masterBedSqft": 169,
      "bre": 8.5,
      "greg": 7,
      "kitchenSize": "Large",
      "yardCondition": "Excellent",
      "photo": "https://photos.zillowstatic.com/fp/2f052ee2a9c8428b171c1de924612d53-cc_ft_768.webp",
      "hoa": 2760,
      "dom": 6
    },
    "imported-mls-6832828": {
      "lotSqft": 4950,
      "dom": 2,
      "hoa": 0.1,
      "bre": 8,
      "kitchenSize": "Large",
      "yardCondition": "Poor",
      "greg": 7.5,
      "photo": "https://photos.zillowstatic.com/fp/adef1e965cdaec161c76af235c8c6cbe-cc_ft_768.webp"
    },
    "imported-mls-1196446": {
      "lotSqft": 7127,
      "masterBedSqft": 210,
      "bre": 8.75,
      "kitchenSize": "Gourmet",
      "dom": 2,
      "greg": 8.5,
      "photo": "https://photos.zillowstatic.com/fp/46b62c34617fd37782dbfbf641fe9d12-cc_ft_768.webp",
      "hoa": 396
    },
    "imported-mls-1627467": {
      "hoa": 0.1,
      "lotSqft": 8322,
      "masterBedSqft": 204,
      "yardCondition": "Fair",
      "bre": 7.5,
      "greg": 7.5,
      "photo": "https://photos.zillowstatic.com/fp/a748b00d13b77dee1fe0f25e2ec3042c-cc_ft_768.webp",
      "dom": 8
    },
    "imported-addr-11908-eagle-crest-ct-peyton-co-80831": {
      "lotSqft": 6486,
      "greg": 7.5,
      "bre": 8,
      "kitchenSize": "Large",
      "hoa": 2760,
      "dom": 2,
      "masterBedSqft": 182
    },
    "imported-addr-11310-scenic-brush-dr-peyton-co-80831": {
      "bre": 7,
      "greg": 6,
      "kitchenSize": "Large",
      "yardCondition": "Fair",
      "lotSqft": 5662.8,
      "hoa": 1.2,
      "dom": 30,
      "masterBedSqft": 195
    },
    "base-0": {
      "dom": 45,
      "masterBedSqft": 195
    },
    "base-1": {
      "dom": 35
    },
    "base-2": {
      "dom": 87
    },
    "base-3": {
      "dom": 13,
      "masterBedSqft": 224
    },
    "base-5": {
      "dom": 37
    },
    "base-6": {
      "dom": 20,
      "masterBedSqft": 180
    },
    "base-7": {
      "dom": 47,
      "masterBedSqft": 208
    },
    "base-9": {
      "dom": 48,
      "masterBedSqft": 266
    },
    "base-10": {
      "dom": 6
    }
};
const DEFAULT_EDITABLE_KEYS = [
  "name",
  "short",
  "status",
  "photo",
  "price",
  "pricePerSqft",
  "sqft",
  "masterBedSqft",
  "lotSqft",
  "built",
  "dom",
  "hoa",
  "tax",
  "greg",
  "bre",
  "kitchenSize",
  "yardCondition",
  "neighborhood",
  "aestheticsRating",
  "safetyNeighborhood",
  "safetyGrade",
  "safetyAssaultIndex",
  "safetyBurglaryIndex",
  "safetyLarcenyTheftIndex",
  "safetyVehicleTheftIndex",
  "tags",
];
const STATUS_VALUES = new Set(["Considering", "Ruled Out", "Sold"]);
const KITCHEN_VALUES = new Set(["Small", "Medium", "Large", "Gourmet"]);
const YARD_VALUES = new Set(["Poor", "Fair", "Good", "Excellent"]);
const mergeOverrides = (seed, incoming) => {
  const merged = {};
  const apply = (src) => {
    if (!src || typeof src !== "object") return;
    Object.entries(src).forEach(([homeId, values]) => {
      if (!values || typeof values !== "object") return;
      merged[homeId] = { ...(merged[homeId] ?? {}), ...values };
    });
  };
  apply(seed);
  apply(incoming);
  return merged;
};
const PLACEHOLDER_FIELD_LABELS = {
  price: "Price",
  sqft: "Sqft",
  masterBedSqft: "Master Bed Sqft",
  lotSqft: "Lot Sqft",
  built: "Year Built",
  dom: "Days on Market",
  hoa: "HOA (Monthly Input)",
  tax: "Annual Taxes",
  greg: "Greg Rating",
  bre: "Bre Rating",
  kitchenSize: "Kitchen Size",
  yardCondition: "Yard Condition",
  safetyAssaultIndex: "Assault Index",
  safetyBurglaryIndex: "Burglary Index",
  safetyLarcenyTheftIndex: "Larceny/Theft Index",
  safetyVehicleTheftIndex: "Vehicle Theft Index",
};
const placeholderLabel = (fieldKey) => PLACEHOLDER_FIELD_LABELS[fieldKey] ?? fieldKey;
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
const ppsfToPrice = (pricePerSqft, sqft) => (Number.isFinite(pricePerSqft) && Number.isFinite(sqft) && sqft > 0 ? pricePerSqft * sqft : null);
const toNum = (v) => {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  const cleaned = s.replace(/,/g, "").replace(/\$/g, "").replace(/%/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};
const hoaAnnualToMonthly = (annualValue) => {
  const annual = toNum(annualValue);
  if (!Number.isFinite(annual)) return null;
  return +(annual / 12).toFixed(2);
};
const hoaMonthlyToAnnual = (monthlyValue) => {
  const monthly = toNum(monthlyValue);
  if (!Number.isFinite(monthly)) return null;
  return +(monthly * 12).toFixed(2);
};
const parseLotSqft = (value) => {
  if (value == null) return null;
  const raw = String(value);
  const n = toNum(raw);
  if (n == null) return null;
  if (/acre/i.test(raw)) return Math.round(n * 43560);
  return n;
};
const toDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const parseDateKey = (value) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return new Date(year, month - 1, day);
};
const dayDiff = (fromKey, toKey) => {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  if (!from || !to) return 0;
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.max(0, Math.floor((toUtc - fromUtc) / 86400000));
};
const extractZip = (...values) => {
  const combined = values.filter((v) => typeof v === "string" && v.trim()).join(" ");
  if (!combined) return null;
  const stateMatch = combined.match(/(?:\bCO\b|\bColorado\b)\s+(\d{5})(?:-\d{4})?\b/i);
  if (stateMatch?.[1]) return stateMatch[1];
  const matches = [...combined.matchAll(/\b(\d{5})(?:-\d{4})?\b/g)].map((m) => m[1]);
  return matches.length ? matches[matches.length - 1] : null;
};
const pickText = (...vals) => vals.find((v) => typeof v === "string" && v.trim())?.trim() ?? "";
const derivedShort = (name, fallbackIndex) => {
  const s = pickText(name);
  if (!s) return `Home ${fallbackIndex + 1}`;
  const words = s.split(/\s+/).slice(0, 2);
  return words.join(" ");
};
const asStatus = (v) => {
  const s = pickText(v);
  return STATUS_VALUES.has(s) ? s : "Considering";
};
const asKitchen = (v) => {
  const s = pickText(v);
  return KITCHEN_VALUES.has(s) ? s : "Medium";
};
const asYard = (v) => {
  const s = pickText(v);
  return YARD_VALUES.has(s) ? s : "Good";
};
const asTags = (v) => {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string") return v.split(",").map((x) => x.trim()).filter(Boolean);
  return [];
};
const slugify = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const fromAnnual = (value, cadence) => {
  const n = toNum(value);
  if (n == null) return null;
  const c = (cadence || "").toLowerCase();
  if (c.startsWith("month")) return n * 12;
  if (c.startsWith("quarter")) return n * 4;
  return n;
};
function normalizeHomeRecord(home, index) {
  const placeholderFields = [];
  const isImported = home?.sourceType === "imported";
  const overrideKeys = Array.isArray(home?._overrideKeys) ? home._overrideKeys : [];
  const hasOverride = (key) => overrideKeys.includes(key);
  const name = pickText(home.name, home.address, home.streetAddress);
  const short = pickText(home.short) || derivedShort(name, index);

  const sqft = toNum(home.sqft ?? home.size ?? home.aboveGradeFinishedArea) ?? 2500;
  if (toNum(home.sqft ?? home.size ?? home.aboveGradeFinishedArea) == null) placeholderFields.push("sqft");

  const parsedLotSqft = parseLotSqft(home.lotSqft ?? home.lotSizeArea ?? home.lotSize);
  const lotSqft = parsedLotSqft ?? 6000;
  if (
    parsedLotSqft == null ||
    (isImported && lotSqft === 6000 && !hasOverride("lotSqft"))
  ) placeholderFields.push("lotSqft");

  const parsedPpsf = toNum(home.pricePerSqft ?? home.ppsf ?? home.price_per_sqft);
  const parsedPrice = toNum(home.price ?? home.listPrice ?? home.list_price) ?? ppsfToPrice(parsedPpsf, sqft) ?? 550000;
  if (toNum(home.price ?? home.listPrice ?? home.list_price) == null && ppsfToPrice(parsedPpsf, sqft) == null) placeholderFields.push("price");

  const built = toNum(home.built ?? home.yearBuilt ?? home.year_built) ?? 2010;
  if (toNum(home.built ?? home.yearBuilt ?? home.year_built) == null) placeholderFields.push("built");

  const dom = toNum(home.dom ?? home.daysOnMarket ?? home.days_on_onehome) ?? 0;
  if (toNum(home.dom ?? home.daysOnMarket ?? home.days_on_onehome) == null) placeholderFields.push("dom");

  const parsedHoa = toNum(home.hoa ?? home.hoaAnnual ?? home.hoa_fee_annual);
  const meridianSignal = [
    pickText(home.safetyNeighborhood, home.subdivision, home.mlsAreaMinor),
    Array.isArray(home.tags) ? home.tags.join(" ") : "",
  ].join(" ");
  const isMeridianRanch = /meridian ranch/i.test(meridianSignal);
  let hoa = parsedHoa ?? 0;
  if (isMeridianRanch && parsedHoa == null) {
    // Realtor-confirmed rule: Meridian Ranch HOA is ~ $230/month.
    hoa = MERIDIAN_RANCH_HOA_ANNUAL;
    placeholderFields.push("hoa");
  }

  const zipCode = extractZip(
    pickText(home.zip, home.zipCode, home.postalCode),
    pickText(home.name, home.address, home.streetAddress)
  );
  const zipTaxRate = zipCode ? TAX_RATE_BY_ZIP[zipCode] : null;
  const appliedTaxRate = Number.isFinite(zipTaxRate) ? zipTaxRate : DEFAULT_TAX_RATE;
  const parsedTax = toNum(home.tax ?? home.annualTax ?? home.annual_taxes);
  const tax = Number.isFinite(parsedTax)
    ? parsedTax
    : Number.isFinite(parsedPrice)
      ? +(parsedPrice * appliedTaxRate).toFixed(2)
      : 3000;

  const parsedGreg = toNum(home.greg);
  const greg = parsedGreg ?? 5;
  if (
    parsedGreg == null ||
    (isImported && greg === 5 && !hasOverride("greg"))
  ) placeholderFields.push("greg");

  const parsedBre = toNum(home.bre);
  const bre = parsedBre ?? 5;
  if (
    parsedBre == null ||
    (isImported && bre === 5 && !hasOverride("bre"))
  ) placeholderFields.push("bre");

  const neighborhood = toNum(home.neighborhood) ?? 70;

  const aestheticsRating = toNum(home.aestheticsRating ?? home.aesthetics) ?? 5;

  const safetyAssaultIndex = toNum(home.safetyAssaultIndex ?? home.assaultIndex);
  if (SAFETY_SCORING_ENABLED && safetyAssaultIndex == null) placeholderFields.push("safetyAssaultIndex");

  const safetyBurglaryIndex = toNum(home.safetyBurglaryIndex ?? home.burglaryIndex);
  if (SAFETY_SCORING_ENABLED && safetyBurglaryIndex == null) placeholderFields.push("safetyBurglaryIndex");

  const safetyLarcenyTheftIndex = toNum(home.safetyLarcenyTheftIndex ?? home.larcenyTheftIndex);
  if (SAFETY_SCORING_ENABLED && safetyLarcenyTheftIndex == null) placeholderFields.push("safetyLarcenyTheftIndex");

  const safetyVehicleTheftIndex = toNum(home.safetyVehicleTheftIndex ?? home.vehicleTheftIndex);
  if (SAFETY_SCORING_ENABLED && safetyVehicleTheftIndex == null) placeholderFields.push("safetyVehicleTheftIndex");

  const status = asStatus(home.status);
  const kitchenSize = asKitchen(home.kitchenSize);
  if (
    !pickText(home.kitchenSize) ||
    (isImported && kitchenSize === "Medium" && !hasOverride("kitchenSize"))
  ) placeholderFields.push("kitchenSize");
  const yardCondition = asYard(home.yardCondition);
  if (
    !pickText(home.yardCondition) ||
    (isImported && yardCondition === "Good" && !hasOverride("yardCondition"))
  ) placeholderFields.push("yardCondition");
  const tags = asTags(home.tags);
  const defaultedFields = [...new Set(placeholderFields)];
  const normalized = {
    ...home,
    name: name || `Imported Home ${index + 1}`,
    short,
    status,
    photo: pickText(home.photo) || null,
    price: parsedPrice,
    sqft,
    lotSqft,
    built,
    dom,
    hoa,
    tax,
    greg,
    bre,
    kitchenSize,
    yardCondition,
    neighborhood,
    aestheticsRating,
    safetyNeighborhood: pickText(home.safetyNeighborhood) || null,
    safetyGrade: pickText(home.safetyGrade) || null,
    safetyAssaultIndex,
    safetyBurglaryIndex,
    safetyLarcenyTheftIndex,
    safetyVehicleTheftIndex,
    tags,
    // Recompute placeholders from current values (including overrides) so they
    // disappear as soon as a field is filled in.
    placeholderFields: PLACEHOLDER_TAGS_ENABLED ? defaultedFields : [],
    defaultedFields,
  };
  const blankTrackKeys = Object.keys(PLACEHOLDER_FIELD_LABELS);
  const hasSeededBlankFields = Array.isArray(home?.blankFields);
  const blankSet = new Set(hasSeededBlankFields ? home.blankFields : []);
  for (const key of blankTrackKeys) {
    if (!SAFETY_SCORING_ENABLED && key.startsWith("safety")) continue;
    const rawValue = home?.[key];
    const isBlank = rawValue == null || (typeof rawValue === "string" && rawValue.trim() === "");
    const explicitOverride = hasOverride(key);
    if (explicitOverride) {
      if (isBlank) blankSet.add(key);
      else blankSet.delete(key);
      continue;
    }
    // First normalization pass (no seeded blanks): derive from raw source.
    if (!hasSeededBlankFields) {
      if (isBlank) blankSet.add(key);
      else blankSet.delete(key);
    }
    // Subsequent passes keep seeded blank flags until user fills them.
  }
  const blankFields = [...blankSet];
  return {
    ...normalized,
    blankFields,
  };
}
function parseUnformattedHomes(rawText) {
  const raw = typeof rawText === "string" ? rawText.trim() : "";
  if (!raw) return { blockCount: 0, homes: [], unknownFieldCount: 0 };

  ADDRESS_BLOCK_REGEX.lastIndex = 0;
  const matches = [...raw.matchAll(ADDRESS_BLOCK_REGEX)];
  if (!matches.length) return { blockCount: 0, homes: [], unknownFieldCount: 0 };

  const blocks = matches.map((m, i) => {
    const start = m.index + m[0].length - m[1].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : raw.length;
    return { address: m[1].trim(), body: raw.slice(start, end) };
  });

  let unknownFieldCount = 0;
  const homes = blocks.map(({ address, body }) => {
    const capture = (re) => (body.match(re)?.[1] ?? "").trim();
    const mls = capture(/MLS\s*#\s*([0-9]+)/i);
    const price = toNum(capture(/For Sale[\s\S]*?\$([0-9,]+(?:\.[0-9]+)?)/i) || capture(/List Price:\s*\$([0-9,]+(?:\.[0-9]+)?)/i));
    const ppsf = toNum(capture(/Price per Sq\s*Ft\.?:\s*\$([0-9,]+(?:\.[0-9]+)?)/i));
    const sqft = toNum(capture(/Size[\s:]*([0-9,]+(?:\.[0-9]+)?)\s*sqft/i) || capture(/Above Grade Finished Area:\s*([0-9,]+(?:\.[0-9]+)?)\s*sqft/i));
    const lotRaw = capture(/Lot Size Area:\s*([0-9,.]+\s*(?:sqft|acres))/i);
    const built = toNum(capture(/Year Built:\s*([0-9]{4})/i));
    const dom = toNum(capture(/Days on OneHome[\s:]*([0-9]+)/i));
    const hoaRaw = capture(/HOA Fee:\s*\$([0-9,]+(?:\.[0-9]+)?)\s*(Monthly|Annually|Quarterly)?/i);
    const hoaCadence = (body.match(/HOA Fee:\s*\$[0-9,]+(?:\.[0-9]+)?\s*(Monthly|Annually|Quarterly)?/i)?.[1] ?? "").trim();
    const tax = toNum(capture(/Annual Taxes:\s*\$([0-9,]+(?:\.[0-9]+)?)/i));
    const neighborhood = capture(/Subdivision:\s*([^\n]+)/i);
    const assaultIndex = toNum(
      capture(/(?:Safety\s*)?(?:Assault|Violent Crime)(?:\s*Index)?\s*[:=]\s*([0-9,]+(?:\.[0-9]+)?)/i) ||
      capture(/(?:safetyAssaultIndex|assaultIndex)\s*[:=]\s*([0-9,]+(?:\.[0-9]+)?)/i)
    );
    const burglaryIndex = toNum(
      capture(/(?:Safety\s*)?Burglary(?:\s*Index)?\s*[:=]\s*([0-9,]+(?:\.[0-9]+)?)/i) ||
      capture(/(?:safetyBurglaryIndex|burglaryIndex)\s*[:=]\s*([0-9,]+(?:\.[0-9]+)?)/i)
    );
    const larcenyTheftIndex = toNum(
      capture(/(?:Safety\s*)?Larceny(?:\s*\/\s*|\s+and\s+)?Theft(?:\s*Index)?\s*[:=]\s*([0-9,]+(?:\.[0-9]+)?)/i) ||
      capture(/(?:safetyLarcenyTheftIndex|larcenyTheftIndex)\s*[:=]\s*([0-9,]+(?:\.[0-9]+)?)/i)
    );
    const vehicleTheftIndex = toNum(
      capture(/(?:Safety\s*)?Vehicle Theft(?:\s*Index)?\s*[:=]\s*([0-9,]+(?:\.[0-9]+)?)/i) ||
      capture(/(?:safetyVehicleTheftIndex|vehicleTheftIndex)\s*[:=]\s*([0-9,]+(?:\.[0-9]+)?)/i)
    );
    const safetyNeighborhood = capture(/Safety (?:Area|Neighborhood):\s*([^\n]+)/i);

    const knownKeySet = new Set([
      "Type", "Year Built", "Lot Size Area", "Parking Spots", "Heating", "Cooling", "HOA Fee", "County/Parish",
      "Subdivision", "Status", "Beds", "Baths", "Full Bathrooms", "Three-Quarter Bathrooms", "Half Bathrooms",
      "Size", "Above Grade Finished Area", "Total Building Area", "Building Area Source", "Stories", "Interior Features",
      "Basement", "% Basement Finished", "Flooring", "Window Features", "Fireplace", "Number of Fireplaces", "Appliances",
      "Rooms Total", "Property Type", "Style", "Lot Features", "Garage/Parking Features", "Exterior Features", "Fencing",
      "Patio and Porch", "View", "Utilities", "Construction Materials", "Roof", "Foundation Details", "Property Attached",
      "Property Condition", "Association Name", "Association Fee Includes", "List Price", "Price per Sq Ft.", "Exclusions",
      "Special Listing Conditions", "Directions", "Listing Terms", "Zoning", "Possession", "Disclosures", "Tax ID",
      "Tax Year", "Annual Taxes", "Tax Legal Description", "Location", "MLS Area Minor", "Postal City", "Elementary Schools",
      "Middle School", "High Schools", "Unified School District"
    ]);
    const fieldLines = body.split("\n").map((line) => line.trim()).filter(Boolean);
    unknownFieldCount += fieldLines
      .map((line) => line.match(/^([A-Za-z0-9\-\/& %\.\(\)]+):\s*/)?.[1])
      .filter((k) => k && !knownKeySet.has(k)).length;

    return normalizeHomeRecord(
      {
        name: address,
        short: derivedShort(address, 0),
        status: "Considering",
        price,
        pricePerSqft: ppsf,
        sqft,
        lotSqft: parseLotSqft(lotRaw),
        built,
        dom,
        hoa: fromAnnual(hoaRaw, hoaCadence),
        tax,
        kitchenSize: "Medium",
        yardCondition: "Good",
        neighborhood: neighborhood ? 70 : null,
        safetyNeighborhood: safetyNeighborhood || neighborhood || null,
        assaultIndex,
        burglaryIndex,
        larcenyTheftIndex,
        vehicleTheftIndex,
        tags: [neighborhood && `Subdivision: ${neighborhood}`].filter(Boolean),
        mlsId: mls || null,
        sourceKey: mls ? `mls-${mls}` : `addr-${slugify(address)}`,
      },
      0
    );
  });

  return { blockCount: blocks.length, homes, unknownFieldCount };
}

function splitImportBlocks(rawText) {
  const raw = typeof rawText === "string" ? rawText.trim() : "";
  if (!raw) return [];
  ADDRESS_BLOCK_REGEX.lastIndex = 0;
  const matches = [...raw.matchAll(ADDRESS_BLOCK_REGEX)];
  if (!matches.length) return [];
  return matches.map((m, i) => {
    const start = m.index + m[0].length - m[1].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : raw.length;
    const block = raw.slice(start, end).trim();
    const mls = block.match(/MLS\s*#\s*([0-9]+)/i)?.[1]?.trim() ?? null;
    const address = m[1].trim();
    const key = (mls ? `mls-${mls}` : `addr-${slugify(address)}`).toLowerCase();
    return { key, block };
  });
}

function mergeImportRawText(embeddedRaw, localRaw) {
  const embedded = splitImportBlocks(embeddedRaw);
  const local = splitImportBlocks(localRaw);
  if (!local.length) return (embeddedRaw || "").trim();
  const merged = new Map();
  // Prefer embedded blocks for matching keys so code updates replace stale
  // browser-cached import text, while still keeping local-only entries.
  for (const item of embedded) merged.set(item.key, item.block);
  for (const item of local) {
    if (!merged.has(item.key)) merged.set(item.key, item.block);
  }
  return [...merged.values()].join("\n\n").trim();
}

function fmt(n) {
  return (n == null ? "?" : "$" + n.toLocaleString());
}
function fmtCompactUsd(n) {
  return n == null || !Number.isFinite(n) ? "—" : "$" + Math.round(n).toLocaleString();
}
const gradeColor = (s) => s >= 85 ? "#16a34a" : s >= 80 ? "#22c55e" : s >= 75 ? "#84cc16" : s >= 70 ? "#eab308" : s >= 65 ? "#f59e0b" : "#f97316";
const gradeLabel = (s) => s >= 85 ? "A — Excellent" : s >= 80 ? "A-" : s >= 75 ? "B+" : s >= 70 ? "B" : s >= 65 ? "C+" : "C — Fair";
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
const scoreMasterBedLegacy = (s) => interp(s, [{ value: 100, score: 20 }, { value: 150, score: 50 }, { value: 200, score: 75 }, { value: 250, score: 90 }, { value: 300, score: 100 }]);
const scoreMasterBed = (s, ctx) => scoreFromContext(s, ctx, { lowerBetter: false, minScore: 20, maxScore: 100, gamma: 0.9 }) ?? scoreMasterBedLegacy(s);
const scoreKitchen = (k) => k === "Gourmet" ? 100 : k === "Large" ? 73 : k === "Medium" ? 47 : 20;
const scoreYard = (y) => y === "Excellent" ? 100 : y === "Good" ? 71 : y === "Fair" ? 43 : 15;
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
    kitchen: h.kitchenOverride ?? h.conditionOverride ?? scoreKitchen(h.kitchenSize),
    yard: scoreYard(h.yardCondition),
    ageScore: scoreAge(h.built, scoreContexts?.age),
    safety: scoreSafety(h) ?? 0,
    masterBed: scoreMasterBed(masterBedSqft, scoreContexts?.masterBed),
  };
  const contributions = Object.fromEntries(Object.entries(weights).map(([k, w]) => [k, +((vals[k] ?? 0) * w).toFixed(2)]));
  const weightedTotal = +Object.values(contributions).reduce((a, b) => a + b, 0).toFixed(2);
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
  const contributions = Object.fromEntries(
    Object.entries(weights).map(([k, w]) => [k, +(((toNum(next[k]) ?? 0) * w).toFixed(2))])
  );
  const weightedTotal = +Object.values(contributions).reduce((a, b) => a + b, 0).toFixed(2);
  return { ...next, contributions, weightedTotal, grade: gradeLabel(weightedTotal) };
};

function CardMetric({ label, value }) {
  return (
    <div style={{ background: "#0f172a", borderRadius: 10, padding: "8px 10px" }}>
      <div style={{ ...TEXT_STYLES.eyebrow, color: "#64748b" }}>{label}</div>
      <div style={{ ...TEXT_STYLES.bodyStrong, color: "#f1f5f9" }}>{value}</div>
    </div>
  );
}

function ScoreBar({ value }) {
  const numericValue = toNum(value);
  const widthPct = Number.isFinite(numericValue) ? Math.max(0, Math.min(100, numericValue)) : 0;
  const fillColor = Number.isFinite(numericValue) ? gradeColor(numericValue) : "#334155";
  return (
    <div
      aria-hidden="true"
      style={{ height: 7, borderRadius: 999, overflow: "hidden", background: "#0f172a", border: "1px solid #1f2937" }}
    >
      <div
        style={{
          width: `${widthPct}%`,
          height: "100%",
          borderRadius: 999,
          background: `linear-gradient(90deg, ${fillColor}aa, ${fillColor})`,
        }}
      />
    </div>
  );
}

export default function App() {
  const LOCAL_STORAGE_KEY = "homeComp.overrides.v3";
  const LOCAL_IMPORT_STORAGE_KEY = "homeComp.importRaw.v2";
  const LOCAL_WEIGHT_STORAGE_KEY = "homeComp.weights.v1";
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === "undefined" ? 1280 : window.innerWidth));
  const [failedImageKeys, setFailedImageKeys] = useState(() => new Set());
  const isMobile = viewportWidth <= 640;
  const [importRawText, setImportRawText] = useState(() => {
    if (typeof window === "undefined") return IMPORT_UNFORMATTED_DATA;
    const fromLocal = window.localStorage.getItem(LOCAL_IMPORT_STORAGE_KEY);
    if (fromLocal != null && fromLocal.trim()) return mergeImportRawText(IMPORT_UNFORMATTED_DATA, fromLocal);
    return IMPORT_UNFORMATTED_DATA;
  });
  useEffect(() => {
    setImportRawText((prev) => {
      const merged = mergeImportRawText(IMPORT_UNFORMATTED_DATA, prev);
      return merged === prev ? prev : merged;
    });
  }, []);
  const imported = useMemo(() => parseUnformattedHomes(importRawText), [importRawText]);
  const sourceHomes = useMemo(() => {
    const baseline = homesRaw.map((h, i) => ({ ...h, homeId: `base-${i}`, sourceType: "base" }));
    const seenImportedIds = new Map();
    const importedHomes = imported.homes.map((h, i) => {
      const baseKey = slugify(h.sourceKey || h.mlsId || h.name || h.short || `idx-${i}`) || `idx-${i}`;
      const count = seenImportedIds.get(baseKey) ?? 0;
      seenImportedIds.set(baseKey, count + 1);
      const uniqueSuffix = count ? `-${count + 1}` : "";
      return { ...h, homeId: `imported-${baseKey}${uniqueSuffix}`, sourceType: "imported" };
    });
    return [...baseline, ...importedHomes];
  }, [imported]);
  const sourceById = useMemo(() => Object.fromEntries(sourceHomes.map((h) => [h.homeId, h])), [sourceHomes]);

  const [overridesByHomeId, setOverridesByHomeId] = useState(() => {
    if (typeof window === "undefined") return mergeOverrides(APPLIED_UPDATES_BY_HOME_ID, {});
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return mergeOverrides(APPLIED_UPDATES_BY_HOME_ID, {});
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object"
        ? mergeOverrides(APPLIED_UPDATES_BY_HOME_ID, parsed)
        : mergeOverrides(APPLIED_UPDATES_BY_HOME_ID, {});
    } catch {
      return mergeOverrides(APPLIED_UPDATES_BY_HOME_ID, {});
    }
  });
  const [tab, setTab] = useState("overview");
  const [compareA, setCompareA] = useState("0");
  const [compareB, setCompareB] = useState("1");
  const [compareC, setCompareC] = useState(EMPTY);
  const [selectedHomeId, setSelectedHomeId] = useState("");
  const [editorQuery, setEditorQuery] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [overviewSortKey, setOverviewSortKey] = useState(null);
  const [overviewSortDir, setOverviewSortDir] = useState(null);
  const [hoveredOverviewHomeId, setHoveredOverviewHomeId] = useState(null);
  const [lockedOverviewHomeId, setLockedOverviewHomeId] = useState(null);
  const [tagDraft, setTagDraft] = useState("");
  const [editorDraftsByHomeId, setEditorDraftsByHomeId] = useState({});
  const [fieldErrorsByHomeId, setFieldErrorsByHomeId] = useState({});
  const [backupNotice, setBackupNotice] = useState("");
  const restoreBackupInputRef = useRef(null);
  const compareSelectionMigratedRef = useRef(false);
  const storageWriteTimersRef = useRef({});
  const pendingStorageWritesRef = useRef({});
  const STORAGE_WRITE_DEBOUNCE_MS = 350;
  const [rawWeightPoints, setRawWeightPoints] = useState(() => {
    if (typeof window === "undefined") return sanitizeRawWeights(DEFAULT_RAW_WEIGHT_POINTS);
    try {
      const raw = window.localStorage.getItem(LOCAL_WEIGHT_STORAGE_KEY);
      if (!raw) return sanitizeRawWeights(DEFAULT_RAW_WEIGHT_POINTS);
      const parsed = JSON.parse(raw);
      return sanitizeRawWeights(parsed);
    } catch {
      return sanitizeRawWeights(DEFAULT_RAW_WEIGHT_POINTS);
    }
  });
  const effectiveWeights = useMemo(() => normalizeEffectiveWeights(rawWeightPoints), [rawWeightPoints]);
  const activeWeightKeys = useMemo(
    () => WEIGHT_KEYS.filter((key) => SAFETY_SCORING_ENABLED || key !== "safety"),
    []
  );
  const activeLockedRawTotalTicks = useMemo(() => activeDefaultRawTicks(activeWeightKeys), [activeWeightKeys]);
  const weightRows = useMemo(
    () => activeWeightKeys.map((key) => ({ key, label: WEIGHT_LABELS[key], raw: rawWeightPoints[key] ?? 0, effective: effectiveWeights[key] ?? 0 })),
    [activeWeightKeys, rawWeightPoints, effectiveWeights]
  );

  useEffect(() => {
    setRawWeightPoints((prev) => {
      const next = alignActiveRawWeights(prev, activeWeightKeys, activeLockedRawTotalTicks);
      if (WEIGHT_KEYS.every((key) => Math.abs((prev?.[key] ?? 0) - (next?.[key] ?? 0)) < RAW_WEIGHT_EPS)) return prev;
      return next;
    });
  }, [activeWeightKeys, activeLockedRawTotalTicks]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let resizeTimeoutId = null;
    let resizeRafId = null;
    const onResize = () => {
      if (resizeTimeoutId != null) window.clearTimeout(resizeTimeoutId);
      resizeTimeoutId = window.setTimeout(() => {
        resizeRafId = window.requestAnimationFrame(() => {
          setViewportWidth(window.innerWidth);
          resizeRafId = null;
        });
        resizeTimeoutId = null;
      }, 100);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (resizeTimeoutId != null) window.clearTimeout(resizeTimeoutId);
      if (resizeRafId != null) window.cancelAnimationFrame(resizeRafId);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    pendingStorageWritesRef.current.overrides = () => {
      try {
        if (!Object.keys(overridesByHomeId).length) {
          window.localStorage.removeItem(LOCAL_STORAGE_KEY);
          return;
        }
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(overridesByHomeId));
      } catch {
        // Ignore storage write failures (quota/privacy mode) so UI keeps rendering.
      }
    };
    window.clearTimeout(storageWriteTimersRef.current.overrides);
    storageWriteTimersRef.current.overrides = window.setTimeout(() => {
      pendingStorageWritesRef.current.overrides?.();
      delete pendingStorageWritesRef.current.overrides;
      delete storageWriteTimersRef.current.overrides;
    }, STORAGE_WRITE_DEBOUNCE_MS);
  }, [overridesByHomeId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    pendingStorageWritesRef.current.importRawText = () => {
      try {
        if (!importRawText?.trim()) {
          window.localStorage.removeItem(LOCAL_IMPORT_STORAGE_KEY);
          return;
        }
        window.localStorage.setItem(LOCAL_IMPORT_STORAGE_KEY, importRawText);
      } catch {
        // Ignore storage write failures (quota/privacy mode) so UI keeps rendering.
      }
    };
    window.clearTimeout(storageWriteTimersRef.current.importRawText);
    storageWriteTimersRef.current.importRawText = window.setTimeout(() => {
      pendingStorageWritesRef.current.importRawText?.();
      delete pendingStorageWritesRef.current.importRawText;
      delete storageWriteTimersRef.current.importRawText;
    }, STORAGE_WRITE_DEBOUNCE_MS);
  }, [importRawText]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    pendingStorageWritesRef.current.rawWeightPoints = () => {
      try {
        if (isDefaultRawWeights(rawWeightPoints)) {
          window.localStorage.removeItem(LOCAL_WEIGHT_STORAGE_KEY);
          return;
        }
        window.localStorage.setItem(LOCAL_WEIGHT_STORAGE_KEY, JSON.stringify(rawWeightPoints));
      } catch {
        // Ignore storage failures so UI remains usable.
      }
    };
    window.clearTimeout(storageWriteTimersRef.current.rawWeightPoints);
    storageWriteTimersRef.current.rawWeightPoints = window.setTimeout(() => {
      pendingStorageWritesRef.current.rawWeightPoints?.();
      delete pendingStorageWritesRef.current.rawWeightPoints;
      delete storageWriteTimersRef.current.rawWeightPoints;
    }, STORAGE_WRITE_DEBOUNCE_MS);
  }, [rawWeightPoints]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const flushPendingStorageWrites = () => {
      Object.values(storageWriteTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
      storageWriteTimersRef.current = {};
      Object.values(pendingStorageWritesRef.current).forEach((writeFn) => {
        if (typeof writeFn === "function") writeFn();
      });
      pendingStorageWritesRef.current = {};
    };
    window.addEventListener("beforeunload", flushPendingStorageWrites);
    window.addEventListener("pagehide", flushPendingStorageWrites);
    return () => {
      window.removeEventListener("beforeunload", flushPendingStorageWrites);
      window.removeEventListener("pagehide", flushPendingStorageWrites);
      flushPendingStorageWrites();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sourceHomes.length) return;
    try {
      const todayKey = toDateKey(new Date());
      const lastRollKey = window.localStorage.getItem(DOM_ROLL_DATE_KEY);
      if (!lastRollKey) {
        window.localStorage.setItem(DOM_ROLL_DATE_KEY, todayKey);
        return;
      }
      const deltaDays = dayDiff(lastRollKey, todayKey);
      if (deltaDays <= 0) return;

      setOverridesByHomeId((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const home of sourceHomes) {
          const current = next[home.homeId] ?? {};
          const currentDom = toNum(
            Object.prototype.hasOwnProperty.call(current, "dom") ? current.dom : home.dom
          );
          if (currentDom == null) continue;
          const updatedDom = currentDom + deltaDays;
          const sourceDom = toNum(home.dom);
          const nextHome = { ...current, dom: updatedDom };
          if (sourceDom != null && updatedDom === sourceDom) delete nextHome.dom;
          const hasAny = Object.keys(nextHome).length > 0;
          const hadAny = Object.keys(current).length > 0;
          if (hasAny) {
            if (!hadAny || nextHome.dom !== current.dom) changed = true;
            next[home.homeId] = nextHome;
          } else if (hadAny) {
            changed = true;
            delete next[home.homeId];
          }
        }
        return changed ? next : prev;
      });

      window.localStorage.setItem(DOM_ROLL_DATE_KEY, todayKey);
    } catch {
      // Ignore storage failures; DOM auto-rollover is non-critical.
    }
  }, [sourceHomes]);

  const preparedHomes = useMemo(
    () => sourceHomes.map((h, i) => {
      const overrides = overridesByHomeId[h.homeId] ?? {};
      return normalizeHomeRecord({ ...h, ...overrides, _overrideKeys: Object.keys(overrides) }, i);
    }),
    [sourceHomes, overridesByHomeId]
  );
  const scoreContexts = useMemo(() => {
    const active = preparedHomes.filter((h) => !["Ruled Out", "Sold"].includes(h.status));
    const scope = active.length ? active : preparedHomes;
    return {
      rating: buildRangeContext(scope.map((h) => {
        const g = toNum(h?.greg);
        const b = toNum(h?.bre);
        if (!Number.isFinite(g) || !Number.isFinite(b)) return null;
        return ((g + b) / 20) * 100;
      }), { minSpread: 6 }),
      // Use full observed range for monthly payments so near-cheapest homes
      // don't all collapse to the same top score.
      monthly: buildRangeContext(scope.map((h) => estimateMonthlyTotal(h)), { minSpread: 120, lowQuantile: 0, highQuantile: 1 }),
      sqft: buildRangeContext(scope.map((h) => h?.sqft), { minSpread: 200 }),
      lot: buildRangeContext(scope.map((h) => h?.lotSqft), { minSpread: 500 }),
      masterBed: buildRangeContext(scope.map((h) => h?.masterBedSqft), { minSpread: 50 }),
      age: buildRangeContext(scope.map((h) => {
        const built = toNum(h?.built);
        return Number.isFinite(built) ? Math.max(0, CURRENT_YEAR - built) : null;
      }), { minSpread: 3 }),
    };
  }, [preparedHomes]);
  const masterBedSqftFallback = useMemo(() => {
    const vals = preparedHomes
      .map((h) => toNum(h?.masterBedSqft))
      .filter((v) => Number.isFinite(v));
    if (!vals.length) return null;
    const avg = vals.reduce((sum, v) => sum + v, 0) / vals.length;
    return Math.round(avg);
  }, [preparedHomes]);
  const firstPassAllHomes = useMemo(
    () => preparedHomes.map((h) => calc(h, { scoreContexts, masterBedSqftFallback, effectiveWeights })),
    [preparedHomes, scoreContexts, masterBedSqftFallback, effectiveWeights]
  );
  const firstPassVisibleHomes = useMemo(
    () => firstPassAllHomes.filter((h) => !["Ruled Out", "Sold"].includes(h.status)),
    [firstPassAllHomes]
  );
  const impactScopeHomes = useMemo(
    () => (firstPassVisibleHomes.length ? firstPassVisibleHomes : firstPassAllHomes),
    [firstPassVisibleHomes, firstPassAllHomes]
  );
  const impactAudit = useMemo(() => {
    const factorKeys = IMPACT_AUDIT_FACTOR_KEYS.filter((key) => key !== "safety" || SAFETY_SCORING_ENABLED);
    const rows = factorKeys.map((key) => {
      const vals = impactScopeHomes.map((h) => toNum(h?.[key])).filter((v) => Number.isFinite(v));
      const min = vals.length ? Math.min(...vals) : null;
      const max = vals.length ? Math.max(...vals) : null;
      const spread = Number.isFinite(min) && Number.isFinite(max) ? +(max - min).toFixed(1) : 0;
      const effectiveWeight = +(toNum(effectiveWeights?.[key]) ?? 0);
      const weightedSpreadBefore = +(spread * effectiveWeight).toFixed(2);
      const noVariation = spread <= 0;
      const weak = !noVariation && weightedSpreadBefore < IMPACT_AUDIT_THRESHOLD;
      const weightedSpreadAfter = weak
        ? +(((IMPACT_STRETCH_MAX_SCORE - IMPACT_STRETCH_MIN_SCORE) * effectiveWeight).toFixed(2))
        : weightedSpreadBefore;
      const status = noVariation ? "No Variation" : weak ? "Weak" : "OK";
      return {
        key,
        label: WEIGHT_LABELS[key] ?? key,
        effectiveWeight,
        min,
        max,
        spread,
        weightedSpreadBefore,
        weightedSpreadAfter,
        noVariation,
        weak,
        status,
      };
    });
    const stretchByKey = Object.fromEntries(
      rows
        .filter((row) => row.weak && Number.isFinite(row.min) && Number.isFinite(row.max) && row.max > row.min)
        .map((row) => [row.key, { min: row.min, max: row.max }])
    );
    return { rows, stretchByKey };
  }, [impactScopeHomes, effectiveWeights]);
  const allHomes = useMemo(
    () => firstPassAllHomes
      .map((h) => applyImpactStretch(h, impactAudit.stretchByKey, effectiveWeights))
      .sort((a, b) => b.weightedTotal - a.weightedTotal),
    [firstPassAllHomes, impactAudit.stretchByKey, effectiveWeights]
  );
  const homes = useMemo(() => allHomes.filter((h) => !["Ruled Out", "Sold"].includes(h.status)), [allHomes]);
  const markImageFailed = (home) => {
    const key = getImageKey(home);
    setFailedImageKeys((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };
  const dataEntryVisibleHomes = useMemo(
    () => (showHidden ? allHomes : allHomes.filter((h) => !["Ruled Out", "Sold"].includes(h.status))),
    [allHomes, showHidden]
  );

  useEffect(() => {
    setFailedImageKeys((prev) => {
      if (!prev.size) return prev;
      const liveKeys = new Set(allHomes.filter((home) => home.photo).map((home) => getImageKey(home)));
      let changed = false;
      const next = new Set();
      prev.forEach((key) => {
        if (liveKeys.has(key)) next.add(key);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [allHomes]);

  useEffect(() => {
    if (lockedOverviewHomeId && !homes.some((h) => h.homeId === lockedOverviewHomeId)) {
      setLockedOverviewHomeId(null);
    }
    if (hoveredOverviewHomeId && !homes.some((h) => h.homeId === hoveredOverviewHomeId)) {
      setHoveredOverviewHomeId(null);
    }
  }, [homes, lockedOverviewHomeId, hoveredOverviewHomeId]);

  useEffect(() => {
    if (compareSelectionMigratedRef.current) return;
    if (!homes.length) return;
    const mapLegacySelection = (value, fallbackIndex = null) => {
      if (value === EMPTY) return EMPTY;
      if (homes.some((h) => h.homeId === value)) return value;
      const idx = Number(value);
      if (Number.isInteger(idx) && idx >= 0 && idx < homes.length) return homes[idx].homeId;
      if (Number.isInteger(fallbackIndex) && fallbackIndex >= 0 && fallbackIndex < homes.length) return homes[fallbackIndex].homeId;
      return EMPTY;
    };
    setCompareA((prev) => mapLegacySelection(prev, 0));
    setCompareB((prev) => mapLegacySelection(prev, homes.length > 1 ? 1 : 0));
    setCompareC((prev) => mapLegacySelection(prev, null));
    compareSelectionMigratedRef.current = true;
  }, [homes]);

  useEffect(() => {
    if (!allHomes.length) {
      setSelectedHomeId("");
      return;
    }
    const pool = showHidden ? allHomes : dataEntryVisibleHomes;
    if (!pool.length) {
      setSelectedHomeId("");
      return;
    }
    if (!pool.some((h) => h.homeId === selectedHomeId)) setSelectedHomeId(pool[0].homeId);
  }, [allHomes, dataEntryVisibleHomes, selectedHomeId, showHidden]);

  useEffect(() => {
    setTagDraft("");
  }, [selectedHomeId]);

  const importSummary = useMemo(() => {
    const importedPrepared = preparedHomes.slice(homesRaw.length);
    return {
      blockCount: imported.blockCount,
      importedCount: imported.homes.length,
      unknownFieldCount: imported.unknownFieldCount,
      placeholderFieldCount: importedPrepared.reduce((total, h) => total + getMissingFields(h).length, 0),
    };
  }, [imported, preparedHomes]);

  const selectedHome = dataEntryVisibleHomes.find((h) => h.homeId === selectedHomeId) ?? dataEntryVisibleHomes[0] ?? null;
  const selectedSource = selectedHome ? sourceById[selectedHome.homeId] ?? null : null;
  const selectedOverrides = selectedHome ? overridesByHomeId[selectedHome.homeId] ?? {} : {};
  const selectedDrafts = selectedHome ? editorDraftsByHomeId[selectedHome.homeId] ?? {} : {};
  const selectedErrors = selectedHome ? fieldErrorsByHomeId[selectedHome.homeId] ?? {} : {};

  const filteredEditorHomes = useMemo(() => {
    const q = editorQuery.trim().toLowerCase();
    if (!q) return dataEntryVisibleHomes;
    return dataEntryVisibleHomes.filter((h) => [h.name, h.short, h.status, h.homeId].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
  }, [dataEntryVisibleHomes, editorQuery]);

  const visibleEditGroups = useMemo(() => {
    if (!selectedHome || !showMissingOnly) return EDIT_GROUPS;
    const missingSet = new Set(getMissingFields(selectedHome));
    return EDIT_GROUPS.map((group) => ({ ...group, fields: group.fields.filter((f) => f.key === "tags" || missingSet.has(f.key)) })).filter((group) => group.fields.length);
  }, [selectedHome, showMissingOnly]);

  const setFieldError = (homeId, field, message) => {
    setFieldErrorsByHomeId((prev) => {
      const homeErrors = { ...(prev[homeId] ?? {}) };
      if (message) homeErrors[field] = message;
      else delete homeErrors[field];
      const next = { ...prev };
      if (Object.keys(homeErrors).length) next[homeId] = homeErrors;
      else delete next[homeId];
      return next;
    });
  };

  const setDraftValue = (homeId, field, value) => {
    setEditorDraftsByHomeId((prev) => {
      const homeDrafts = { ...(prev[homeId] ?? {}) };
      if (value == null) delete homeDrafts[field];
      else homeDrafts[field] = value;
      const next = { ...prev };
      if (Object.keys(homeDrafts).length) next[homeId] = homeDrafts;
      else delete next[homeId];
      return next;
    });
  };

  const updateOverrideField = (homeId, field, nextValue) => {
    const baseValue = sourceById[homeId]?.[field];
    setOverridesByHomeId((prev) => {
      const currentHome = { ...(prev[homeId] ?? {}) };
      const equal = Array.isArray(nextValue) && Array.isArray(baseValue) ? arraysEqual(nextValue, baseValue) : nextValue === baseValue;
      if (equal) delete currentHome[field];
      else currentHome[field] = nextValue;
      const next = { ...prev };
      if (Object.keys(currentHome).length) next[homeId] = currentHome;
      else delete next[homeId];
      return next;
    });
  };

  const onNumericChange = (homeId, field, raw) => {
    setDraftValue(homeId, field, raw);
    const trimmed = raw.trim();
    if (!trimmed) {
      setFieldError(homeId, field, null);
      updateOverrideField(homeId, field, null);
      return;
    }
    const parsed = toNum(trimmed);
    if (parsed == null) {
      setFieldError(homeId, field, "Enter a valid number");
      return;
    }
    setFieldError(homeId, field, null);
    if (field === "hoa") {
      updateOverrideField(homeId, field, hoaMonthlyToAnnual(parsed));
      return;
    }
    updateOverrideField(homeId, field, parsed);
  };

  const onNumericBlur = (homeId, field) => {
    const hasError = Boolean(fieldErrorsByHomeId[homeId]?.[field]);
    if (!hasError) setDraftValue(homeId, field, null);
  };

  const onTextChange = (homeId, field, raw) => {
    setFieldError(homeId, field, null);
    updateOverrideField(homeId, field, raw.trim() === "" ? null : raw);
  };

  const addTag = () => {
    if (!selectedHome) return;
    const tag = tagDraft.trim();
    if (!tag) return;
    const current = Array.isArray(selectedHome.tags) ? selectedHome.tags : [];
    if (current.includes(tag)) return;
    updateOverrideField(selectedHome.homeId, "tags", [...current, tag]);
    setTagDraft("");
  };

  const removeTag = (tag) => {
    if (!selectedHome) return;
    const current = Array.isArray(selectedHome.tags) ? selectedHome.tags : [];
    updateOverrideField(
      selectedHome.homeId,
      "tags",
      current.filter((x) => x !== tag)
    );
  };

  const resetSelectedHome = () => {
    if (!selectedHome) return;
    const homeId = selectedHome.homeId;
    setOverridesByHomeId((prev) => {
      const next = { ...prev };
      delete next[homeId];
      return next;
    });
    setEditorDraftsByHomeId((prev) => {
      const next = { ...prev };
      delete next[homeId];
      return next;
    });
    setFieldErrorsByHomeId((prev) => {
      const next = { ...prev };
      delete next[homeId];
      return next;
    });
  };

  const resetAllEdits = () => {
    setOverridesByHomeId(mergeOverrides(APPLIED_UPDATES_BY_HOME_ID, {}));
    setEditorDraftsByHomeId({});
    setFieldErrorsByHomeId({});
    if (typeof window !== "undefined") window.localStorage.removeItem(LOCAL_STORAGE_KEY);
  };
  const setSelectedStatus = (nextStatus) => {
    if (!selectedHome) return;
    updateOverrideField(selectedHome.homeId, "status", nextStatus);
  };

  const clearImportText = () => {
    setImportRawText("");
  };
  const restoreEmbeddedImports = () => {
    setImportRawText((prev) => mergeImportRawText(IMPORT_UNFORMATTED_DATA, prev));
  };
  const downloadBackup = () => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const homesMerged = sourceHomes.map((home) => ({ ...home, ...(overridesByHomeId[home.homeId] ?? {}) }));
    const payload = {
      schemaVersion: 1,
      exportedAt: now.toISOString(),
      counts: {
        baselineHomes: homesRaw.length,
        importedHomes: imported.homes.length,
        totalHomes: homesMerged.length,
      },
      importRawText,
      overridesByHomeId,
      homes: homesMerged,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `home-comp-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
    setBackupNotice(`Backup saved: ${a.download}`);
  };
  const triggerRestoreBackup = () => {
    restoreBackupInputRef.current?.click();
  };
  const onRestoreBackupFile = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const maybeOverrides = parsed?.overridesByHomeId ?? parsed;
      if (!maybeOverrides || typeof maybeOverrides !== "object" || Array.isArray(maybeOverrides)) {
        throw new Error("Backup file does not contain a valid overrides object.");
      }

      setOverridesByHomeId(mergeOverrides(APPLIED_UPDATES_BY_HOME_ID, maybeOverrides));
      if (typeof parsed?.importRawText === "string" && parsed.importRawText.trim()) {
        setImportRawText(mergeImportRawText(IMPORT_UNFORMATTED_DATA, parsed.importRawText));
      }
      setEditorDraftsByHomeId({});
      setFieldErrorsByHomeId({});
      const restoredCount = Object.keys(maybeOverrides).length;
      setBackupNotice(`Restored ${restoredCount} home override record(s) from ${file.name}.`);
    } catch (err) {
      setBackupNotice(`Restore failed: ${err?.message ?? "Invalid JSON backup file."}`);
    } finally {
      if (e?.target) e.target.value = "";
    }
  };

  const pick = (value, fallback) => {
    if (value === EMPTY) return null;
    return homes.find((h) => h.homeId === value) ?? fallback;
  };
  const overviewAddress = (home) => {
    const raw = String(home?.name ?? "").trim();
    if (!raw) return "Unknown Address";
    // Imported rows already include full city/state/zip in most cases.
    if (/,/.test(raw)) return raw;
    // Baseline rows store street only; show full address format in Overview.
    return `${raw}, Colorado Springs, CO`;
  };
  const formatFactorScore = (value) => {
    const n = toNum(value);
    return Number.isFinite(n) ? n.toFixed(1) : "—";
  };
  const scoredFactorSpecs = useMemo(() => {
    const specs = SCORED_FACTOR_BASE
      .filter((spec) => spec.key !== "safety" || SAFETY_SCORING_ENABLED)
      .map((spec) => {
        if (spec.key === "rating") {
          return {
            ...spec,
            rawValue: (h) => {
              const g = toNum(h?.greg);
              const b = toNum(h?.bre);
              return Number.isFinite(g) && Number.isFinite(b) ? `Greg ${g.toFixed(1)} · Bre ${b.toFixed(1)}` : "—";
            },
            scoreValue: (h) => toNum(h?.rating),
            sortValue: (h) => toNum(h?.rating),
          };
        }
        if (spec.key === "monthlyPayment") {
          return {
            ...spec,
            rawValue: (h) => fmtCompactUsd(toNum(h?.totalMo)),
            scoreValue: (h) => toNum(h?.monthlyPayment),
            sortValue: (h) => toNum(h?.monthlyPayment),
          };
        }
        if (spec.key === "sizeValue") {
          return {
            ...spec,
            rawValue: (h) => Number.isFinite(toNum(h?.sqft)) ? Math.round(h.sqft).toLocaleString() : "—",
            scoreValue: (h) => toNum(h?.sizeValue),
            sortValue: (h) => toNum(h?.sizeValue),
          };
        }
        if (spec.key === "lot") {
          return {
            ...spec,
            rawValue: (h) => Number.isFinite(toNum(h?.lotSqft)) ? Math.round(h.lotSqft).toLocaleString() : "—",
            scoreValue: (h) => toNum(h?.lot),
            sortValue: (h) => toNum(h?.lot),
          };
        }
        if (spec.key === "kitchen") {
          return {
            ...spec,
            rawValue: (h) => h?.kitchenSize ?? "—",
            scoreValue: (h) => toNum(h?.kitchen),
            sortValue: (h) => toNum(h?.kitchen),
          };
        }
        if (spec.key === "yard") {
          return {
            ...spec,
            rawValue: (h) => h?.yardCondition ?? "—",
            scoreValue: (h) => toNum(h?.yard),
            sortValue: (h) => toNum(h?.yard),
          };
        }
        if (spec.key === "ageScore") {
          return {
            ...spec,
            rawValue: (h) => {
              const built = toNum(h?.built);
              if (!Number.isFinite(built)) return "—";
              const age = Math.max(0, CURRENT_YEAR - built);
              return `${Math.round(built)} (${age}y)`;
            },
            scoreValue: (h) => toNum(h?.ageScore),
            sortValue: (h) => toNum(h?.ageScore),
          };
        }
        if (spec.key === "masterBed") {
          return {
            ...spec,
            rawValue: (h) => Number.isFinite(toNum(h?.masterBedSqft)) ? `${Math.round(h.masterBedSqft).toLocaleString()} sqft` : "—",
            scoreValue: (h) => toNum(h?.masterBed),
            sortValue: (h) => toNum(h?.masterBed),
          };
        }
        return {
          ...spec,
          rawValue: (h) => {
            const a = toNum(h?.safetyAssaultIndex);
            const b = toNum(h?.safetyBurglaryIndex);
            const c = toNum(h?.safetyLarcenyTheftIndex);
            const d = toNum(h?.safetyVehicleTheftIndex);
            return [a, b, c, d].every((v) => Number.isFinite(v)) ? `A:${a} B:${b} L:${c} V:${d}` : "—";
          },
          scoreValue: (h) => toNum(h?.safety),
          sortValue: (h) => toNum(h?.safety),
        };
      });
    return specs;
  }, []);
  const factorSpecByKey = useMemo(
    () => Object.fromEntries(scoredFactorSpecs.map((spec) => [spec.key, spec])),
    [scoredFactorSpecs]
  );
  const factorPairForHome = (home, factorKey) => {
    const spec = factorSpecByKey[factorKey];
    if (!spec || !home) return { raw: "—", score: "—", scoreNum: null };
    const scoreNum = toNum(spec.scoreValue(home));
    return {
      raw: spec.rawValue(home),
      score: formatFactorScore(scoreNum),
      scoreNum,
    };
  };
  const overviewColumns = [
    { key: "address", type: "data", label: "Address", align: "left", minWidth: 240, mobileMinWidth: 210, wrap: true },
    { key: "weightedTotal", type: "data", label: "Weighted", align: "right", minWidth: 84, mobileMinWidth: 78 },
    ...scoredFactorSpecs.map((spec) => ({ key: spec.key, type: "factor", label: spec.label, align: "left", minWidth: spec.minWidth, mobileMinWidth: spec.mobileMinWidth })),
  ];
  const overviewRankColWidth = isMobile ? 36 : 42;
  const overviewTableMinWidth = useMemo(() => (
    overviewRankColWidth
    + overviewColumns.reduce((sum, col) => sum + (isMobile ? (col.mobileMinWidth ?? col.minWidth ?? 70) : (col.minWidth ?? 70)), 0)
  ), [overviewColumns, overviewRankColWidth, isMobile]);
  const overviewRowTone = (homeId) => {
    if (lockedOverviewHomeId === homeId) return "locked";
    if (hoveredOverviewHomeId === homeId) return "hover";
    return "default";
  };
  const toggleOverviewRowLock = (homeId) => {
    setLockedOverviewHomeId((prev) => (prev === homeId ? null : homeId));
  };
  const onOverviewRowKeyDown = (e, homeId) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleOverviewRowLock(homeId);
    }
  };
  const getOverviewSortValue = (home, key) => {
    if (factorSpecByKey[key]) return factorSpecByKey[key].sortValue(home);
    switch (key) {
      case "address":
        return overviewAddress(home).toLowerCase();
      case "weightedTotal":
        return home.weightedTotal;
      default:
        return null;
    }
  };
  const rankByHomeId = useMemo(() => {
    const ranks = new Map();
    homes.forEach((home, idx) => ranks.set(home.homeId, idx + 1));
    return ranks;
  }, [homes]);
  const overviewRows = useMemo(() => {
    const rows = [...homes];
    if (!overviewSortKey || !overviewSortDir) return rows;
    rows.sort((a, b) => {
      const va = getOverviewSortValue(a, overviewSortKey);
      const vb = getOverviewSortValue(b, overviewSortKey);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const isNumA = typeof va === "number" && Number.isFinite(va);
      const isNumB = typeof vb === "number" && Number.isFinite(vb);
      if (isNumA && isNumB) {
        const diff = va - vb;
        return overviewSortDir === "asc" ? diff : -diff;
      }
      const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: "base" });
      return overviewSortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [homes, overviewSortKey, overviewSortDir]);
  const onOverviewSort = (key) => {
    if (overviewSortKey !== key) {
      setOverviewSortKey(key);
      setOverviewSortDir("desc");
      return;
    }
    if (overviewSortDir === "desc") {
      setOverviewSortDir("asc");
      return;
    }
    if (overviewSortDir === "asc") {
      setOverviewSortKey(null);
      setOverviewSortDir(null);
      return;
    }
    setOverviewSortDir("desc");
  };
  const overviewSortIndicator = (key) => {
    if (overviewSortKey !== key || !overviewSortDir) return "";
    return overviewSortDir === "desc" ? " ▼" : " ▲";
  };
  const a = pick(compareA, homes[0] ?? null);
  const b = pick(compareB, homes[Math.min(1, Math.max(homes.length - 1, 0))] ?? null);
  const c = pick(compareC, null);
  const compareHomes = [a, b, c];
  const compareHeaderColors = ["#818cf8", "#fbbf24", "#86efac"];
  const compareFactorRows = useMemo(() => scoredFactorSpecs.map((spec) => ({ key: spec.key, label: spec.label })), [scoredFactorSpecs]);
  const compareViewModel = useMemo(() => {
    const weightedTotals = compareHomes.map((home) => toNum(home?.weightedTotal));
    const bestWeightedScore = weightedTotals
      .filter((n) => Number.isFinite(n))
      .reduce((best, n) => Math.max(best, n), -Infinity);
    const factors = compareFactorRows.map((row) => {
      const pairs = compareHomes.map((home) => (home ? factorPairForHome(home, row.key) : null));
      const bestScore = pairs
        .map((pair) => pair?.scoreNum)
        .filter((n) => Number.isFinite(n))
        .reduce((best, n) => Math.max(best, n), -Infinity);
      return {
        ...row,
        pairs,
        bestScore: Number.isFinite(bestScore) ? bestScore : null,
      };
    });
    return {
      weightedTotals,
      bestWeightedScore: Number.isFinite(bestWeightedScore) ? bestWeightedScore : null,
      factors,
    };
  }, [a, b, c, compareFactorRows]);
  const cardFactorPairsByHomeId = useMemo(() => {
    const byHomeId = new Map();
    homes.forEach((home) => {
      byHomeId.set(
        home.homeId,
        Object.fromEntries(scoredFactorSpecs.map((spec) => [spec.key, factorPairForHome(home, spec.key)]))
      );
    });
    return byHomeId;
  }, [homes, scoredFactorSpecs]);
  const rawRadarData = RADAR.map(([key, label]) => ({
    subject: label,
    a: a?.[key] ?? null,
    b: b?.[key] ?? null,
    c: c?.[key] ?? null,
  }));
  const weightedRadarData = RADAR.map(([key, label]) => ({
    subject: `${label} (${((effectiveWeights[key] ?? 0) * 100).toFixed(1)}%)`,
    a: a?.contributions?.[key] ?? null,
    b: b?.contributions?.[key] ?? null,
    c: c?.contributions?.[key] ?? null,
  }));
  const onWeightSliderChange = (key, percentValue) => {
    const parsedPercent = parseMaybeNumber(percentValue);
    const raw = quantizeRawWeight((parsedPercent ?? 0) / 100);
    setRawWeightPoints((prev) => {
      const next = rebalanceLinkedRawWeights(prev, key, raw, activeWeightKeys, activeLockedRawTotalTicks);
      return next;
    });
  };
  const resetWeightsToDefault = () => {
    setRawWeightPoints(sanitizeRawWeights(DEFAULT_RAW_WEIGHT_POINTS));
  };
  const weightsSubtitle = SAFETY_SCORING_ENABLED
    ? "Linked sliders: moving one weight auto-rebalances all other active weights proportionally. Effective weights are normalized live."
    : "Linked sliders: moving one weight auto-rebalances the visible weights proportionally. Safety is disabled and excluded.";
  const auditStatusStyle = (status) => {
    if (status === "OK") return { color: "#86efac", border: "1px solid #14532d", background: "#052e16" };
    if (status === "Weak") return { color: "#fbbf24", border: "1px solid #7c2d12", background: "#3f2a12" };
    return { color: "#cbd5e1", border: "1px solid #334155", background: "#0f172a" };
  };
  const sectionTitleStyle = { ...TEXT_STYLES.sectionTitle, color: "#f1f5f9" };
  const cardTitleStyle = { ...TEXT_STYLES.cardTitle, color: "#f1f5f9" };
  const bodyMutedTextStyle = { ...TEXT_STYLES.body, color: "#94a3b8" };
  const bodyStrongTextStyle = { ...TEXT_STYLES.bodyStrong, color: "#f1f5f9" };
  const labelTextStyle = { ...TEXT_STYLES.label, color: "#cbd5e1" };
  const captionTextStyle = { ...TEXT_STYLES.caption, color: "#94a3b8" };
  const captionStrongTextStyle = { ...TEXT_STYLES.captionStrong, color: "#cbd5e1" };
  const eyebrowTextStyle = { ...TEXT_STYLES.eyebrow, color: "#64748b" };
  const metricTextStyle = { ...TEXT_STYLES.metric, color: "#f8fafc" };
  const buttonTextStyle = { ...TEXT_STYLES.label, color: "#e2e8f0" };
  const inputTextStyle = { ...TEXT_STYLES.body, fontSize: 12 };
  const chartXAxisTickStyle = { ...TEXT_STYLES.caption, fontSize: 11, fill: "#94a3b8" };
  const chartYAxisTickStyle = { ...TEXT_STYLES.caption, fontSize: 11, fill: "#64748b" };
  const chartLegendStyle = { ...TEXT_STYLES.label, color: "#94a3b8" };
  const chartTooltipLabelStyle = { ...TEXT_STYLES.label, color: "#f1f5f9" };
  const chartLegendFormatter = (value, entry) => <span style={{ ...TEXT_STYLES.label, color: entry?.color ?? "#94a3b8" }}>{value}</span>;
  const compareTableStyle = { fontFamily: FONT_STACKS.sans, width: "100%", borderCollapse: "collapse", fontSize: 13 };
  const compareHeaderCellStyle = { ...TEXT_STYLES.label, fontFamily: FONT_STACKS.sans, textAlign: "right", padding: "8px 6px" };
  const compareMetricCellStyle = { ...labelTextStyle, fontFamily: FONT_STACKS.sans, padding: "8px 6px", borderTop: "1px solid #334155" };
  const compareValueCellStyle = { ...bodyStrongTextStyle, fontFamily: FONT_STACKS.sans, fontSize: 12 };
  const compareScoreCellStyle = { ...TEXT_STYLES.captionStrong, fontFamily: FONT_STACKS.sans };
  const selectStyle = { ...TEXT_STYLES.body, width: "100%", background: "#0f172a", color: "#f1f5f9", border: "1px solid #334155", borderRadius: 6, padding: "6px 8px" };

  return (
    <div style={{ fontFamily: FONT_STACKS.sans, background: "#0f172a", minHeight: "100vh", color: "#e2e8f0", padding: isMobile ? 10 : 16, WebkitTextSizeAdjust: "100%", textSizeAdjust: "100%" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <h1 style={{ ...TEXT_STYLES.heroTitle, color: "#f8fafc", marginBottom: 4 }}>🏠 Home Comparison Dashboard</h1>
        <p style={{ ...bodyMutedTextStyle, marginBottom: 16 }}>Monthly payment includes P&amp;I, tax, and HOA · Fountain-area homes are excluded for safety concerns · canvas computes all scores</p>
        {importSummary.blockCount > 0 && <div style={{ ...labelTextStyle, background: "#111827", border: "1px solid #334155", borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>Parsed {importSummary.importedCount} imported home(s) from {importSummary.blockCount} block(s) · flagged {importSummary.unknownFieldCount} unknown field(s) · flagged {importSummary.placeholderFieldCount} blank field(s)</div>}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {["overview", "data-entry", "compare", "cards", "weights"].map((k) => {
            const label = k === "overview" ? "📊 Overview" : k === "data-entry" ? "🛠️ Data Entry" : k === "compare" ? "⚡ Compare" : k === "cards" ? "🏠 Cards" : "⚖️ Weights";
            return <button key={k} onClick={() => setTab(k)} style={{ ...TEXT_STYLES.bodyStrong, padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: tab === k ? "#6366f1" : "#1e293b", color: tab === k ? "#fff" : "#94a3b8" }}>{label}</button>;
          })}
        </div>
        {importSummary.blockCount === 0 && (
          <div style={{ background: "#1f2937", border: "1px solid #f59e0b66", borderRadius: 8, padding: "8px 10px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ ...TEXT_STYLES.label, color: "#fcd34d" }}>No imported homes are currently loaded.</div>
            <button onClick={() => setTab("data-entry")} style={{ ...buttonTextStyle, border: "1px solid #334155", background: "#111827", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>Open Data Entry</button>
          </div>
        )}

        {tab === "overview" && <div>
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <h2 style={{ ...sectionTitleStyle, marginBottom: 12 }}>🏆 Rankings</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: isMobile ? 10 : 12, minWidth: overviewTableMinWidth }}>
                <colgroup>
                  <col style={{ width: overviewRankColWidth, minWidth: overviewRankColWidth }} />
                  {overviewColumns.map((col) => (
                    <col
                      key={col.key}
                      style={{
                        width: isMobile ? (col.mobileMinWidth ?? col.minWidth ?? 70) : (col.minWidth ?? 70),
                        minWidth: isMobile ? (col.mobileMinWidth ?? col.minWidth ?? 70) : (col.minWidth ?? 70),
                      }}
                    />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ ...TEXT_STYLES.label, textAlign: "left", padding: isMobile ? "5px 4px" : "7px 5px", fontSize: isMobile ? 10 : 12, color: "#94a3b8", width: overviewRankColWidth, whiteSpace: "nowrap" }}>#</th>
                    {overviewColumns.map((col) => (
                      <th
                        key={col.key}
                        onClick={() => onOverviewSort(col.key)}
                        style={{ ...TEXT_STYLES.label, textAlign: col.align, padding: isMobile ? "5px 4px" : "7px 5px", fontSize: isMobile ? 10 : 12, color: overviewSortKey === col.key ? "#e2e8f0" : "#94a3b8", cursor: "pointer", whiteSpace: "nowrap", userSelect: "none", overflow: "hidden", textOverflow: "ellipsis" }}
                        title="Click to sort"
                      >
                        {col.label}{overviewSortIndicator(col.key)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {overviewRows.map((h) => {
                    const missingCount = getMissingFields(h).length;
                    const lockedRank = rankByHomeId.get(h.homeId);
                    const rowTone = overviewRowTone(h.homeId);
                    const rowBg = rowTone === "locked" ? "#1f2350" : rowTone === "hover" ? "#1d253f" : "transparent";
                    const rowBorder = rowTone === "locked" ? "#6366f1" : rowTone === "hover" ? "#475569" : "#334155";
                    const rowOutline = rowTone === "locked" ? "0 0 0 1px #6366f155 inset" : "none";
                    return (
                      <tr
                        key={h.homeId}
                        tabIndex={0}
                        aria-selected={rowTone === "locked"}
                        onMouseEnter={() => setHoveredOverviewHomeId(h.homeId)}
                        onMouseLeave={() => setHoveredOverviewHomeId((prev) => (prev === h.homeId ? null : prev))}
                        onFocus={() => setHoveredOverviewHomeId(h.homeId)}
                        onBlur={() => setHoveredOverviewHomeId((prev) => (prev === h.homeId ? null : prev))}
                        onClick={() => toggleOverviewRowLock(h.homeId)}
                        onKeyDown={(e) => onOverviewRowKeyDown(e, h.homeId)}
                        style={{ cursor: "pointer", outline: "none", boxShadow: rowOutline }}
                      >
                        <td style={{ ...TEXT_STYLES.label, padding: isMobile ? "7px 4px" : "9px 5px", color: rowTone === "locked" ? "#a5b4fc" : "#64748b", borderTop: `1px solid ${rowBorder}`, verticalAlign: "top", fontSize: isMobile ? 10 : 12, whiteSpace: "nowrap", background: rowBg }}>
                          #{lockedRank ?? "—"}
                        </td>
                        {overviewColumns.map((col) => {
                          if (col.key === "address") {
                            return (
                              <td key={col.key} style={{ padding: isMobile ? "7px 4px" : "9px 5px", borderTop: `1px solid ${rowBorder}`, verticalAlign: "top", minWidth: isMobile ? 210 : 240, background: rowBg }}>
                                <div style={{ ...TEXT_STYLES.bodyStrong, fontSize: isMobile ? 10 : 12, color: rowTone === "locked" ? "#eef2ff" : "#f1f5f9", lineHeight: 1.25, overflowWrap: "anywhere", whiteSpace: "normal" }}>{overviewAddress(h)}</div>
                                {missingCount > 0 && (
                                  <div style={{ ...TEXT_STYLES.caption, marginTop: 2, fontSize: isMobile ? 9 : 10, color: "#fbbf24" }}>
                                    Missing {missingCount}: {placeholderSummary(h)}
                                  </div>
                                )}
                              </td>
                            );
                          }
                          if (col.type === "factor") {
                            const pair = factorPairForHome(h, col.key);
                            return (
                              <td
                                key={col.key}
                                style={{
                                  padding: isMobile ? "7px 4px" : "9px 5px",
                                  textAlign: col.align,
                                  borderTop: `1px solid ${rowBorder}`,
                                  background: rowBg,
                                  whiteSpace: "nowrap",
                                  fontFamily: FONT_STACKS.sans,
                                  fontSize: isMobile ? 10 : 11,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  verticalAlign: "top",
                                }}
                              >
                                <div style={{ ...TEXT_STYLES.bodyStrong, color: "#e2e8f0", fontSize: isMobile ? 10 : 11, overflow: "hidden", textOverflow: "ellipsis" }}>{pair.raw}</div>
                                <div style={{ ...TEXT_STYLES.captionStrong, marginTop: 1, color: Number.isFinite(pair.scoreNum) ? gradeColor(pair.scoreNum) : "#64748b", fontSize: isMobile ? 9 : 10 }}>
                                  Score: {pair.score}
                                </div>
                              </td>
                            );
                          }
                          const value = col.key === "weightedTotal" ? (h.weightedTotal?.toFixed(2) ?? "—") : "—";
                          const isWeightedTotal = col.key === "weightedTotal";
                          return (
                            <td
                              key={col.key}
                              style={{
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
                                textOverflow: "ellipsis",
                              }}
                            >
                              {value}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 16 }}>
            <h2 style={{ ...sectionTitleStyle, marginBottom: 12 }}>Weighted Score</h2>
            <ResponsiveContainer width="100%" height={260}><BarChart data={overviewRows} margin={{ top: 0, right: 0, bottom: 50, left: 0 }}><XAxis dataKey="short" tick={chartXAxisTickStyle} angle={-35} textAnchor="end" interval={0} height={60} /><YAxis domain={[0, 100]} tick={chartYAxisTickStyle} /><Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontFamily: FONT_STACKS.sans }} labelStyle={chartTooltipLabelStyle} formatter={(v, n) => [n === "weightedTotal" ? Number(v).toFixed(2) : v, n]} /><Bar dataKey="weightedTotal" radius={[4, 4, 0, 0]}>{overviewRows.map((h, i) => <Cell key={h.homeId} fill={COLORS[i % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer>
          </div>
        </div>}

        {tab === "data-entry" && <div style={{ display: "grid", gridTemplateColumns: "minmax(280px,340px) minmax(0,1fr)", gap: 12, alignItems: "start" }}>
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 12, overflowX: "hidden" }}>
            <div style={{ ...cardTitleStyle, marginBottom: 8 }}>Import Data</div>
            <textarea
              value={importRawText}
              onChange={(e) => setImportRawText(e.target.value)}
              placeholder="Paste unformatted listing blocks here. Imports update live."
              style={{ ...inputTextStyle, width: "100%", boxSizing: "border-box", minHeight: 120, resize: "vertical", background: "#0f172a", color: "#f1f5f9", border: "1px solid #334155", borderRadius: 6, padding: "8px 9px", marginBottom: 8, overflowX: "hidden" }}
            />
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <button onClick={downloadBackup} style={{ ...buttonTextStyle, border: "1px solid #334155", background: "#111827", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>Download Backup</button>
              <button onClick={triggerRestoreBackup} style={{ ...buttonTextStyle, border: "1px solid #334155", background: "#111827", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>Restore Backup JSON</button>
              <input ref={restoreBackupInputRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={onRestoreBackupFile} />
              <button onClick={restoreEmbeddedImports} style={{ ...buttonTextStyle, border: "1px solid #334155", background: "#111827", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>Use Embedded Imports</button>
              <button onClick={clearImportText} style={{ ...buttonTextStyle, border: "1px solid #7f1d1d", background: "#3f1d1d", color: "#fecaca", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>Clear Imported Data</button>
            </div>
            {backupNotice && (
              <div style={{ ...TEXT_STYLES.caption, marginBottom: 10, color: backupNotice.startsWith("Restore failed") ? "#fca5a5" : "#86efac" }}>
                {backupNotice}
              </div>
            )}
            <label style={{ ...labelTextStyle, display: "flex", gap: 6, alignItems: "center", marginBottom: 10 }}>
              <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
              Show Hidden (Ruled Out / Sold)
            </label>
            <div style={{ ...captionTextStyle, marginBottom: 12 }}>
              Active imports: {importSummary.importedCount} home(s) from {importSummary.blockCount} block(s)
            </div>
            <div style={{ ...cardTitleStyle, marginBottom: 8 }}>Homes</div>
            <input value={editorQuery} onChange={(e) => setEditorQuery(e.target.value)} placeholder="Search address, status, or id" style={{ ...inputTextStyle, width: "100%", boxSizing: "border-box", background: "#0f172a", color: "#f1f5f9", border: "1px solid #334155", borderRadius: 6, padding: "7px 8px", marginBottom: 10 }} />
            <div style={{ display: "grid", gap: 8, maxHeight: "42vh", overflowY: "auto", overflowX: "hidden", paddingRight: 4 }}>
              {filteredEditorHomes.map((h) => {
                const active = h.homeId === selectedHome?.homeId;
                const missing = getMissingFields(h).length;
                return (
                  <button key={h.homeId} onClick={() => setSelectedHomeId(h.homeId)} style={{ textAlign: "left", padding: 10, borderRadius: 8, border: active ? "1px solid #818cf8" : "1px solid #334155", background: active ? "#0f172a" : "#111827", color: "#f1f5f9", cursor: "pointer" }}>
                    <div style={{ ...TEXT_STYLES.label, color: "#f1f5f9", marginBottom: 2, overflowWrap: "anywhere" }}>{h.name}</div>
                    <div style={{ ...TEXT_STYLES.caption, display: "flex", justifyContent: "space-between", color: "#94a3b8" }}><span>{h.status}</span><span>{h.weightedTotal.toFixed(2)}</span></div>
                    <div style={{ ...TEXT_STYLES.caption, color: missing ? "#fbbf24" : "#64748b", marginTop: 4 }}>{missing ? `${missing} blank field(s)` : "No blank fields"}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ background: "#1e293b", borderRadius: 12, padding: 16 }}>
            {!selectedHome && <div style={bodyMutedTextStyle}>No home selected.</div>}
            {selectedHome && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ ...TEXT_STYLES.heroTitle, fontSize: 18, fontWeight: 800, color: "#f8fafc" }}>{selectedHome.name}</div>
                    <div style={{ ...TEXT_STYLES.label, fontWeight: 500, color: "#94a3b8" }}>{selectedHome.homeId} · Weighted {selectedHome.weightedTotal.toFixed(2)} · {selectedHome.status}</div>
                    {["Ruled Out", "Sold"].includes(selectedHome.status) && (
                      <div style={{ ...TEXT_STYLES.caption, color: "#fbbf24", marginTop: 4 }}>
                        This home is hidden from Overview/Compare/Cards while status is {selectedHome.status}.
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <button onClick={downloadBackup} style={{ ...buttonTextStyle, border: "1px solid #334155", background: "#111827", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>Save Backup</button>
                    <label style={{ ...labelTextStyle, display: "flex", gap: 6, alignItems: "center" }}>
                      <input type="checkbox" checked={showMissingOnly} onChange={(e) => setShowMissingOnly(e.target.checked)} />
                      Show only blank/missing fields
                    </label>
                    {selectedHome.status === "Considering" && (
                      <button onClick={() => setSelectedStatus("Ruled Out")} style={{ ...buttonTextStyle, border: "1px solid #7f1d1d", background: "#3f1d1d", color: "#fecaca", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>Rule Out Home</button>
                    )}
                    {selectedHome.status === "Ruled Out" && (
                      <button onClick={() => setSelectedStatus("Considering")} style={{ ...buttonTextStyle, border: "1px solid #14532d", background: "#052e16", color: "#bbf7d0", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>Restore Home</button>
                    )}
                    <button onClick={resetSelectedHome} style={{ ...buttonTextStyle, border: "1px solid #334155", background: "#0f172a", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>Reset Selected Home</button>
                    <button onClick={resetAllEdits} style={{ ...buttonTextStyle, border: "1px solid #7f1d1d", background: "#3f1d1d", color: "#fecaca", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>Reset All Local Edits</button>
                  </div>
                </div>

                {visibleEditGroups.length === 0 && <div style={bodyMutedTextStyle}>No blank fields left on this home.</div>}
                <div style={{ display: "grid", gap: 14 }}>
                  {visibleEditGroups.map((group) => (
                    <div key={group.title} style={{ border: "1px solid #334155", borderRadius: 10, padding: 12 }}>
                      <div style={{ ...cardTitleStyle, marginBottom: 10 }}>{group.title}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
                        {group.fields.map((field) => {
                          const key = field.key;
                          const currentValue = selectedHome[key];
                          const sourceValue = selectedSource?.[key];
                          const overrideValue = selectedOverrides[key];
                          const hasOverride = Object.prototype.hasOwnProperty.call(selectedOverrides, key);
                          const hasPlaceholder = getMissingFields(selectedHome).includes(key);
                          const error = selectedErrors[key];
                          const draftValue = selectedDrafts[key];
                          let inputValue = "";
                          if (field.type === "number") {
                            if (draftValue != null) {
                              inputValue = draftValue;
                            } else if (key === "hoa") {
                              const annualValue = hasOverride ? overrideValue : currentValue;
                              const monthlyValue = hoaAnnualToMonthly(annualValue);
                              inputValue = monthlyValue == null ? "" : String(monthlyValue);
                            } else if (hasOverride) {
                              inputValue = overrideValue == null ? "" : String(overrideValue);
                            } else {
                              inputValue = currentValue == null ? "" : String(currentValue);
                            }
                          } else {
                            if (hasOverride) inputValue = overrideValue == null ? "" : String(overrideValue);
                            else inputValue = currentValue ?? "";
                          }

                          if (field.type === "tags") {
                            const tags = Array.isArray(selectedHome.tags) ? selectedHome.tags : [];
                            return (
                              <div key={key} style={{ gridColumn: "1 / -1", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: 10 }}>
                                <div style={{ ...labelTextStyle, color: "#e2e8f0", marginBottom: 8 }}>Tags</div>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                                  {tags.map((tag) => <button key={tag} onClick={() => removeTag(tag)} style={{ ...captionStrongTextStyle, background: "#111827", border: "1px solid #334155", borderRadius: 999, padding: "3px 8px", cursor: "pointer" }}>{tag} ×</button>)}
                                </div>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} placeholder="Add tag/note" style={{ ...inputTextStyle, flex: 1, background: "#111827", color: "#f1f5f9", border: "1px solid #334155", borderRadius: 6, padding: "6px 8px" }} />
                                  <button onClick={addTag} style={{ ...buttonTextStyle, border: "1px solid #334155", background: "#1f2937", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>Add</button>
                                </div>
                                <div style={{ ...captionTextStyle, marginTop: 6 }}>Base: {displayFieldValue(sourceValue)} · Override: {hasOverride ? displayFieldValue(overrideValue) : "—"}</div>
                              </div>
                            );
                          }

                          return (
                            <div key={key} style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: 10 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                <label style={{ ...labelTextStyle, color: "#e2e8f0" }}>{field.label}</label>
                                {hasPlaceholder && <span style={{ ...TEXT_STYLES.eyebrow, color: "#fbbf24", border: "1px solid #fbbf2444", borderRadius: 999, padding: "2px 6px" }}>placeholder</span>}
                              </div>
                              {field.type === "select" && (
                                <select value={inputValue} onChange={(e) => onTextChange(selectedHome.homeId, key, e.target.value)} style={{ ...inputTextStyle, width: "100%", background: "#111827", color: "#f1f5f9", border: "1px solid #334155", borderRadius: 6, padding: "6px 8px" }}>
                                  <option value="">(clear)</option>
                                  {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                                </select>
                              )}
                              {field.type === "number" && (
                                <input value={inputValue} onChange={(e) => onNumericChange(selectedHome.homeId, key, e.target.value)} onBlur={() => onNumericBlur(selectedHome.homeId, key)} style={{ ...inputTextStyle, width: "100%", background: "#111827", color: "#f1f5f9", border: error ? "1px solid #ef4444" : "1px solid #334155", borderRadius: 6, padding: "6px 8px" }} />
                              )}
                              {field.type === "text" && (
                                <input value={inputValue} onChange={(e) => onTextChange(selectedHome.homeId, key, e.target.value)} style={{ ...inputTextStyle, width: "100%", background: "#111827", color: "#f1f5f9", border: "1px solid #334155", borderRadius: 6, padding: "6px 8px" }} />
                              )}
                              {error && <div style={{ ...TEXT_STYLES.caption, color: "#fca5a5", marginTop: 4 }}>{error}</div>}
                              <div style={{ ...captionTextStyle, marginTop: 6 }}>
                                Base: {key === "hoa" ? displayHoaFieldValue(sourceValue) : displayFieldValue(sourceValue)}
                              </div>
                              <div style={captionTextStyle}>
                                Override: {hasOverride ? (key === "hoa" ? displayHoaFieldValue(overrideValue) : displayFieldValue(overrideValue)) : "—"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>}

        {tab === "compare" && <div style={{ fontFamily: FONT_STACKS.sans }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginBottom: 12 }}>
            {[["A", compareA, setCompareA, "#6366f1"], ["B", compareB, setCompareB, "#f59e0b"], ["C", compareC, setCompareC, "#22c55e"]].map(([label, val, setter, color]) => {
              const slotHome = pick(val, null);
              const missingCount = slotHome ? getMissingFields(slotHome).length : 0;
              return (
                <div key={label} style={{ background: "#1e293b", borderRadius: 12, padding: 12 }}>
                  <div style={{ ...labelTextStyle, color, marginBottom: 6 }}>Home {label}</div>
                  <select value={val} onChange={(e) => setter(e.target.value)} style={selectStyle}>
                    <option value={EMPTY}>Blank</option>
                    {homes.map((h) => <option key={h.homeId} value={h.homeId}>{h.name}</option>)}
                  </select>
                  {slotHome && (
                    <div style={{ ...TEXT_STYLES.caption, marginTop: 8, color: missingCount ? "#fbbf24" : "#64748b" }}>
                      {missingCount ? `Missing ${missingCount}: ${placeholderSummary(slotHome)}` : "No missing fields"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 12, marginBottom: 12 }}>
            <div style={{ background: "#1e293b", borderRadius: 12, padding: 16 }}>
              <div style={{ ...cardTitleStyle, marginBottom: 4 }}>Raw Score Radar</div>
              <div style={{ ...captionTextStyle, marginBottom: 6 }}>Each axis uses the raw factor score (0-100).</div>
              <ResponsiveContainer width="100%" height={340}>
                <RadarChart data={rawRadarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" tick={chartXAxisTickStyle} />
                  <Tooltip
                    formatter={(v) => {
                      const n = typeof v === "number" ? v : Number(v);
                      return [Number.isFinite(n) ? n.toFixed(2) : "—", "Raw Score"];
                    }}
                    contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontFamily: FONT_STACKS.sans }}
                    labelStyle={chartTooltipLabelStyle}
                  />
                  {a && <Radar name={a.short} dataKey="a" stroke="#6366f1" fill="#6366f1" fillOpacity={0.16} />}
                  {b && <Radar name={b.short} dataKey="b" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.14} />}
                  {c && <Radar name={c.short} dataKey="c" stroke="#22c55e" fill="#22c55e" fillOpacity={0.12} />}
                  <Legend wrapperStyle={chartLegendStyle} formatter={chartLegendFormatter} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: "#1e293b", borderRadius: 12, padding: 16 }}>
              <div style={{ ...cardTitleStyle, marginBottom: 4 }}>Weighted Impact Radar</div>
              <div style={{ ...captionTextStyle, marginBottom: 6 }}>Each axis uses weighted contribution points (score x effective weight).</div>
              <ResponsiveContainer width="100%" height={340}>
                <RadarChart data={weightedRadarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" tick={chartXAxisTickStyle} />
                  <Tooltip
                    formatter={(v) => {
                      const n = typeof v === "number" ? v : Number(v);
                      return [Number.isFinite(n) ? `${n.toFixed(2)} pts` : "—", "Weighted Impact"];
                    }}
                    contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontFamily: FONT_STACKS.sans }}
                    labelStyle={chartTooltipLabelStyle}
                  />
                  {a && <Radar name={`${a.short} (pts)`} dataKey="a" stroke="#6366f1" fill="#6366f1" fillOpacity={0.16} />}
                  {b && <Radar name={`${b.short} (pts)`} dataKey="b" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.14} />}
                  {c && <Radar name={`${c.short} (pts)`} dataKey="c" stroke="#22c55e" fill="#22c55e" fillOpacity={0.12} />}
                  <Legend wrapperStyle={chartLegendStyle} formatter={chartLegendFormatter} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 16, overflowX: "auto" }}>
            <table style={compareTableStyle}>
              <thead>
                <tr>
                  <th style={{ ...compareHeaderCellStyle, textAlign: "left", color: "#94a3b8" }}>Metric</th>
                  <th style={{ ...compareHeaderCellStyle, color: compareHeaderColors[0] }}>{a?.short ?? "Blank"}</th>
                  <th style={{ ...compareHeaderCellStyle, color: compareHeaderColors[1] }}>{b?.short ?? "Blank"}</th>
                  <th style={{ ...compareHeaderCellStyle, color: compareHeaderColors[2] }}>{c?.short ?? "Blank"}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={compareMetricCellStyle}>Weighted Score</td>
                  {compareViewModel.weightedTotals.map((value, i) => {
                    const isBest = Number.isFinite(value) && Number.isFinite(compareViewModel.bestWeightedScore) && value === compareViewModel.bestWeightedScore;
                    return (
                      <td
                        key={`weighted-${i}`}
                        style={{
                          fontFamily: FONT_STACKS.sans,
                          padding: "8px 6px",
                          textAlign: "right",
                          borderTop: "1px solid #334155",
                          color: "#f1f5f9",
                          fontWeight: isBest ? 800 : 700,
                          background: isBest ? "#33415555" : "transparent",
                        }}
                      >
                        {Number.isFinite(value) ? value.toFixed(2) : "—"}
                      </td>
                    );
                  })}
                </tr>
                {compareViewModel.factors.map((row) => {
                  return (
                    <tr key={row.key}>
                      <td style={compareMetricCellStyle}>{row.label}</td>
                      {row.pairs.map((pair, i) => {
                        const scoreNum = pair?.scoreNum;
                        const isBest = Number.isFinite(scoreNum) && Number.isFinite(row.bestScore) && scoreNum === row.bestScore;
                        return (
                          <td
                            key={`${row.key}-${i}`}
                            style={{
                              fontFamily: FONT_STACKS.sans,
                              padding: "8px 6px",
                              textAlign: "right",
                              borderTop: "1px solid #334155",
                              background: isBest ? "#33415555" : "transparent",
                            }}
                          >
                            <div style={compareValueCellStyle}>{pair?.raw ?? "—"}</div>
                            <div style={{ ...compareScoreCellStyle, color: "#94a3b8", fontWeight: 700 }}>
                              Score: {pair?.score ?? "—"}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>}

        {tab === "cards" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
            {homes.map((h, i) => {
              const missingFields = getMissingFields(h);
              const imageKey = getImageKey(h);
              const showPhoto = h.photo && !failedImageKeys.has(imageKey);
              const cardFactorPairs = cardFactorPairsByHomeId.get(h.homeId) ?? {};
              return (
                <div key={h.homeId} style={{ background: "#1e293b", borderRadius: 16, padding: 16, boxShadow: "0 8px 20px rgba(0,0,0,.25)", border: `1px solid ${gradeColor(h.weightedTotal)}33` }}>
                  {showPhoto ? (
                    <div style={IMG_WRAP_STYLE}>
                      <img
                        src={h.photo}
                        alt={h.name}
                        loading="lazy"
                        decoding="async"
                        width="320"
                        height="180"
                        style={{ width: "100%", height: "auto", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }}
                        onError={() => markImageFailed(h)}
                      />
                    </div>
                  ) : null}
                  <div data-fallback="true" style={{ ...NO_PHOTO_STYLE, display: showPhoto ? "none" : "flex" }}>NO PHOTO</div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                    <div>
                      <div style={eyebrowTextStyle}>#{i + 1} RANKED</div>
                      <div style={{ ...TEXT_STYLES.heroTitle, fontSize: 16, fontWeight: 800, color: "#f8fafc", lineHeight: 1.2 }}>{h.short}</div>
                      <div style={{ ...TEXT_STYLES.label, fontWeight: 500, color: "#94a3b8", marginTop: 2 }}>{h.name}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ ...metricTextStyle, color: gradeColor(h.weightedTotal) }}>{h.weightedTotal.toFixed(2)}</div>
                      <div style={{ ...TEXT_STYLES.captionStrong, color: gradeColor(h.weightedTotal) }}>{h.grade}</div>
                    </div>
                  </div>
                  {missingFields.length > 0 && (
                    <div style={{ ...TEXT_STYLES.caption, marginBottom: 10, padding: "7px 9px", borderRadius: 8, background: "#3f2a12", border: "1px solid #f59e0b55", color: "#fbbf24" }}>
                      Missing data: {missingFields.length} field(s) ({placeholderSummary(h, 4)})
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>{CARD_FIELDS(h).map(([label, value]) => <CardMetric key={label} label={label} value={value} />)}</div>
                  <div style={{ marginBottom: 10, borderTop: "1px solid #334155", borderBottom: "1px solid #334155", padding: "8px 0" }}>
                    <div style={{ ...TEXT_STYLES.eyebrow, color: "#94a3b8", marginBottom: 8 }}>Scored Factors (Raw + Score)</div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {scoredFactorSpecs.map((spec) => {
                        const pair = cardFactorPairs[spec.key] ?? { raw: "", score: "", scoreNum: null };
                        return (
                          <div key={`${h.homeId}-${spec.key}`} style={{ display: "grid", gap: 5 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={captionStrongTextStyle}>{spec.label}</div>
                                <div style={{ ...captionTextStyle, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pair.raw}</div>
                              </div>
                              <div style={{ ...TEXT_STYLES.label, color: Number.isFinite(pair.scoreNum) ? gradeColor(pair.scoreNum) : "#64748b", fontWeight: 800, whiteSpace: "nowrap" }}>
                                {pair.score}
                              </div>
                            </div>
                            <ScoreBar value={pair.scoreNum} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 8, borderTop: "1px solid #334155" }}>
                    {missingFields.map((fieldKey) => (
                      <span key={`missing-${fieldKey}`} style={{ ...TEXT_STYLES.caption, color: "#fbbf24", background: "#3f2a12", border: "1px solid #f59e0b55", borderRadius: 999, padding: "3px 8px" }}>
                        Missing: {placeholderLabel(fieldKey)}
                      </span>
                    ))}
                    {(h.tags || []).map((tag) => <span key={tag} style={{ ...captionStrongTextStyle, background: "#0f172a", border: "1px solid #334155", borderRadius: 999, padding: "3px 8px" }}>{tag}</span>)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "weights" && (
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <h2 style={{ ...sectionTitleStyle, margin: 0 }}>Interactive Weights</h2>
              <button
                onClick={resetWeightsToDefault}
                style={{ ...buttonTextStyle, border: "1px solid #334155", background: "#111827", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}
              >
                Reset Weights
              </button>
            </div>
            <div style={{ ...TEXT_STYLES.label, fontWeight: 500, color: "#94a3b8", marginBottom: 12 }}>{weightsSubtitle}</div>
            <div style={{ display: "grid", gap: 10 }}>
              {weightRows.map((row) => {
                const rawPercent = +((row.raw ?? 0) * 100).toFixed(1);
                const effectivePercent = +((row.effective ?? 0) * 100).toFixed(1);
                return (
                  <div key={row.key} style={{ border: "1px solid #334155", borderRadius: 10, background: "#0f172a", padding: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
                      <div style={{ ...cardTitleStyle, color: "#e2e8f0" }}>{row.label}</div>
                      <div style={{ ...TEXT_STYLES.label, display: "flex", gap: 10, fontWeight: 500, color: "#94a3b8" }}>
                        <span>Raw: {rawPercent.toFixed(1)}%</span>
                        <span style={{ color: "#cbd5e1" }}>Effective: {effectivePercent.toFixed(1)}%</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      step={0.5}
                      value={rawPercent}
                      onChange={(e) => onWeightSliderChange(row.key, e.target.value)}
                      style={{ width: "100%", accentColor: "#6366f1" }}
                    />
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 14, borderTop: "1px solid #334155", paddingTop: 12 }}>
              <div style={{ ...cardTitleStyle, marginBottom: 4 }}>Impact Audit</div>
              <div style={{ ...captionTextStyle, marginBottom: 8 }}>
                Weak factors are those with weighted spread below {IMPACT_AUDIT_THRESHOLD.toFixed(1)} points across visible homes. Weak factors with variation are auto-stretched to a {IMPACT_STRETCH_MIN_SCORE}-{IMPACT_STRETCH_MAX_SCORE} score band.
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 760 }}>
                  <thead>
                    <tr>
                      <th style={{ ...TEXT_STYLES.label, textAlign: "left", padding: "7px 6px", color: "#94a3b8" }}>Factor</th>
                      <th style={{ ...TEXT_STYLES.label, textAlign: "right", padding: "7px 6px", color: "#94a3b8" }}>Eff Wt</th>
                      <th style={{ ...TEXT_STYLES.label, textAlign: "right", padding: "7px 6px", color: "#94a3b8" }}>Score Min</th>
                      <th style={{ ...TEXT_STYLES.label, textAlign: "right", padding: "7px 6px", color: "#94a3b8" }}>Score Max</th>
                      <th style={{ ...TEXT_STYLES.label, textAlign: "right", padding: "7px 6px", color: "#94a3b8" }}>Spread</th>
                      <th style={{ ...TEXT_STYLES.label, textAlign: "right", padding: "7px 6px", color: "#94a3b8" }}>Weighted (Before)</th>
                      <th style={{ ...TEXT_STYLES.label, textAlign: "right", padding: "7px 6px", color: "#94a3b8" }}>Weighted (After)</th>
                      <th style={{ ...TEXT_STYLES.label, textAlign: "left", padding: "7px 6px", color: "#94a3b8" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {impactAudit.rows.map((row) => {
                      const badge = auditStatusStyle(row.status);
                      return (
                        <tr key={row.key}>
                          <td style={{ ...bodyStrongTextStyle, fontSize: 12, padding: "7px 6px", borderTop: "1px solid #334155" }}>{row.label}</td>
                          <td style={{ ...labelTextStyle, fontWeight: 500, padding: "7px 6px", borderTop: "1px solid #334155", textAlign: "right" }}>{(row.effectiveWeight * 100).toFixed(1)}%</td>
                          <td style={{ ...labelTextStyle, fontWeight: 500, padding: "7px 6px", borderTop: "1px solid #334155", textAlign: "right" }}>{Number.isFinite(row.min) ? row.min.toFixed(1) : "—"}</td>
                          <td style={{ ...labelTextStyle, fontWeight: 500, padding: "7px 6px", borderTop: "1px solid #334155", textAlign: "right" }}>{Number.isFinite(row.max) ? row.max.toFixed(1) : "—"}</td>
                          <td style={{ ...labelTextStyle, fontWeight: 500, padding: "7px 6px", borderTop: "1px solid #334155", textAlign: "right" }}>{row.spread.toFixed(1)}</td>
                          <td style={{ ...labelTextStyle, fontWeight: 500, padding: "7px 6px", borderTop: "1px solid #334155", textAlign: "right" }}>{row.weightedSpreadBefore.toFixed(2)}</td>
                          <td style={{ ...labelTextStyle, fontWeight: 500, padding: "7px 6px", color: row.weightedSpreadAfter > row.weightedSpreadBefore ? "#86efac" : "#cbd5e1", borderTop: "1px solid #334155", textAlign: "right" }}>{row.weightedSpreadAfter.toFixed(2)}</td>
                          <td style={{ padding: "7px 6px", borderTop: "1px solid #334155" }}>
                            <span style={{ ...TEXT_STYLES.captionStrong, ...badge, borderRadius: 999, padding: "2px 8px" }}>{row.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
