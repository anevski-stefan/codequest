import { AxiosError } from 'axios';

export function useAxiosError() {
  const getErrorMessage = (error: unknown, retryCount: number, maxRetries: number) => {
    if (error instanceof AxiosError) {
      if (error.response?.status === 429 && retryCount < maxRetries) {
        const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 10000);
        return `Rate limited. Retrying in ${backoffTime/1000} seconds...`;
      }
      
      return error.code === 'ECONNABORTED'
        ? 'Request timed out. Please try again.'
        : error.response
        ? `Server error: ${error.response.data?.error || error.message}`
        : error.request
        ? 'No response from server. Please check your connection.'
        : `Network error: ${error.message}`;
    }
    
    return 'An unexpected error occurred. Please try again later.';
  };

  return { getErrorMessage };
} 