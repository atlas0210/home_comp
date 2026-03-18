import { React } from '../shared/runtime.js';
import { TEXT_STYLES } from '../shared/uiTokens.js';
import { useHomeCompModel } from '../hooks/useHomeCompModel.js?v=20260317d';
import OverviewTab from './tabs/OverviewTab.js';
import DataEntryTab from './tabs/DataEntryTab.js?v=20260317d';
import CompareTab from './tabs/CompareTab.js';
import CardsTab from './tabs/CardsTab.js?v=20260317d';
import WeightsTab from './tabs/WeightsTab.js';
export default function App({
  seedOverridesByHomeId = {},
  seedImportRawText = ''
}) {
  const model = useHomeCompModel({
    seedOverridesByHomeId,
    seedImportRawText
  });
  const {
    isMobile,
    bodyMutedTextStyle,
    importSummary,
    buttonTextStyle,
    tab,
    setTab
  } = model;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: model.FONT_STACKS.sans,
      background: '#0d1117',
      minHeight: '100vh',
      color: '#e2e8f0',
      padding: isMobile ? 10 : 20,
      WebkitTextSizeAdjust: '100%',
      textSizeAdjust: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1280,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20,
      paddingBottom: 16,
      borderBottom: '1px solid #1e293b'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      ...TEXT_STYLES.heroTitle,
      background: 'linear-gradient(135deg, #f8fafc 0%, #a5b4fc 60%, #818cf8 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      marginBottom: 4,
      display: 'inline-block'
    }
  }, "\uD83C\uDFE0 Home Comparison"), /*#__PURE__*/React.createElement("p", {
    style: {
      ...bodyMutedTextStyle,
      fontSize: 12,
      marginTop: 4,
      marginBottom: 0
    }
  }, "Monthly payment includes P&I, tax, and HOA \xB7 Fountain-area homes excluded \xB7 canvas computes all scores")), importSummary.blockCount > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      ...model.labelTextStyle,
      fontWeight: 500,
      background: '#161d2a',
      border: '1px solid #2d3748',
      borderRadius: 8,
      padding: '8px 12px',
      marginBottom: 14,
      color: '#94a3b8',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: '#22c55e',
      display: 'inline-block',
      flexShrink: 0
    }
  }), "Parsed ", importSummary.importedCount, " imported home(s) from ", importSummary.blockCount, " block(s) \xB7 flagged ", importSummary.unknownFieldCount, " unknown field(s) \xB7 flagged ", importSummary.placeholderFieldCount, " blank field(s)"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      gap: 2,
      marginBottom: 20,
      background: '#111827',
      borderRadius: 10,
      padding: 4,
      border: '1px solid #1e293b',
      flexWrap: 'wrap'
    }
  }, ['overview', 'data-entry', 'compare', 'cards', 'weights'].map(k => {
    const label = k === 'overview' ? '📊 Overview' : k === 'data-entry' ? '🛠️ Data Entry' : k === 'compare' ? '⚡ Compare' : k === 'cards' ? '🏠 Cards' : '⚖️ Weights';
    const isActive = tab === k;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setTab(k),
      style: {
        ...TEXT_STYLES.bodyStrong,
        padding: '7px 16px',
        borderRadius: 7,
        border: 'none',
        cursor: 'pointer',
        background: isActive ? '#6366f1' : 'transparent',
        color: isActive ? '#fff' : '#64748b',
        boxShadow: isActive ? '0 2px 8px #6366f144' : 'none',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap'
      }
    }, label);
  })), importSummary.blockCount === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#161208',
      border: '1px solid #f59e0b44',
      borderRadius: 8,
      padding: '10px 14px',
      marginBottom: 16,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...TEXT_STYLES.label,
      color: '#fbbf24',
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", null, "\u26A0"), " No imported homes are currently loaded."), /*#__PURE__*/React.createElement("button", {
    onClick: () => setTab('data-entry'),
    style: {
      ...buttonTextStyle,
      border: '1px solid #2d3748',
      background: '#1a1a0e',
      borderRadius: 6,
      padding: '6px 12px',
      cursor: 'pointer',
      color: '#fbbf24'
    }
  }, "Open Data Entry")), tab === 'overview' && /*#__PURE__*/React.createElement(OverviewTab, model), tab === 'data-entry' && /*#__PURE__*/React.createElement(DataEntryTab, model), tab === 'compare' && /*#__PURE__*/React.createElement(CompareTab, model), tab === 'cards' && /*#__PURE__*/React.createElement(CardsTab, model), tab === 'weights' && /*#__PURE__*/React.createElement(WeightsTab, model)));
}
