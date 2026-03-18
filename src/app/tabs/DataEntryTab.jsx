import { React } from '../../shared/runtime.js';
import { TEXT_STYLES } from '../../shared/uiTokens.js';
import { displayFieldValue, displayHoaFieldValue, getMissingFields } from '../../domain/display.js';
import { hoaAnnualToMonthly } from '../../domain/records.js?v=20260317d';

export default function DataEntryTab(props) {
  const { cardTitleStyle, inputTextStyle, buttonTextStyle, backupNotice, labelTextStyle, captionTextStyle, bodyMutedTextStyle, selectedHome, selectedSource, selectedOverrides, selectedDrafts, selectedErrors, filteredEditorHomes, setSelectedHomeId, visibleEditGroups, showHidden, setShowHidden, showMissingOnly, setShowMissingOnly, editorQuery, setEditorQuery, importRawText, setImportRawText, importSummary, restoreBackupInputRef, downloadBackup, exportOverridesJson, copyShareLink, triggerRestoreBackup, onRestoreBackupFile, restoreCommittedImports, clearImportText, addTag, removeTag, tagDraft, setTagDraft, onTextChange, onNumericChange, onNumericBlur, setSelectedStatus, resetSelectedHome, resetAllEdits, bodyStrongTextStyle, captionStrongTextStyle } = props;
  return (
<div style={{ display: "grid", gridTemplateColumns: "minmax(280px,340px) minmax(0,1fr)", gap: 12, alignItems: "start" }}>
          <div style={{ background: "#161d2a", borderRadius: 12, padding: 12, overflowX: "hidden" }}>
            <div style={{ ...cardTitleStyle, marginBottom: 8 }}>Import Data</div>
            <textarea
              value={importRawText}
              onChange={(e) => setImportRawText(e.target.value)}
              placeholder="Paste listing blocks here. Supported lines include Lot Size Area: 6,500 sqft and Master Bed Sqft: 210. Imports update live."
              style={{ ...inputTextStyle, width: "100%", boxSizing: "border-box", minHeight: 120, resize: "vertical", background: "#0d1117", color: "#f1f5f9", border: "1px solid #2d3748", borderRadius: 6, padding: "8px 9px", marginBottom: 8, overflowX: "hidden" }}
            />
            <div style={{ ...captionTextStyle, marginBottom: 8 }}>
              Supported raw import lines include <code>Lot Size Area: ...</code> and <code>Master Bed Sqft: ...</code>.
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <button onClick={downloadBackup} style={{ ...buttonTextStyle, border: "1px solid #2d3748", background: "#0d1117", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>Download Backup</button>
              <button onClick={exportOverridesJson} style={{ ...buttonTextStyle, border: "1px solid #14532d", background: "#052e16", color: "#bbf7d0", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>Export Overrides JSON</button>
              <button onClick={copyShareLink} style={{ ...buttonTextStyle, border: "1px solid #2d3748", background: "#0d1117", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>Copy Share Link</button>
              <button onClick={triggerRestoreBackup} style={{ ...buttonTextStyle, border: "1px solid #2d3748", background: "#0d1117", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>Restore Backup JSON</button>
              <input ref={restoreBackupInputRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={onRestoreBackupFile} />
              <button onClick={restoreCommittedImports} style={{ ...buttonTextStyle, border: "1px solid #2d3748", background: "#0d1117", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>Restore Committed Imports</button>
              <button onClick={clearImportText} style={{ ...buttonTextStyle, border: "1px solid #7f1d1d", background: "#3f1d1d", color: "#fecaca", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>Clear Imported Data</button>
            </div>
            <div style={{ ...captionTextStyle, marginBottom: 8 }}>
              Permanent edits belong in <code>src/data/seedOverrides.json</code> and <code>src/data/importSeed.txt</code>. Use <code>Export Overrides JSON</code> for a Git-ready overrides file.
            </div>
            {backupNotice && (
              <div style={{ ...TEXT_STYLES.caption, marginBottom: 10, color: /failed/i.test(backupNotice) ? "#fca5a5" : "#86efac" }}>
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
            <input value={editorQuery} onChange={(e) => setEditorQuery(e.target.value)} placeholder="Search address, status, or id" style={{ ...inputTextStyle, width: "100%", boxSizing: "border-box", background: "#0d1117", color: "#f1f5f9", border: "1px solid #2d3748", borderRadius: 6, padding: "7px 8px", marginBottom: 10 }} />
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

          <div style={{ background: "#161d2a", borderRadius: 12, padding: 16 }}>
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
                    <button onClick={downloadBackup} style={{ ...buttonTextStyle, border: "1px solid #2d3748", background: "#0d1117", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>Save Backup</button>
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
                    <button onClick={resetSelectedHome} style={{ ...buttonTextStyle, border: "1px solid #2d3748", background: "#0d1117", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>Reset Selected Home</button>
                    <button onClick={resetAllEdits} style={{ ...buttonTextStyle, border: "1px solid #7f1d1d", background: "#3f1d1d", color: "#fecaca", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>Reset All Local Edits</button>
                  </div>
                </div>

                {visibleEditGroups.length === 0 && <div style={bodyMutedTextStyle}>No blank fields left on this home.</div>}
                <div style={{ display: "grid", gap: 14 }}>
                  {visibleEditGroups.map((group) => (
                    <div key={group.title} style={{ border: "1px solid #2d3748", borderRadius: 10, padding: 12 }}>
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
                              <div key={key} style={{ gridColumn: "1 / -1", background: "#0d1117", border: "1px solid #2d3748", borderRadius: 8, padding: 10 }}>
                                <div style={{ ...labelTextStyle, color: "#e2e8f0", marginBottom: 8 }}>Tags</div>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                                  {tags.map((tag) => <button key={tag} onClick={() => removeTag(tag)} style={{ ...captionStrongTextStyle, background: "#0d1117", border: "1px solid #2d3748", borderRadius: 999, padding: "3px 8px", cursor: "pointer" }}>{tag} ×</button>)}
                                </div>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} placeholder="Add tag/note" style={{ ...inputTextStyle, flex: 1, background: "#0d1117", color: "#f1f5f9", border: "1px solid #2d3748", borderRadius: 6, padding: "6px 8px" }} />
                                  <button onClick={addTag} style={{ ...buttonTextStyle, border: "1px solid #2d3748", background: "#1f2937", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>Add</button>
                                </div>
                                <div style={{ ...captionTextStyle, marginTop: 6 }}>Base: {displayFieldValue(sourceValue)} · Override: {hasOverride ? displayFieldValue(overrideValue) : "—"}</div>
                              </div>
                            );
                          }

                          return (
                            <div key={key} style={{ background: "#0d1117", border: "1px solid #2d3748", borderRadius: 8, padding: 10 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                <label style={{ ...labelTextStyle, color: "#e2e8f0" }}>{field.label}</label>
                                {hasPlaceholder && <span style={{ ...TEXT_STYLES.eyebrow, color: "#fbbf24", border: "1px solid #fbbf2444", borderRadius: 999, padding: "2px 6px" }}>placeholder</span>}
                              </div>
                              {field.type === "select" && (
                                <select value={inputValue} onChange={(e) => onTextChange(selectedHome.homeId, key, e.target.value)} style={{ ...inputTextStyle, width: "100%", background: "#0d1117", color: "#f1f5f9", border: "1px solid #2d3748", borderRadius: 6, padding: "6px 8px" }}>
                                  <option value="">(clear)</option>
                                  {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                                </select>
                              )}
                              {field.type === "number" && (
                                <input value={inputValue} onChange={(e) => onNumericChange(selectedHome.homeId, key, e.target.value)} onBlur={() => onNumericBlur(selectedHome.homeId, key)} style={{ ...inputTextStyle, width: "100%", background: "#0d1117", color: "#f1f5f9", border: error ? "1px solid #ef4444" : "1px solid #334155", borderRadius: 6, padding: "6px 8px" }} />
                              )}
                              {field.type === "text" && (
                                <input value={inputValue} onChange={(e) => onTextChange(selectedHome.homeId, key, e.target.value)} style={{ ...inputTextStyle, width: "100%", background: "#0d1117", color: "#f1f5f9", border: "1px solid #2d3748", borderRadius: 6, padding: "6px 8px" }} />
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
        </div>
  );
}
