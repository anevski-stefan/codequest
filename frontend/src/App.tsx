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
          <Toaster
            position="bottom-right"
            gutter={10}
            toastOptions={{
              duration: 4000,
              className: '!rounded-xl !border !border-white/[0.09] !bg-[#363B52] !text-gray-200 !text-[13px] !shadow-[0_16px_32px_-12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.07)]',
              success: { iconTheme: { primary: '#86efac', secondary: '#363B52' } },
              error: {
                duration: 6000,
                iconTheme: { primary: '#fca5a5', secondary: '#363B52' }
              }
            }} />
        </ThemeProvider>
      </Provider>
    </QueryClientProvider>
    </ErrorBoundary>;
};
export default App;