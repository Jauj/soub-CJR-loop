import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import Application from './Application.tsx';
import './StylesGlobaux.css';

// Cacher le skeleton inline des que React est pret
if (typeof window !== 'undefined' && (window as any).__hideSkeleton) {
  (window as any).__hideSkeleton();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Application />
  </StrictMode>,
);