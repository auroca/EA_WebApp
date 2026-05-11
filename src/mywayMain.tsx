import React from 'react';
import ReactDOM from 'react-dom/client';
import MyWayApp from './MyWayApp';
import './index.css';
import './route.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MyWayApp />
  </React.StrictMode>
);