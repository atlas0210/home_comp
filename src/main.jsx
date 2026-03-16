import { React, ReactDOM } from './shared/runtime.js';
import App from './app/App.js';

const status = document.getElementById('status');
const rootEl = document.getElementById('root');
let runtimeFailed = false;

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

try {
  if (!window.React || !window.ReactDOM || !window.PropTypes || !window.Babel || !window.Recharts) {
    const missing = [
      !window.React && 'React',
      !window.ReactDOM && 'ReactDOM',
      !window.PropTypes && 'PropTypes',
      !window.Babel && 'Babel',
      !window.Recharts && 'Recharts',
    ].filter(Boolean).join(', ');
    throw new Error('Dependency scripts failed to load: ' + missing);
  }

  ReactDOM.createRoot(rootEl).render(React.createElement(App));
  if (status && !runtimeFailed) status.textContent = 'App loaded.';
} catch (error) {
  console.error(error);
  if (status) {
    status.textContent = 'Failed to load app: ' + (error && error.message ? error.message : String(error));
  }
}
