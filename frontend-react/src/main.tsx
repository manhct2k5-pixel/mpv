import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AuthInitializer from './components/layout/AuthInitializer.tsx';
import ErrorBoundary from './components/layout/ErrorBoundary.tsx';
import App from './App.tsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthInitializer>
            <App />
          </AuthInitializer>
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>
);
