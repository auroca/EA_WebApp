import React from 'react';
import ReactDOM from 'react-dom/client';
import RouteApp from './RouteApp';
import './index.css';
import './route.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RouteApp />
  </React.StrictMode>
);