import { Search } from 'lucide-react';
import { memo } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchBar = memo(function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
  return (
    <div className="relative w-full max-w-md">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg 
                 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 
                 placeholder:text-gray-500 dark:placeholder:text-gray-400
                 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                 text-base font-medium"
        placeholder={placeholder || "Search hackathons..."}
      />
    </div>
  );
}); 