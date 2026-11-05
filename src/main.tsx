import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Filter out noisy third-party browser extension errors (e.g. video sniffers, adblockers)
window.addEventListener('error', (event) => {
  if (
    event.filename?.startsWith('chrome-extension://') ||
    event.message?.includes('chrome-extension://') ||
    (event.message?.includes('SecurityError') && event.message?.includes('Blocked a frame with origin'))
  ) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return true;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = typeof reason === 'string' ? reason : reason?.message || '';
  const stack = reason?.stack || '';
  if (
    message.includes('chrome-extension://') ||
    stack.includes('chrome-extension://') ||
    (message.includes('SecurityError') && message.includes('Blocked a frame with origin'))
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(<App />);
