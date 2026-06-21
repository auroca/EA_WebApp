import React from 'react';
import ReactDOM from 'react-dom/client';
import RouteApp from './RouteApp';
import './index.css';
import './route.css';
import { LanguageProvider } from './i18n/LanguageContext';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <LanguageProvider>
      <RouteApp />
    </LanguageProvider>
  </React.StrictMode>
);
