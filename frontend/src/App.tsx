import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { store } from './store';
import { restoreSession } from './features/auth/authThunks';
import AppRoutes from './routes';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from 'react-hot-toast';
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});
const App = () => {
  useEffect(() => {
    store.dispatch(restoreSession());
  }, []);
  return <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <ThemeProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
          <Toaster />
        </ThemeProvider>
      </Provider>
    </QueryClientProvider>
    </ErrorBoundary>;
};
export default App;