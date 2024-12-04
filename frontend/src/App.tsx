import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from 'react-query';
import { store } from './store';
import AppRoutes from './routes';
import { useTheme } from './contexts/ThemeContext';

const queryClient = new QueryClient();

function App() {
  const { theme } = useTheme();
  
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className={`min-h-screen ${theme === 'dark' ? 'dark' : ''}`}>
            <div className="min-h-screen bg-white dark:bg-gray-900">
              <AppRoutes />
            </div>
          </div>
        </Router>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
