import { useState } from 'react';
import { X } from 'lucide-react';
import axios from 'axios';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      setStatus('loading');
      setErrorMessage('');
      await axios.post(`${import.meta.env.VITE_API_URL}/api/feedback`, {
        message,
        email: 'anevskistefan11@gmail.com'
      });
      setStatus('success');
      setMessage('');
      setTimeout(() => {
        onClose();
        setStatus('idle');
      }, 2000);
    } catch (error) {
      setStatus('error');
      setErrorMessage('Failed to send feedback. Please try again later.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              onClick={onClose}
              className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 className="text-lg font-semibold leading-6 text-gray-900 dark:text-white">
                Send Feedback
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  We'd love to hear your thoughts about the app. Your feedback helps us improve!
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-4">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white p-4"
                  placeholder="Your feedback..."
                  required
                />
                
                {/* Status/Error Messages */}
                {(status === 'error' || status === 'success') && (
                  <div className={`mt-2 text-sm ${
                    status === 'success' ? 'text-green-600 dark:text-green-400' : 
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {status === 'success' ? 'Feedback sent successfully!' : errorMessage}
                  </div>
                )}

                <div className="mt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {status === 'loading' ? 'Sending...' : 
                     status === 'success' ? 'Sent!' : 
                     'Send Feedback'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 