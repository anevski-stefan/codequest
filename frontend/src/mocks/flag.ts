// Single switch for mock mode. Set VITE_USE_MOCK_DATA=true in frontend/.env
// to run the whole UI against local fixtures instead of the backend.
export const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
