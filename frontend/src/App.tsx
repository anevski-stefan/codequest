import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { store } from './store';
import AppRoutes from './routes';
import CodeBuddy from './components/CodeBuddy';
import { Toaster } from 'react-hot-toast';

// Create a client (outside of component to avoid recreation)
const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
};

export default App;
