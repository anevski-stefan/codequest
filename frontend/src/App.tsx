import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from 'react-query';
import { store } from './store';
import AppRoutes from './routes';

const queryClient = new QueryClient();

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="min-h-screen bg-gray-100">
            <AppRoutes />
          </div>
        </Router>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
