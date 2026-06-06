import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import Application from './Application.tsx';
import './StylesGlobaux.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Application />
  </StrictMode>,
);
