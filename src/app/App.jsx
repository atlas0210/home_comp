import { React } from '../shared/runtime.js';
import { TEXT_STYLES } from '../shared/uiTokens.js';
import { useHomeCompModel } from '../hooks/useHomeCompModel.js?v=20260317d';
import OverviewTab from './tabs/OverviewTab.js';
import DataEntryTab from './tabs/DataEntryTab.js?v=20260317d';
import CompareTab from './tabs/CompareTab.js';
import CardsTab from './tabs/CardsTab.js?v=20260317d';
import WeightsTab from './tabs/WeightsTab.js';

export default function App({ seedOverridesByHomeId = {}, seedImportRawText = '' }) {
  const model = useHomeCompModel({ seedOverridesByHomeId, seedImportRawText });
  const { isMobile, bodyMutedTextStyle, importSummary, buttonTextStyle, tab, setTab } = model;

  return (
    <div style={{ fontFamily: model.FONT_STACKS.sans, background: '#0f172a', minHeight: '100vh', color: '#e2e8f0', padding: isMobile ? 10 : 16, WebkitTextSizeAdjust: '100%', textSizeAdjust: '100%' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <h1 style={{ ...TEXT_STYLES.heroTitle, color: '#f8fafc', marginBottom: 4 }}>🏠 Home Comparison Dashboard</h1>
        <p style={{ ...bodyMutedTextStyle, marginBottom: 16 }}>Monthly payment includes P&amp;I, tax, and HOA · Fountain-area homes are excluded for safety concerns · canvas computes all scores</p>
        {importSummary.blockCount > 0 && <div style={{ ...model.labelTextStyle, background: '#111827', border: '1px solid #334155', borderRadius: 8, padding: '8px 10px', marginBottom: 12 }}>Parsed {importSummary.importedCount} imported home(s) from {importSummary.blockCount} block(s) · flagged {importSummary.unknownFieldCount} unknown field(s) · flagged {importSummary.placeholderFieldCount} blank field(s)</div>}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {['overview', 'data-entry', 'compare', 'cards', 'weights'].map((k) => {
            const label = k === 'overview' ? '📊 Overview' : k === 'data-entry' ? '🛠️ Data Entry' : k === 'compare' ? '⚡ Compare' : k === 'cards' ? '🏠 Cards' : '⚖️ Weights';
            return <button key={k} onClick={() => setTab(k)} style={{ ...TEXT_STYLES.bodyStrong, padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: tab === k ? '#6366f1' : '#1e293b', color: tab === k ? '#fff' : '#94a3b8' }}>{label}</button>;
          })}
        </div>
        {importSummary.blockCount === 0 && (
          <div style={{ background: '#1f2937', border: '1px solid #f59e0b66', borderRadius: 8, padding: '8px 10px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ ...TEXT_STYLES.label, color: '#fcd34d' }}>No imported homes are currently loaded.</div>
            <button onClick={() => setTab('data-entry')} style={{ ...buttonTextStyle, border: '1px solid #334155', background: '#111827', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>Open Data Entry</button>
          </div>
        )}

        {tab === 'overview' && <OverviewTab {...model} />}
        {tab === 'data-entry' && <DataEntryTab {...model} />}
        {tab === 'compare' && <CompareTab {...model} />}
        {tab === 'cards' && <CardsTab {...model} />}
        {tab === 'weights' && <WeightsTab {...model} />}
      </div>
    </div>
  );
}
