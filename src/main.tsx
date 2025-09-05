import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Ensure React is available globally for debugging
(window as any).React = React;

console.log('main.tsx: React loaded:', !!React);
console.log('main.tsx: React.createContext available:', !!React.createContext);
console.log('main.tsx: React.forwardRef available:', !!React.forwardRef);

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found');
  throw new Error('Root element not found');
}

// Add error boundary for React loading issues
const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  try {
    return <>{children}</>;
  } catch (error) {
    console.error('React Error Boundary caught:', error);
    return <div>Loading error. Please refresh the page.</div>;
  }
};

try {
  console.log('main.tsx: Creating React root...');
  const root = ReactDOM.createRoot(rootElement);
  
  console.log('main.tsx: Rendering app...');
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
  console.log('main.tsx: App rendered successfully');
} catch (error) {
  console.error('main.tsx: Critical error rendering app:', error);
  // Fallback rendering without StrictMode
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
    console.log('main.tsx: Fallback render successful');
  } catch (fallbackError) {
    console.error('main.tsx: Fallback render also failed:', fallbackError);
    rootElement.innerHTML = '<div style="padding: 20px; color: red;">Application failed to load. Please refresh the page.</div>';
  }
}