// Developer Portal Entry Point
// Runs on separate port (5174) from main app

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import DeveloperApp from './DeveloperApp';
import '../index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <DeveloperApp />
    </BrowserRouter>
  </React.StrictMode>
);
