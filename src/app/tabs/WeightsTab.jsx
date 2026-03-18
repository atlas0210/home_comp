import { React } from '../../shared/runtime.js';
import { IMPACT_AUDIT_THRESHOLD, IMPACT_STRETCH_MAX_SCORE, IMPACT_STRETCH_MIN_SCORE } from '../../shared/constants.js';
import { TEXT_STYLES } from '../../shared/uiTokens.js';

export default function WeightsTab(props) {
  const { sectionTitleStyle, buttonTextStyle, weightsSubtitle, weightRows, resetWeightsToDefault, onWeightSliderChange, cardTitleStyle, captionTextStyle, impactAudit, auditStatusStyle, bodyStrongTextStyle, labelTextStyle } = props;
  return (
<div style={{ background: "#161d2a", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <h2 style={{ ...sectionTitleStyle, margin: 0 }}>Interactive Weights</h2>
              <button
                onClick={resetWeightsToDefault}
                style={{ ...buttonTextStyle, border: "1px solid #2d3748", background: "#111827", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}
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
                  <div key={row.key} style={{ border: "1px solid #2d3748", borderRadius: 10, background: "#0d1117", padding: 10 }}>
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
  );
}
