import React from 'react';
import ReactDOM from 'react-dom/client';
import MyWayApp from './MyWayApp';
import './index.css';
import './route.css';
import { LanguageProvider } from './i18n/LanguageContext';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <LanguageProvider>
      <MyWayApp />
    </LanguageProvider>
  </React.StrictMode>
);
