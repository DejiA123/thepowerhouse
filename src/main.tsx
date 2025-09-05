import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('main.tsx: React loaded:', !!React);
console.log('main.tsx: React.createContext available:', !!React.createContext);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('main.tsx: App rendered successfully');
} catch (error) {
  console.error('main.tsx: Error rendering app:', error);
}