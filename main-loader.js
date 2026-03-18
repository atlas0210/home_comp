import { React, ReactDOM } from './src/shared/runtime.js?v=20260317d';
import App from './src/app/App.js?v=20260318a';

const status = document.getElementById('status');
const rootEl = document.getElementById('root');
let runtimeFailed = false;
const SEED_OVERRIDES_URL = './src/data/seedOverrides.json';
const SEED_IMPORT_URL = './src/data/importSeed.txt';

const showRuntimeError = (msg) => {
  runtimeFailed = true;
  if (status) {
    status.textContent = 'Runtime error: ' + msg;
    status.style.display = 'block';
  }
};

window.addEventListener('error', (event) => {
  if (event && event.error) showRuntimeError(event.error.message || String(event.error));
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event && event.reason;
  showRuntimeError(reason && reason.message ? reason.message : String(reason));
});

const loadCommittedSeedData = async () => {
  const [overrideResponse, importResponse] = await Promise.all([
    fetch(SEED_OVERRIDES_URL, { cache: 'no-store' }),
    fetch(SEED_IMPORT_URL, { cache: 'no-store' }),
  ]);

  if (!overrideResponse.ok) {
    throw new Error(`Failed to load committed overrides (${overrideResponse.status} ${overrideResponse.statusText}).`);
  }
  if (!importResponse.ok) {
    throw new Error(`Failed to load committed imports (${importResponse.status} ${importResponse.statusText}).`);
  }

  let seedOverridesByHomeId;
  try {
    seedOverridesByHomeId = await overrideResponse.json();
  } catch {
    throw new Error('Committed overrides file is not valid JSON.');
  }

  if (!seedOverridesByHomeId || typeof seedOverridesByHomeId !== 'object' || Array.isArray(seedOverridesByHomeId)) {
    throw new Error('Committed overrides file must be a JSON object keyed by home ID.');
  }

  return {
    seedOverridesByHomeId,
    seedImportRawText: await importResponse.text(),
  };
};

const boot = async () => {
  if (!window.React || !window.ReactDOM || !window.PropTypes || !window.Recharts) {
    const missing = [
      !window.React && 'React',
      !window.ReactDOM && 'ReactDOM',
      !window.PropTypes && 'PropTypes',
      !window.Recharts && 'Recharts',
    ].filter(Boolean).join(', ');
    throw new Error('Dependency scripts failed to load: ' + missing);
  }

  if (status) status.textContent = 'Loading committed app data...';
  const seedData = await loadCommittedSeedData();
  ReactDOM.createRoot(rootEl).render(React.createElement(App, seedData));
  if (status && !runtimeFailed) status.textContent = 'App loaded.';
};

boot().catch((error) => {
  console.error(error);
  showRuntimeError(error && error.message ? error.message : String(error));
});
