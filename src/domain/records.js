import {
  ADDRESS_BLOCK_REGEX,
  DEFAULT_TAX_RATE,
  MERIDIAN_RANCH_HOA_ANNUAL,
  PLACEHOLDER_TAGS_ENABLED,
  SAFETY_SCORING_ENABLED,
  TAX_RATE_BY_ZIP,
} from '../shared/constants.js';
import { DEFAULT_EDITABLE_KEYS, KITCHEN_VALUES, PLACEHOLDER_FIELD_LABELS, STATUS_VALUES, YARD_VALUES } from '../data/editorConfig.js';

const LEGACY_OVERRIDES_TO_DROP = {
  "imported-mls-9798133": {
    photo: "https://photos.zillowstatic.com/fp/1d62f5d430620693791ce58ae53e9561-cc_ft_576.webp",
  },
  "imported-mls-6303123": {
    photo: "https://photos.zillowstatic.com/fp/7afbcd15e87a547993c5a2cfe3c7a4bf-cc_ft_1152.webp",
  },
  "imported-mls-3822228": {
    photo: "https://photos.zillowstatic.com/fp/9454bf9d14ce57b0fd2cac0b3ce61ca2-cc_ft_576.webp",
  },
  "imported-mls-8141032": {
    photo: "https://photos.zillowstatic.com/fp/93c464e5ef4a1e9039187e85b830ce0c-cc_ft_1152.webp",
  },
  "imported-mls-4495204": {
    photo: "https://photos.zillowstatic.com/fp/eed6a6d2c90419ed05eda79fe4cf64df-cc_ft_1152.webp",
  },
  "imported-mls-1957788": {
    photo: "https://photos.zillowstatic.com/fp/2ed95dcbadb317cf13cdd61e0a4a5d97-cc_ft_576.webp",
  },
  "imported-mls-9271246": {
    photo: "https://photos.zillowstatic.com/fp/23b9aa89859e5c69b90022c0168b775d-cc_ft_576.webp",
  },
};
const migrateOverrides = (candidate) => {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return {};
  const migrated = {};
  Object.entries(candidate).forEach(([homeId, values]) => {
    if (!values || typeof values !== "object" || Array.isArray(values)) return;
    const nextValues = { ...values };
    const dropRules = LEGACY_OVERRIDES_TO_DROP[homeId];
    if (dropRules) {
      Object.entries(dropRules).forEach(([key, legacyValue]) => {
        if (nextValues[key] === legacyValue) delete nextValues[key];
      });
    }
    if (Object.keys(nextValues).length) migrated[homeId] = nextValues;
  });
  return migrated;
};
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
const editableValuesEqual = (left, right) => {
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, idx) => value === right[idx]);
  }
  return left === right;
};
const hydrateOverridesFromHomesPayload = (rawOverrides, homesPayload, sourceById, editableKeys = DEFAULT_EDITABLE_KEYS) => {
  const hydrated = migrateOverrides(rawOverrides);
  if (!Array.isArray(homesPayload) || !homesPayload.length || !sourceById || typeof sourceById !== "object") {
    return hydrated;
  }
  const next = { ...hydrated };
  homesPayload.forEach((home) => {
    const homeId = home?.homeId;
    const sourceHome = homeId ? sourceById[homeId] : null;
    if (!homeId || !sourceHome) return;
    const currentHome = { ...(next[homeId] ?? {}) };
    let changed = false;
    editableKeys.forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(home, key)) return;
      if (Object.prototype.hasOwnProperty.call(currentHome, key)) return;
      const homeValue = home[key];
      const sourceValue = sourceHome[key];
      if (editableValuesEqual(homeValue, sourceValue)) return;
      currentHome[key] = homeValue ?? null;
      changed = true;
    });
    if (!changed) return;
    if (Object.keys(currentHome).length) next[homeId] = currentHome;
    else delete next[homeId];
  });
  return next;
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
  const numericText = raw.match(/-?[0-9,.]+/)?.[0] ?? raw;
  const n = toNum(numericText);
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
const PHOTO_CACHE_BUST_VERSION = "20260316e";
const resolvePhotoSrc = (photo) => {
  const raw = pickText(photo);
  if (!raw) return null;
  if (/^(?:data:|blob:)/i.test(raw)) return raw;
  const addCacheBust = (value) => {
    try {
      const url = new URL(value, typeof window === "undefined" ? "http://localhost/" : window.location.href);
      url.searchParams.set("homeCompPhotoVersion", PHOTO_CACHE_BUST_VERSION);
      if (typeof window === "undefined" && /^https?:/i.test(raw)) return url.toString();
      if (typeof window === "undefined") {
        return `${url.pathname}${url.search}${url.hash}`;
      }
      return url.toString();
    } catch {
      const joiner = value.includes("?") ? "&" : "?";
      return `${value}${joiner}homeCompPhotoVersion=${PHOTO_CACHE_BUST_VERSION}`;
    }
  };
  if (/^https?:/i.test(raw)) return addCacheBust(raw);
  if (typeof window === "undefined") return addCacheBust(raw);
  try {
    return addCacheBust(new URL(raw, window.location.href).toString());
  } catch {
    return addCacheBust(raw);
  }
};
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
const AVERAGE_BENCHMARK_HOME_ID = "benchmark-average-visible";
const KITCHEN_ORDER = ["Small", "Medium", "Large", "Gourmet"];
const YARD_ORDER = ["Poor", "Fair", "Good", "Excellent"];
const averageFiniteNumbers = (values, digits = 2) => {
  const nums = (values || []).map((value) => toNum(value)).filter((value) => Number.isFinite(value));
  if (!nums.length) return null;
  const avg = nums.reduce((sum, value) => sum + value, 0) / nums.length;
  if (!Number.isFinite(avg)) return null;
  return digits == null ? avg : +avg.toFixed(digits);
};
const averageOrdinalValue = (values, order) => {
  const numericValues = (values || [])
    .map((value) => order.indexOf(pickText(value)))
    .filter((value) => value >= 0);
  if (!numericValues.length) return order[Math.max(0, Math.floor((order.length - 1) / 2))] ?? null;
  const avgIndex = Math.round(numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length);
  return order[Math.max(0, Math.min(order.length - 1, avgIndex))] ?? null;
};
const buildAverageBenchmarkHome = (homes) => {
  if (!Array.isArray(homes) || !homes.length) return null;
  return {
    homeId: AVERAGE_BENCHMARK_HOME_ID,
    sourceType: "benchmark",
    isSyntheticBenchmark: true,
    name: "Average Home",
    short: "Average",
    status: "Benchmark",
    photo: null,
    price: averageFiniteNumbers(homes.map((home) => home?.price), 2),
    sqft: averageFiniteNumbers(homes.map((home) => home?.sqft), 2),
    lotSqft: averageFiniteNumbers(homes.map((home) => home?.lotSqft), 2),
    built: (() => {
      const avgBuilt = averageFiniteNumbers(homes.map((home) => home?.built), null);
      return Number.isFinite(avgBuilt) ? Math.round(avgBuilt) : null;
    })(),
    hoa: averageFiniteNumbers(homes.map((home) => home?.hoa), 2),
    tax: averageFiniteNumbers(homes.map((home) => home?.tax), 2),
    dom: averageFiniteNumbers(homes.map((home) => home?.dom), 0),
    greg: averageFiniteNumbers(homes.map((home) => home?.greg), 2),
    bre: averageFiniteNumbers(homes.map((home) => home?.bre), 2),
    neighborhood: averageFiniteNumbers(homes.map((home) => home?.neighborhood), 2),
    aestheticsRating: averageFiniteNumbers(homes.map((home) => home?.aestheticsRating), 2),
    kitchenSize: averageOrdinalValue(homes.map((home) => home?.kitchenSize), KITCHEN_ORDER) ?? "Medium",
    yardCondition: averageOrdinalValue(homes.map((home) => home?.yardCondition), YARD_ORDER) ?? "Good",
    masterBedSqft: averageFiniteNumbers(homes.map((home) => home?.masterBedSqft), 2),
    safetyAssaultIndex: averageFiniteNumbers(homes.map((home) => home?.safetyAssaultIndex), 2),
    safetyBurglaryIndex: averageFiniteNumbers(homes.map((home) => home?.safetyBurglaryIndex), 2),
    safetyLarcenyTheftIndex: averageFiniteNumbers(homes.map((home) => home?.safetyLarcenyTheftIndex), 2),
    safetyVehicleTheftIndex: averageFiniteNumbers(homes.map((home) => home?.safetyVehicleTheftIndex), 2),
    safetyNeighborhood: "Average of visible homes",
    safetyGrade: null,
    tags: [],
    placeholderFields: [],
    defaultedFields: [],
    blankFields: [],
  };
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
  const importDefaultBlankFields = [];
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
  const kitchenText = pickText(home.kitchenSize);
  const preserveKitchenBlank = !kitchenText && (hasOverride("kitchenSize") || (isImported && !hasOverride("kitchenSize")));
  const kitchenSize = preserveKitchenBlank ? "" : asKitchen(home.kitchenSize);
  if (
    !pickText(home.kitchenSize) ||
    (isImported && kitchenSize === "Medium" && !hasOverride("kitchenSize"))
  ) placeholderFields.push("kitchenSize");
  if (!kitchenText && isImported && !hasOverride("kitchenSize")) importDefaultBlankFields.push("kitchenSize");
  const yardText = pickText(home.yardCondition);
  const preserveYardBlank = !yardText && (hasOverride("yardCondition") || (isImported && !hasOverride("yardCondition")));
  const yardCondition = preserveYardBlank ? "" : asYard(home.yardCondition);
  if (
    !pickText(home.yardCondition) ||
    (isImported && yardCondition === "Good" && !hasOverride("yardCondition"))
  ) placeholderFields.push("yardCondition");
  if (!yardText && isImported && !hasOverride("yardCondition")) importDefaultBlankFields.push("yardCondition");
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
    importDefaultBlankFields,
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
    const masterBedSqft = toNum(capture(/Master(?:\s+Bed(?:room)?)?\s*Sqft:\s*([0-9,]+(?:\.[0-9]+)?)/i));
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
      "Type", "Year Built", "Lot Size Area", "Master Bed Sqft", "Master Bedroom Sqft", "Parking Spots", "Heating", "Cooling", "HOA Fee", "County/Parish",
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
        sourceType: "imported",
        status: "Considering",
        price,
        pricePerSqft: ppsf,
        sqft,
        lotSqft: parseLotSqft(lotRaw),
        masterBedSqft,
        built,
        dom,
        hoa: fromAnnual(hoaRaw, hoaCadence),
        tax,
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

export {
  LEGACY_OVERRIDES_TO_DROP,
  migrateOverrides,
  mergeOverrides,
  hydrateOverridesFromHomesPayload,
  ppsfToPrice,
  toNum,
  hoaAnnualToMonthly,
  hoaMonthlyToAnnual,
  parseLotSqft,
  toDateKey,
  parseDateKey,
  dayDiff,
  extractZip,
  pickText,
  resolvePhotoSrc,
  derivedShort,
  asStatus,
  asKitchen,
  asYard,
  asTags,
  AVERAGE_BENCHMARK_HOME_ID,
  KITCHEN_ORDER,
  YARD_ORDER,
  averageFiniteNumbers,
  averageOrdinalValue,
  buildAverageBenchmarkHome,
  slugify,
  fromAnnual,
  normalizeHomeRecord,
  parseUnformattedHomes,
  splitImportBlocks,
  mergeImportRawText,
};
