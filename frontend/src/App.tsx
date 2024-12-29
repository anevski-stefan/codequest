import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from 'react-query';
import { store } from './store';
import AppRoutes from './routes';
import { useTheme } from './contexts/ThemeContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  const { theme } = useTheme();
  
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className={`min-h-screen ${theme === 'dark' ? 'dark' : ''}`}>
            <div className="min-h-screen bg-white dark:bg-gradient-to-br dark:from-gray-950 dark:via-[#0B1222] dark:to-gray-900">
              <AppRoutes />
            </div>
          </div>
        </Router>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
