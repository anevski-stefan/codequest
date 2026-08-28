import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { store } from './store';
import { api } from './services/github';
import { setCredentials, finishRestore } from './features/auth/authSlice';
import AppRoutes from './routes';
import CodeBuddy from './components/CodeBuddy';
import { Toaster } from 'react-hot-toast';
const queryClient = new QueryClient();
const App = () => {
  useEffect(() => {
    api.get('/auth/me').then(res => {
      if (res.data?.user) {
        store.dispatch(setCredentials({
          user: res.data.user
        }));
      } else {
        store.dispatch(finishRestore());
      }
    }).catch(() => {
      store.dispatch(finishRestore());
    });
  }, []);
  return <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <ThemeProvider>
          <BrowserRouter>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
              <div className="min-h-screen">
                <AppRoutes />
                <CodeBuddy />
              </div>
            </div>
          </BrowserRouter>
        </ThemeProvider>
        <Toaster />
      </Provider>
    </QueryClientProvider>;
};
export default App;