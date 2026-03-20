import { React } from '../../shared/runtime.js';
import { TEXT_STYLES } from '../../shared/uiTokens.js';
import { CardMetric, ScoreBar } from '../../ui/components.js';
import { getImageKey, getMissingFields, gradeColor, placeholderLabel, placeholderSummary, CARD_FIELDS } from '../../domain/display.js';
import { resolvePhotoSrc } from '../../domain/records.js?v=20260317d';

export default function CardsTab(props) {
  const { finalistHomes, nonFinalistHomes, failedImageKeys, cardFactorPairsByHomeId, scoredFactorSpecs, rankByHomeId, markImageFailed, IMG_WRAP_STYLE, NO_PHOTO_STYLE, eyebrowTextStyle, metricTextStyle, captionStrongTextStyle, captionTextStyle } = props;
  const renderHomeCard = (h, emphasis = false) => {
    const missingFields = getMissingFields(h);
    const imageKey = getImageKey(h);
    const photoSrc = resolvePhotoSrc(h.photo);
    const showPhoto = photoSrc && !failedImageKeys.has(imageKey);
    const cardFactorPairs = cardFactorPairsByHomeId.get(h.homeId) ?? {};
    const rank = rankByHomeId.get(h.homeId);
    return (
      <div key={h.homeId} style={{ background: emphasis ? "linear-gradient(180deg, #1b2434 0%, #161d2a 100%)" : "#161d2a", borderRadius: 16, padding: 16, boxShadow: emphasis ? "0 16px 32px rgba(15,23,42,.36)" : "0 8px 20px rgba(0,0,0,.25)", border: emphasis ? "1px solid #6366f166" : `1px solid ${gradeColor(h.weightedTotal)}33`, position: "relative", overflow: "hidden" }}>
        {emphasis && <div style={{ position: "absolute", inset: "0 0 auto 0", height: 4, background: "linear-gradient(90deg, #818cf8 0%, #38bdf8 100%)" }} />}
        {showPhoto ? (
          <div style={IMG_WRAP_STYLE}>
            <img
              src={photoSrc}
              alt={h.name}
              loading="lazy"
              decoding="async"
              width="320"
              height="180"
              sizes="(max-width: 640px) 100vw, 320px"
              referrerPolicy="no-referrer"
              style={{ width: "100%", height: "auto", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }}
              onError={() => markImageFailed(h)}
            />
          </div>
        ) : null}
        <div data-fallback="true" style={{ ...NO_PHOTO_STYLE, display: showPhoto ? "none" : "flex" }}>NO PHOTO</div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
          <div>
            <div style={{ ...eyebrowTextStyle, color: emphasis ? "#a5b4fc" : eyebrowTextStyle.color }}>#{rank ?? "—"} RANKED</div>
            <div style={{ ...TEXT_STYLES.heroTitle, fontSize: 16, fontWeight: 800, color: "#f8fafc", lineHeight: 1.2 }}>{h.short}</div>
            <div style={{ ...TEXT_STYLES.label, fontWeight: 500, color: "#94a3b8", marginTop: 2 }}>{h.name}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            {emphasis && (
              <div style={{ marginBottom: 6 }}>
                <span style={{ ...TEXT_STYLES.captionStrong, color: "#c7d2fe", background: "#312e81", border: "1px solid #6366f166", borderRadius: 999, padding: "4px 8px" }}>
                  Finalist
                </span>
              </div>
            )}
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
          {(h.tags || []).map((tag) => <span key={tag} style={{ ...captionStrongTextStyle, background: "#0f172a", border: "1px solid #2d3748", borderRadius: 999, padding: "3px 8px" }}>{tag}</span>)}
        </div>
      </div>
    );
  };

  return (
<div style={{ display: "grid", gap: 18 }}>
            {finalistHomes.length > 0 && (
              <section>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                  <div style={{ ...TEXT_STYLES.sectionTitle, color: "#f8fafc" }}>Finalists</div>
                  <div style={{ ...TEXT_STYLES.captionStrong, color: "#94a3b8" }}>Pinned shortlist for side-by-side review</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
                  {finalistHomes.map((h) => renderHomeCard(h, true))}
                </div>
              </section>
            )}
            <section>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                <div style={{ ...TEXT_STYLES.sectionTitle, color: "#f8fafc" }}>Other Homes</div>
                <div style={{ ...TEXT_STYLES.captionStrong, color: "#64748b" }}>{nonFinalistHomes.length} remaining visible option{nonFinalistHomes.length === 1 ? "" : "s"}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
                {nonFinalistHomes.map((h) => renderHomeCard(h))}
              </div>
            </section>
          </div>
  );
}
