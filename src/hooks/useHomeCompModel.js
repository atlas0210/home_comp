import { React, useEffect, useMemo, useRef, useState } from '../shared/runtime.js';
import { EDIT_GROUPS } from '../data/editorConfig.js';
import { homesRaw } from '../data/baselineHomes.js';
import { COLORS, FONT_STACKS, IMG_WRAP_STYLE, NO_PHOTO_STYLE, TEXT_STYLES } from '../shared/uiTokens.js';
import { CURRENT_YEAR, DOM_ROLL_DATE_KEY, EMPTY, IMPACT_AUDIT_THRESHOLD, IMPACT_STRETCH_MAX_SCORE, IMPACT_STRETCH_MIN_SCORE, SAFETY_SCORING_ENABLED, SHARE_STATE_HASH_KEY, SHARE_STATE_SCHEMA_VERSION } from '../shared/constants.js';
import { copyTextToClipboard } from '../domain/clipboard.js';
import { CARD_FIELDS, RADAR, SCORED_FACTOR_BASE, arraysEqual, displayFieldValue, displayHoaFieldValue, fmtCompactUsd, getImageKey, getMissingFields, gradeColor, placeholderLabel, placeholderSummary } from '../domain/display.js';
import { buildRangeContext, calc, applyImpactStretch, estimateMonthlyTotal } from '../domain/scoring.js?v=20260317d';
import { decodeShareSnapshot, encodeShareSnapshot } from '../domain/share.js';
import { activeDefaultRawTicks, alignActiveRawWeights, DEFAULT_RAW_WEIGHT_POINTS, IMPACT_AUDIT_FACTOR_KEYS, isDefaultRawWeights, normalizeEffectiveWeights, parseMaybeNumber, RAW_WEIGHT_EPS, rebalanceLinkedRawWeights, sanitizeRawWeights, WEIGHT_KEYS, WEIGHT_LABELS, quantizeRawWeight } from '../domain/weights.js';
import { buildAverageBenchmarkHome, dayDiff, hoaAnnualToMonthly, hoaMonthlyToAnnual, hydrateOverridesFromHomesPayload, mergeImportRawText, mergeOverrides, migrateOverrides, normalizeHomeRecord, parseUnformattedHomes, resolvePhotoSrc, slugify, toDateKey, toNum } from '../domain/records.js?v=20260317d';

