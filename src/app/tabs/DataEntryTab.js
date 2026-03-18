import { React } from '../../shared/runtime.js';
import { TEXT_STYLES } from '../../shared/uiTokens.js';
import { displayFieldValue, displayHoaFieldValue, getMissingFields } from '../../domain/display.js';
import { hoaAnnualToMonthly } from '../../domain/records.js?v=20260317d';
export default function DataEntryTab(props) {
  const {
    cardTitleStyle,
    inputTextStyle,
    buttonTextStyle,
    backupNotice,
    labelTextStyle,
    captionTextStyle,
    bodyMutedTextStyle,
    selectedHome,
    selectedSource,
    selectedOverrides,
    selectedDrafts,
    selectedErrors,
    filteredEditorHomes,
    setSelectedHomeId,
    visibleEditGroups,
    showHidden,
    setShowHidden,
    showMissingOnly,
    setShowMissingOnly,
    editorQuery,
    setEditorQuery,
    importRawText,
    setImportRawText,
    importSummary,
    restoreBackupInputRef,
    downloadBackup,
    exportOverridesJson,
    copyShareLink,
    triggerRestoreBackup,
    onRestoreBackupFile,
    restoreCommittedImports,
    clearImportText,
    addTag,
    removeTag,
    tagDraft,
    setTagDraft,
    onTextChange,
    onNumericChange,
    onNumericBlur,
    setSelectedStatus,
    resetSelectedHome,
    resetAllEdits,
    bodyStrongTextStyle,
    captionStrongTextStyle
  } = props;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "minmax(280px,340px) minmax(0,1fr)",
      gap: 12,
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#161d2a",
      borderRadius: 12,
      padding: 12,
      overflowX: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...cardTitleStyle,
      marginBottom: 8
    }
  }, "Import Data"), /*#__PURE__*/React.createElement("textarea", {
    value: importRawText,
    onChange: e => setImportRawText(e.target.value),
    placeholder: "Paste listing blocks here. Supported lines include Lot Size Area: 6,500 sqft and Master Bed Sqft: 210. Imports update live.",
    style: {
      ...inputTextStyle,
      width: "100%",
      boxSizing: "border-box",
      minHeight: 120,
      resize: "vertical",
      background: "#0d1117",
      color: "#f1f5f9",
      border: "1px solid #2d3748",
      borderRadius: 6,
      padding: "8px 9px",
      marginBottom: 8,
      overflowX: "hidden"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      ...captionTextStyle,
      marginBottom: 8
    }
  }, "Supported raw import lines include ", /*#__PURE__*/React.createElement("code", null, "Lot Size Area: ..."), " and ", /*#__PURE__*/React.createElement("code", null, "Master Bed Sqft: ..."), "."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 10,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: downloadBackup,
    style: {
      ...buttonTextStyle,
      border: "1px solid #2d3748",
      background: "#0d1117",
      borderRadius: 6,
      padding: "6px 10px",
      cursor: "pointer"
    }
  }, "Download Backup"), /*#__PURE__*/React.createElement("button", {
    onClick: exportOverridesJson,
    style: {
      ...buttonTextStyle,
      border: "1px solid #14532d",
      background: "#052e16",
      color: "#bbf7d0",
      borderRadius: 6,
      padding: "6px 10px",
      cursor: "pointer"
    }
  }, "Export Overrides JSON"), /*#__PURE__*/React.createElement("button", {
    onClick: copyShareLink,
    style: {
      ...buttonTextStyle,
      border: "1px solid #2d3748",
      background: "#0d1117",
      borderRadius: 6,
      padding: "6px 10px",
      cursor: "pointer"
    }
  }, "Copy Share Link"), /*#__PURE__*/React.createElement("button", {
    onClick: triggerRestoreBackup,
    style: {
      ...buttonTextStyle,
      border: "1px solid #2d3748",
      background: "#0d1117",
      borderRadius: 6,
      padding: "6px 10px",
      cursor: "pointer"
    }
  }, "Restore Backup JSON"), /*#__PURE__*/React.createElement("input", {
    ref: restoreBackupInputRef,
    type: "file",
    accept: "application/json,.json",
    style: {
      display: "none"
    },
    onChange: onRestoreBackupFile
  }), /*#__PURE__*/React.createElement("button", {
    onClick: restoreCommittedImports,
    style: {
      ...buttonTextStyle,
      border: "1px solid #2d3748",
      background: "#0d1117",
      borderRadius: 6,
      padding: "6px 10px",
      cursor: "pointer"
    }
  }, "Restore Committed Imports"), /*#__PURE__*/React.createElement("button", {
    onClick: clearImportText,
    style: {
      ...buttonTextStyle,
      border: "1px solid #7f1d1d",
      background: "#3f1d1d",
      color: "#fecaca",
      borderRadius: 6,
      padding: "6px 10px",
      cursor: "pointer"
    }
  }, "Clear Imported Data")), /*#__PURE__*/React.createElement("div", {
    style: {
      ...captionTextStyle,
      marginBottom: 8
    }
  }, "Permanent edits belong in ", /*#__PURE__*/React.createElement("code", null, "src/data/seedOverrides.json"), " and ", /*#__PURE__*/React.createElement("code", null, "src/data/importSeed.txt"), ". Use ", /*#__PURE__*/React.createElement("code", null, "Export Overrides JSON"), " for a Git-ready overrides file."), backupNotice && /*#__PURE__*/React.createElement("div", {
    style: {
      ...TEXT_STYLES.caption,
      marginBottom: 10,
      color: /failed/i.test(backupNotice) ? "#fca5a5" : "#86efac"
    }
  }, backupNotice), /*#__PURE__*/React.createElement("label", {
    style: {
      ...labelTextStyle,
      display: "flex",
      gap: 6,
      alignItems: "center",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: showHidden,
    onChange: e => setShowHidden(e.target.checked)
  }), "Show Hidden (Ruled Out / Sold)"), /*#__PURE__*/React.createElement("div", {
    style: {
      ...captionTextStyle,
      marginBottom: 12
    }
  }, "Active imports: ", importSummary.importedCount, " home(s) from ", importSummary.blockCount, " block(s)"), /*#__PURE__*/React.createElement("div", {
    style: {
      ...cardTitleStyle,
      marginBottom: 8
    }
  }, "Homes"), /*#__PURE__*/React.createElement("input", {
    value: editorQuery,
    onChange: e => setEditorQuery(e.target.value),
    placeholder: "Search address, status, or id",
    style: {
      ...inputTextStyle,
      width: "100%",
      boxSizing: "border-box",
      background: "#0d1117",
      color: "#f1f5f9",
      border: "1px solid #2d3748",
      borderRadius: 6,
      padding: "7px 8px",
      marginBottom: 10
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: 8,
      maxHeight: "42vh",
      overflowY: "auto",
      overflowX: "hidden",
      paddingRight: 4
    }
  }, filteredEditorHomes.map(h => {
    const active = h.homeId === selectedHome?.homeId;
    const missing = getMissingFields(h).length;
    return /*#__PURE__*/React.createElement("button", {
      key: h.homeId,
      onClick: () => setSelectedHomeId(h.homeId),
      style: {
        textAlign: "left",
        padding: 10,
        borderRadius: 8,
        border: active ? "1px solid #818cf8" : "1px solid #334155",
        background: active ? "#0f172a" : "#111827",
        color: "#f1f5f9",
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...TEXT_STYLES.label,
        color: "#f1f5f9",
        marginBottom: 2,
        overflowWrap: "anywhere"
      }
    }, h.name), /*#__PURE__*/React.createElement("div", {
      style: {
        ...TEXT_STYLES.caption,
        display: "flex",
        justifyContent: "space-between",
        color: "#94a3b8"
      }
    }, /*#__PURE__*/React.createElement("span", null, h.status), /*#__PURE__*/React.createElement("span", null, h.weightedTotal.toFixed(2))), /*#__PURE__*/React.createElement("div", {
      style: {
        ...TEXT_STYLES.caption,
        color: missing ? "#fbbf24" : "#64748b",
        marginTop: 4
      }
    }, missing ? `${missing} blank field(s)` : "No blank fields"));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#161d2a",
      borderRadius: 12,
      padding: 16
    }
  }, !selectedHome && /*#__PURE__*/React.createElement("div", {
    style: bodyMutedTextStyle
  }, "No home selected."), selectedHome && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      marginBottom: 10,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...TEXT_STYLES.heroTitle,
      fontSize: 18,
      fontWeight: 800,
      color: "#f8fafc"
    }
  }, selectedHome.name), /*#__PURE__*/React.createElement("div", {
    style: {
      ...TEXT_STYLES.label,
      fontWeight: 500,
      color: "#94a3b8"
    }
  }, selectedHome.homeId, " \xB7 Weighted ", selectedHome.weightedTotal.toFixed(2), " \xB7 ", selectedHome.status), ["Ruled Out", "Sold"].includes(selectedHome.status) && /*#__PURE__*/React.createElement("div", {
    style: {
      ...TEXT_STYLES.caption,
      color: "#fbbf24",
      marginTop: 4
    }
  }, "This home is hidden from Overview/Compare/Cards while status is ", selectedHome.status, ".")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: downloadBackup,
    style: {
      ...buttonTextStyle,
      border: "1px solid #2d3748",
      background: "#0d1117",
      borderRadius: 6,
      padding: "6px 10px",
      cursor: "pointer"
    }
  }, "Save Backup"), /*#__PURE__*/React.createElement("label", {
    style: {
      ...labelTextStyle,
      display: "flex",
      gap: 6,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: showMissingOnly,
    onChange: e => setShowMissingOnly(e.target.checked)
  }), "Show only blank/missing fields"), selectedHome.status === "Considering" && /*#__PURE__*/React.createElement("button", {
    onClick: () => setSelectedStatus("Ruled Out"),
    style: {
      ...buttonTextStyle,
      border: "1px solid #7f1d1d",
      background: "#3f1d1d",
      color: "#fecaca",
      borderRadius: 6,
      padding: "6px 10px",
      cursor: "pointer"
    }
  }, "Rule Out Home"), selectedHome.status === "Ruled Out" && /*#__PURE__*/React.createElement("button", {
    onClick: () => setSelectedStatus("Considering"),
    style: {
      ...buttonTextStyle,
      border: "1px solid #14532d",
      background: "#052e16",
      color: "#bbf7d0",
      borderRadius: 6,
      padding: "6px 10px",
      cursor: "pointer"
    }
  }, "Restore Home"), /*#__PURE__*/React.createElement("button", {
    onClick: resetSelectedHome,
    style: {
      ...buttonTextStyle,
      border: "1px solid #2d3748",
      background: "#0d1117",
      borderRadius: 6,
      padding: "6px 10px",
      cursor: "pointer"
    }
  }, "Reset Selected Home"), /*#__PURE__*/React.createElement("button", {
    onClick: resetAllEdits,
    style: {
      ...buttonTextStyle,
      border: "1px solid #7f1d1d",
      background: "#3f1d1d",
      color: "#fecaca",
      borderRadius: 6,
      padding: "6px 10px",
      cursor: "pointer"
    }
  }, "Reset All Local Edits"))), visibleEditGroups.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: bodyMutedTextStyle
  }, "No blank fields left on this home."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: 14
    }
  }, visibleEditGroups.map(group => /*#__PURE__*/React.createElement("div", {
    key: group.title,
    style: {
      border: "1px solid #2d3748",
      borderRadius: 10,
      padding: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...cardTitleStyle,
      marginBottom: 10
    }
  }, group.title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
      gap: 10
    }
  }, group.fields.map(field => {
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
      if (hasOverride) inputValue = overrideValue == null ? "" : String(overrideValue);else inputValue = currentValue ?? "";
    }
    if (field.type === "tags") {
      const tags = Array.isArray(selectedHome.tags) ? selectedHome.tags : [];
      return /*#__PURE__*/React.createElement("div", {
        key: key,
        style: {
          gridColumn: "1 / -1",
          background: "#0d1117",
          border: "1px solid #2d3748",
          borderRadius: 8,
          padding: 10
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          ...labelTextStyle,
          color: "#e2e8f0",
          marginBottom: 8
        }
      }, "Tags"), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 8
        }
      }, tags.map(tag => /*#__PURE__*/React.createElement("button", {
        key: tag,
        onClick: () => removeTag(tag),
        style: {
          ...captionStrongTextStyle,
          background: "#0d1117",
          border: "1px solid #2d3748",
          borderRadius: 999,
          padding: "3px 8px",
          cursor: "pointer"
        }
      }, tag, " \xD7"))), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 6
        }
      }, /*#__PURE__*/React.createElement("input", {
        value: tagDraft,
        onChange: e => setTagDraft(e.target.value),
        placeholder: "Add tag/note",
        style: {
          ...inputTextStyle,
          flex: 1,
          background: "#0d1117",
          color: "#f1f5f9",
          border: "1px solid #2d3748",
          borderRadius: 6,
          padding: "6px 8px"
        }
      }), /*#__PURE__*/React.createElement("button", {
        onClick: addTag,
        style: {
          ...buttonTextStyle,
          border: "1px solid #2d3748",
          background: "#1f2937",
          borderRadius: 6,
          padding: "6px 10px",
          cursor: "pointer"
        }
      }, "Add")), /*#__PURE__*/React.createElement("div", {
        style: {
          ...captionTextStyle,
          marginTop: 6
        }
      }, "Base: ", displayFieldValue(sourceValue), " \xB7 Override: ", hasOverride ? displayFieldValue(overrideValue) : "—"));
    }
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: {
        background: "#0d1117",
        border: "1px solid #2d3748",
        borderRadius: 8,
        padding: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("label", {
      style: {
        ...labelTextStyle,
        color: "#e2e8f0"
      }
    }, field.label), hasPlaceholder && /*#__PURE__*/React.createElement("span", {
      style: {
        ...TEXT_STYLES.eyebrow,
        color: "#fbbf24",
        border: "1px solid #fbbf2444",
        borderRadius: 999,
        padding: "2px 6px"
      }
    }, "placeholder")), field.type === "select" && /*#__PURE__*/React.createElement("select", {
      value: inputValue,
      onChange: e => onTextChange(selectedHome.homeId, key, e.target.value),
      style: {
        ...inputTextStyle,
        width: "100%",
        background: "#0d1117",
        color: "#f1f5f9",
        border: "1px solid #2d3748",
        borderRadius: 6,
        padding: "6px 8px"
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "(clear)"), field.options.map(option => /*#__PURE__*/React.createElement("option", {
      key: option,
      value: option
    }, option))), field.type === "number" && /*#__PURE__*/React.createElement("input", {
      value: inputValue,
      onChange: e => onNumericChange(selectedHome.homeId, key, e.target.value),
      onBlur: () => onNumericBlur(selectedHome.homeId, key),
      style: {
        ...inputTextStyle,
        width: "100%",
        background: "#0d1117",
        color: "#f1f5f9",
        border: error ? "1px solid #ef4444" : "1px solid #334155",
        borderRadius: 6,
        padding: "6px 8px"
      }
    }), field.type === "text" && /*#__PURE__*/React.createElement("input", {
      value: inputValue,
      onChange: e => onTextChange(selectedHome.homeId, key, e.target.value),
      style: {
        ...inputTextStyle,
        width: "100%",
        background: "#0d1117",
        color: "#f1f5f9",
        border: "1px solid #2d3748",
        borderRadius: 6,
        padding: "6px 8px"
      }
    }), error && /*#__PURE__*/React.createElement("div", {
      style: {
        ...TEXT_STYLES.caption,
        color: "#fca5a5",
        marginTop: 4
      }
    }, error), /*#__PURE__*/React.createElement("div", {
      style: {
        ...captionTextStyle,
        marginTop: 6
      }
    }, "Base: ", key === "hoa" ? displayHoaFieldValue(sourceValue) : displayFieldValue(sourceValue)), /*#__PURE__*/React.createElement("div", {
      style: captionTextStyle
    }, "Override: ", hasOverride ? key === "hoa" ? displayHoaFieldValue(overrideValue) : displayFieldValue(overrideValue) : "—"));
  }))))))));
}
