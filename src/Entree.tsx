import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import Application from './Application.tsx';
import './StylesGlobaux.css';

// Cacher le skeleton inline des que React est pret
if (typeof window !== 'undefined' && (window as any).__hideSkeleton) {
  (window as any).__hideSkeleton();
}

// Retirer les balises SEO pré-rendues : react-helmet-async (React 19) ajoute
// les siennes sans supprimer les existantes, ce qui doublait canonique/titre.
document.head.querySelectorAll('[data-seo]').forEach((el) => el.remove());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Application />
  </StrictMode>,
);