export function useHomeCompModel({ seedOverridesByHomeId = {}, seedImportRawText = "" } = {}) {
  const FINALIST_HOME_ID_ORDER = ["base-4", "imported-mls-4495204", "imported-mls-8141032"];
  const LOCAL_STORAGE_KEY = "homeComp.overrides.v3";
  const LOCAL_IMPORT_STORAGE_KEY = "homeComp.importRaw.v2";
  const LOCAL_WEIGHT_STORAGE_KEY = "homeComp.weights.v2";
  const committedOverridesByHomeId = seedOverridesByHomeId && typeof seedOverridesByHomeId === "object" && !Array.isArray(seedOverridesByHomeId)
    ? seedOverridesByHomeId
    : {};
  const committedImportRawText = typeof seedImportRawText === "string" ? seedImportRawText : "";
  const SEEDED_IMPORTED_PHOTO_HOME_IDS = new Set(
    Object.entries(committedOverridesByHomeId)
      .filter(([homeId, values]) => homeId.startsWith("imported-") && typeof values?.photo === "string" && values.photo.trim())
      .map(([homeId]) => homeId)
  );
  const getSeededImportedPhoto = (homeId) => {
    if (!homeId || !SEEDED_IMPORTED_PHOTO_HOME_IDS.has(homeId)) return null;
    const photo = committedOverridesByHomeId[homeId]?.photo;
    return typeof photo === "string" && photo.trim() ? photo.trim() : null;
  };
  const sanitizeIncomingOverrides = (candidate) => {
    const migrated = migrateOverrides(candidate);
    let changed = false;
    const next = { ...migrated };
    SEEDED_IMPORTED_PHOTO_HOME_IDS.forEach((homeId) => {
      const incoming = next[homeId];
      if (!incoming || !Object.prototype.hasOwnProperty.call(incoming, "photo")) return;
      const seededPhoto = getSeededImportedPhoto(homeId);
      const incomingPhoto = typeof incoming.photo === "string" ? incoming.photo.trim() : incoming.photo;
      if (!seededPhoto || incomingPhoto === seededPhoto) return;
      const nextHome = { ...incoming };
      nextHome.photo = seededPhoto;
      changed = true;
      next[homeId] = nextHome;
    });
    return changed ? next : migrated;
  };
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === "undefined" ? 1280 : window.innerWidth));
  const [failedImageKeys, setFailedImageKeys] = useState(() => new Set());
  const isMobile = viewportWidth <= 768;
  const [importRawText, setImportRawText] = useState(() => {
    if (typeof window === "undefined") return committedImportRawText;
    const fromLocal = window.localStorage.getItem(LOCAL_IMPORT_STORAGE_KEY);
    if (fromLocal != null && fromLocal.trim()) return mergeImportRawText(committedImportRawText, fromLocal);
    return committedImportRawText;
  });
  useEffect(() => {
    setImportRawText((prev) => {
      const merged = mergeImportRawText(committedImportRawText, prev);
      return merged === prev ? prev : merged;
    });
  }, [committedImportRawText]);
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
    if (typeof window === "undefined") return mergeOverrides(committedOverridesByHomeId, {});
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return mergeOverrides(committedOverridesByHomeId, {});
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object"
        ? mergeOverrides(committedOverridesByHomeId, sanitizeIncomingOverrides(parsed))
        : mergeOverrides(committedOverridesByHomeId, {});
    } catch {
      return mergeOverrides(committedOverridesByHomeId, {});
    }
  });
  const [tab, setTab] = useState("overview");
  const [compareA, setCompareA] = useState(FINALIST_HOME_ID_ORDER[0]);
  const [compareB, setCompareB] = useState(FINALIST_HOME_ID_ORDER[1]);
  const [compareC, setCompareC] = useState(FINALIST_HOME_ID_ORDER[2]);
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
  const snapshotHashAppliedRef = useRef(false);
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
  useEffect(() => {
    if (typeof window === "undefined" || snapshotHashAppliedRef.current) return;
    snapshotHashAppliedRef.current = true;
    const snapshot = decodeShareSnapshot(window.location.hash);
    if (!snapshot) return;
    const maybeOverrides = sanitizeIncomingOverrides(snapshot?.overridesByHomeId);
    if (maybeOverrides && typeof maybeOverrides === "object" && !Array.isArray(maybeOverrides)) {
      setOverridesByHomeId(mergeOverrides(committedOverridesByHomeId, maybeOverrides));
    }
    if (typeof snapshot?.importRawText === "string") {
      setImportRawText(mergeImportRawText(committedImportRawText, snapshot.importRawText));
    }
    if (snapshot?.rawWeightPoints && typeof snapshot.rawWeightPoints === "object" && !Array.isArray(snapshot.rawWeightPoints)) {
      setRawWeightPoints(sanitizeRawWeights(snapshot.rawWeightPoints));
    }
    setBackupNotice("Loaded shared snapshot from link.");
  }, [committedImportRawText, committedOverridesByHomeId]);
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
      const seededPhoto = getSeededImportedPhoto(h.homeId);
      const overrides = overridesByHomeId[h.homeId] ?? {};
      const sourceHome = seededPhoto ? { ...h, photo: seededPhoto } : h;
      const mergedOverrides = seededPhoto ? { ...overrides, photo: seededPhoto } : overrides;
      return normalizeHomeRecord({ ...sourceHome, ...mergedOverrides, _overrideKeys: Object.keys(mergedOverrides) }, i);
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
      sqft: buildRangeContext(scope.map((h) => h?.sqft), { minSpread: 200, lowQuantile: 0, highQuantile: 1 }),
      lot: buildRangeContext(scope.map((h) => h?.lotSqft), { minSpread: 500 }),
      // Use the full observed range so larger primary suites don't bunch up at
      // the ceiling and smaller ones don't all floor out.
      masterBed: buildRangeContext(scope.map((h) => h?.masterBedSqft), { minSpread: 35, lowQuantile: 0, highQuantile: 1 }),
      age: buildRangeContext(scope.map((h) => {
        const built = toNum(h?.built);
        return Number.isFinite(built) ? Math.max(0, CURRENT_YEAR - built) : null;
      }), { minSpread: 3, lowQuantile: 0, highQuantile: 1 }),
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
  const finalistHomeIdSet = useMemo(() => new Set(FINALIST_HOME_ID_ORDER), []);
  const isFinalistHomeId = (homeId) => finalistHomeIdSet.has(homeId);
  const finalistHomes = useMemo(
    () => homes.filter((home) => finalistHomeIdSet.has(home.homeId)).sort((a, b) => b.weightedTotal - a.weightedTotal),
    [homes, finalistHomeIdSet]
  );
  const finalistHomeIds = useMemo(() => finalistHomes.map((home) => home.homeId), [finalistHomes]);
  const nonFinalistHomes = useMemo(
    () => homes.filter((home) => !finalistHomeIdSet.has(home.homeId)),
    [homes, finalistHomeIdSet]
  );
  const averageBenchmarkSource = useMemo(
    () => buildAverageBenchmarkHome(firstPassVisibleHomes),
    [firstPassVisibleHomes]
  );
  const averageBenchmark = useMemo(() => {
    if (!averageBenchmarkSource) return null;
    const scored = calc(averageBenchmarkSource, { scoreContexts, masterBedSqftFallback, effectiveWeights });
    return applyImpactStretch(scored, impactAudit.stretchByKey, effectiveWeights);
  }, [averageBenchmarkSource, scoreContexts, masterBedSqftFallback, impactAudit.stretchByKey, effectiveWeights]);
  const compareHomesPool = useMemo(
    () => averageBenchmark ? [...homes, averageBenchmark] : homes,
    [homes, averageBenchmark]
  );
  const compareOptionGroups = useMemo(() => {
    const groups = [];
    if (finalistHomes.length) groups.push({ key: "finalists", label: "Finalists", homes: finalistHomes });
    if (nonFinalistHomes.length) groups.push({ key: "others", label: "Other Homes", homes: nonFinalistHomes });
    if (averageBenchmark) groups.push({ key: "benchmark", label: "Benchmark", homes: [averageBenchmark] });
    return groups;
  }, [finalistHomes, nonFinalistHomes, averageBenchmark]);
  const overviewHomes = useMemo(
    () => averageBenchmark
      ? [...homes, averageBenchmark].sort((a, b) => b.weightedTotal - a.weightedTotal)
      : homes,
    [homes, averageBenchmark]
  );
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
    if (lockedOverviewHomeId && !overviewHomes.some((h) => h.homeId === lockedOverviewHomeId)) {
      setLockedOverviewHomeId(null);
    }
    if (hoveredOverviewHomeId && !overviewHomes.some((h) => h.homeId === hoveredOverviewHomeId)) {
      setHoveredOverviewHomeId(null);
    }
  }, [overviewHomes, lockedOverviewHomeId, hoveredOverviewHomeId]);

  useEffect(() => {
    if (compareSelectionMigratedRef.current) return;
    if (!compareHomesPool.length) return;
    const fallbackCompareIds = [
      finalistHomeIds[0] ?? homes[0]?.homeId ?? EMPTY,
      finalistHomeIds[1] ?? finalistHomeIds[0] ?? homes[1]?.homeId ?? homes[0]?.homeId ?? EMPTY,
      finalistHomeIds[2] ?? EMPTY,
    ];
    const mapLegacySelection = (value, fallbackIndex = null) => {
      if (value === EMPTY) return EMPTY;
      if (compareHomesPool.some((h) => h.homeId === value)) return value;
      const idx = Number(value);
      if (Number.isInteger(idx) && idx >= 0 && idx < homes.length) return homes[idx].homeId;
      if (Number.isInteger(fallbackIndex) && fallbackCompareIds[fallbackIndex]) return fallbackCompareIds[fallbackIndex];
      return EMPTY;
    };
    setCompareA((prev) => mapLegacySelection(prev, 0));
    setCompareB((prev) => mapLegacySelection(prev, 1));
    setCompareC((prev) => mapLegacySelection(prev, 2));
    compareSelectionMigratedRef.current = true;
  }, [compareHomesPool, homes, finalistHomeIds]);

  useEffect(() => {
    const fallbackCompareIds = [
      finalistHomeIds[0] ?? homes[0]?.homeId ?? EMPTY,
      finalistHomeIds[1] ?? finalistHomeIds[0] ?? homes[1]?.homeId ?? homes[0]?.homeId ?? EMPTY,
      finalistHomeIds[2] ?? EMPTY,
    ];
    const ensureValidSelection = (value, fallbackIndex = null) => {
      if (value === EMPTY) return EMPTY;
      if (compareHomesPool.some((home) => home.homeId === value)) return value;
      if (Number.isInteger(fallbackIndex) && fallbackCompareIds[fallbackIndex]) {
        return fallbackCompareIds[fallbackIndex];
      }
      return EMPTY;
    };
    setCompareA((prev) => ensureValidSelection(prev, 0));
    setCompareB((prev) => ensureValidSelection(prev, 1));
    setCompareC((prev) => ensureValidSelection(prev, 2));
  }, [compareHomesPool, homes, finalistHomeIds]);

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
    setOverridesByHomeId(mergeOverrides(committedOverridesByHomeId, {}));
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
  const restoreCommittedImports = () => {
    setImportRawText((prev) => mergeImportRawText(committedImportRawText, prev));
    setBackupNotice("Restored committed import blocks from the repo.");
  };
  const exportOverridesJson = () => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const sortJsonValue = (value) => {
      if (Array.isArray(value)) return value.map(sortJsonValue);
      if (!value || typeof value !== "object") return value;
      return Object.fromEntries(
        Object.keys(value)
          .sort((a, b) => a.localeCompare(b))
          .map((key) => [key, sortJsonValue(value[key])])
      );
    };
    const sortedOverrides = sortJsonValue(overridesByHomeId);
    const blob = new Blob([`${JSON.stringify(sortedOverrides, null, 2)}\n`], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = "seedOverrides.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
    setBackupNotice("Exported seedOverrides.json. Replace src/data/seedOverrides.json in the repo and commit it.");
  };
  const downloadBackup = () => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const homesMerged = sourceHomes.map((home) => ({ ...home, ...(overridesByHomeId[home.homeId] ?? {}) }));
    const payload = {
      schemaVersion: SHARE_STATE_SCHEMA_VERSION,
      exportedAt: now.toISOString(),
      counts: {
        baselineHomes: homesRaw.length,
        importedHomes: imported.homes.length,
        totalHomes: homesMerged.length,
      },
      importRawText,
      overridesByHomeId,
      rawWeightPoints,
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
  const copyShareLink = async () => {
    if (typeof window === "undefined") return;
    const payload = {
      schemaVersion: SHARE_STATE_SCHEMA_VERSION,
      importRawText,
      overridesByHomeId,
      rawWeightPoints,
    };
    const encoded = encodeShareSnapshot(payload);
    if (!encoded) {
      setBackupNotice("Share link failed: could not encode the current app state.");
      return;
    }
    const shareUrl = new URL(window.location.href);
    shareUrl.hash = `${SHARE_STATE_HASH_KEY}=${encoded}`;
    if (shareUrl.toString().length > 120000) {
      setBackupNotice("Share link is too large for a reliable URL. Use Download Backup instead.");
      return;
    }
    try {
      const copied = await copyTextToClipboard(shareUrl.toString());
      setBackupNotice(copied ? "Share link copied. Opening it on mobile will load the same photos, imports, and weights." : "Share link created, but automatic clipboard copy was unavailable.");
    } catch (err) {
      setBackupNotice(`Share link failed: ${err?.message ?? "clipboard copy was unavailable."}`);
    }
  };
  const onRestoreBackupFile = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const rawOverrides = parsed?.overridesByHomeId ?? parsed;
      if (!rawOverrides || typeof rawOverrides !== "object" || Array.isArray(rawOverrides)) {
        throw new Error("Backup file does not contain a valid overrides object.");
      }
      const maybeOverrides = sanitizeIncomingOverrides(
        hydrateOverridesFromHomesPayload(rawOverrides, parsed?.homes, sourceById)
      );

      setOverridesByHomeId(mergeOverrides(committedOverridesByHomeId, maybeOverrides));
      if (typeof parsed?.importRawText === "string" && parsed.importRawText.trim()) {
        setImportRawText(mergeImportRawText(committedImportRawText, parsed.importRawText));
      }
      if (parsed?.rawWeightPoints && typeof parsed.rawWeightPoints === "object" && !Array.isArray(parsed.rawWeightPoints)) {
        setRawWeightPoints(sanitizeRawWeights(parsed.rawWeightPoints));
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
    return compareHomesPool.find((h) => h.homeId === value) ?? fallback;
  };
  const overviewAddress = (home) => {
    if (home?.sourceType === "benchmark" || home?.isSyntheticBenchmark) return "Average Home";
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
    overviewHomes.forEach((home, idx) => ranks.set(home.homeId, idx + 1));
    return ranks;
  }, [overviewHomes]);
  const overviewRows = useMemo(() => {
    const rows = [...overviewHomes];
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
  }, [overviewHomes, overviewSortKey, overviewSortDir]);
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
  const a = pick(compareA, homes[0] ?? compareHomesPool[0] ?? null);
  const b = pick(compareB, homes[Math.min(1, Math.max(homes.length - 1, 0))] ?? homes[0] ?? compareHomesPool[0] ?? null);
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
  const chartLegendFormatter = (value, entry) => React.createElement(
    "span",
    { style: { ...TEXT_STYLES.label, color: entry?.color ?? "#94a3b8" } },
    value
  );
  const compareTableStyle = { fontFamily: FONT_STACKS.sans, width: "100%", borderCollapse: "collapse", fontSize: 13 };
  const compareHeaderCellStyle = { ...TEXT_STYLES.label, fontFamily: FONT_STACKS.sans, textAlign: "right", padding: "8px 6px" };
  const compareMetricCellStyle = { ...labelTextStyle, fontFamily: FONT_STACKS.sans, padding: "8px 6px", borderTop: "1px solid #334155" };
  const compareValueCellStyle = { ...bodyStrongTextStyle, fontFamily: FONT_STACKS.sans, fontSize: 12 };
  const compareScoreCellStyle = { ...TEXT_STYLES.captionStrong, fontFamily: FONT_STACKS.sans };
  const selectStyle = { ...TEXT_STYLES.body, width: "100%", background: "#0f172a", color: "#f1f5f9", border: "1px solid #334155", borderRadius: 6, padding: "6px 8px" };

  return {
    restoreBackupInputRef,
    tab,
    setTab,
    isMobile,
    importSummary,
    importRawText,
    setImportRawText,
    backupNotice,
    showHidden,
    setShowHidden,
    showMissingOnly,
    setShowMissingOnly,
    editorQuery,
    setEditorQuery,
    filteredEditorHomes,
    selectedHome,
    setSelectedHomeId,
    visibleEditGroups,
    selectedSource,
    selectedOverrides,
    selectedDrafts,
    selectedErrors,
    tagDraft,
    setTagDraft,
    downloadBackup,
    copyShareLink,
    triggerRestoreBackup,
    onRestoreBackupFile,
    restoreCommittedImports,
    exportOverridesJson,
    clearImportText,
    addTag,
    removeTag,
    onTextChange,
    onNumericChange,
    onNumericBlur,
    setSelectedStatus,
    resetSelectedHome,
    resetAllEdits,
    sectionTitleStyle,
    cardTitleStyle,
    bodyMutedTextStyle,
    bodyStrongTextStyle,
    labelTextStyle,
    captionTextStyle,
    captionStrongTextStyle,
    eyebrowTextStyle,
    metricTextStyle,
    buttonTextStyle,
    inputTextStyle,
    chartXAxisTickStyle,
    chartYAxisTickStyle,
    chartLegendStyle,
    chartTooltipLabelStyle,
    chartLegendFormatter,
    compareTableStyle,
    compareHeaderCellStyle,
    compareMetricCellStyle,
    compareValueCellStyle,
    compareScoreCellStyle,
    selectStyle,
    overviewTableMinWidth,
    overviewRankColWidth,
    overviewColumns,
    overviewSortKey,
    overviewRows,
    onOverviewSort,
    overviewSortIndicator,
    rankByHomeId,
    overviewRowTone,
    setHoveredOverviewHomeId,
    toggleOverviewRowLock,
    onOverviewRowKeyDown,
    factorPairForHome,
    overviewAddress,
    pick,
    compareA,
    setCompareA,
    compareB,
    setCompareB,
    compareC,
    setCompareC,
    compareHomesPool,
    compareOptionGroups,
    compareHeaderColors,
    compareViewModel,
    a,
    b,
    c,
    rawRadarData,
    weightedRadarData,
    homes,
    finalistHomes,
    nonFinalistHomes,
    finalistHomeIds,
    isFinalistHomeId,
    failedImageKeys,
    markImageFailed,
    cardFactorPairsByHomeId,
    scoredFactorSpecs,
    weightRows,
    resetWeightsToDefault,
    weightsSubtitle,
    onWeightSliderChange,
    impactAudit,
    auditStatusStyle,
    FONT_STACKS,
    IMG_WRAP_STYLE,
    NO_PHOTO_STYLE,
    COLORS,
    EMPTY,
  };
}
