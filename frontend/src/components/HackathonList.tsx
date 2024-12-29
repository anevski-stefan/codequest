import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, MapPin, Trophy } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import { usePageTitle } from '../hooks/usePageTitle';

interface Hackathon {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  prize: string;
  url: string;
  source: string;
  tags: string[];
}

export default function HackathonList() {
  usePageTitle('Hackathons');
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const fetchHackathons = async (retryCount = 0, maxRetries = 3) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/hackathons`, {
        params: { page, limit: 10 },
        timeout: 10000,
        withCredentials: true
      });
      
      if (response.status === 202) {
        setTimeout(fetchHackathons, 2000);
        return;
      }
      
      if (response.data && Array.isArray(response.data.hackathons)) {
        setHackathons(response.data.hackathons);
        setTotalPages(response.data.totalPages || 1);
        setLoading(false);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Error fetching hackathons:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          // Rate limit exceeded, implement exponential backoff
          if (retryCount < maxRetries) {
            const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 10000);
            console.log(`Rate limited. Retrying in ${backoffTime}ms...`);
            setError(`Rate limited. Retrying in ${backoffTime/1000} seconds...`);
            setTimeout(() => {
              fetchHackathons(retryCount + 1, maxRetries);
            }, backoffTime);
            return;
          }
        }
        
        if (error.code === 'ECONNABORTED') {
          setError('Request timed out. Please try again.');
        } else if (error.response) {
          const message = error.response.data?.error || error.message;
          setError(`Server error: ${message}`);
        } else if (error.request) {
          setError('No response from server. Please check your connection.');
        } else {
          setError(`Network error: ${error.message}`);
        }
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
      
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchHackathons();
  }, [page]);

  if (loading && hackathons.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Upcoming Hackathons
        </h2>
        <div className="flex justify-center items-center min-h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Upcoming Hackathons
        </h2>
        <div className="text-center text-red-600 dark:text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        Upcoming Hackathons
      </h2>
      
      <div className="grid gap-6">
        {hackathons.map((hackathon) => (
          <div key={hackathon.url} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {hackathon.title}
              </h3>
              <span className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                {hackathon.source}
              </span>
            </div>
            
            <p className="mt-2 text-gray-600 dark:text-gray-300">{hackathon.description}</p>
            
            <div className="mt-4 flex flex-wrap gap-4">
              <div className="flex items-center text-gray-500 dark:text-gray-400">
                <Calendar className="w-4 h-4 mr-2" />
                {hackathon.startDate}
              </div>
              {hackathon.location && (
                <div className="flex items-center text-gray-500 dark:text-gray-400">
                  <MapPin className="w-4 h-4 mr-2" />
                  {hackathon.location}
                </div>
              )}
              {hackathon.prize && (
                <div className="flex items-center text-gray-500 dark:text-gray-400">
                  <Trophy className="w-4 h-4 mr-2" />
                  {hackathon.prize}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {hackathon.tags.map((tag) => (
                <span key={tag} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                  {tag}
                </span>
              ))}
            </div>

            <a
              href={hackathon.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              View Details
            </a>
          </div>
        ))}
      </div>

      {loading && hackathons.length > 0 && (
        <div className="flex justify-center mt-6">
          <LoadingSpinner size="md" />
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          <button
            onClick={() => page > 1 && setPage(page - 1)}
            disabled={page === 1 || loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 
              bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 
              rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 
              disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => page < totalPages && setPage(page + 1)}
            disabled={page === totalPages || loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 
              bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 
              rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 
              disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
} 