import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { populateInitialData } from './db';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Populate initial data when the app starts
populateInitialData().then(() => {
  console.log("Database populated or already has data.");
}).catch(err => {
  console.error("Failed to populate database:", err);
});

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
