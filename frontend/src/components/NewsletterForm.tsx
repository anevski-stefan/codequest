import { useState } from 'react';
import { Send } from 'lucide-react';
import axios from 'axios';

const NewsletterForm = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) return;

    try {
      setStatus('loading');
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/newsletter/subscribe`,
        { email }
      );

      setStatus('success');
      setMessage(response.data.message);
      setEmail('');
      
      // Preserve the current page title
      document.title = document.title;
      
    } catch (error: any) {
      setStatus('error');
      setMessage(
        error.response?.data?.error || 
        'Something went wrong. Please try again later.'
      );
    }
  };

  return (
    <div className="mt-8 max-w-md mx-auto">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
          Stay Updated
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Subscribe to our newsletter for updates and new features
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            disabled={status === 'loading'}
            required
            pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
          />
          <button
            type="submit"
            disabled={status === 'loading' || !email}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {status === 'loading' ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>

        {message && (
          <p className={`text-sm text-center ${
            status === 'success' ? 'text-green-600 dark:text-green-400' : 
            status === 'error' ? 'text-red-600 dark:text-red-400' : ''
          }`}>
            {message}
          </p>
        )}
      </form>
    </div>
  );
};

export default NewsletterForm; 