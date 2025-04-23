import { ChevronDown } from 'lucide-react';

interface FilterDropdownProps {
  label: string;
  options: string[] | { value: string; label: string; }[];
  value: string;
  onChange: (value: string) => void;
}

export function FilterDropdown({ label, options, value, onChange }: FilterDropdownProps) {
  return (
    <div className="relative w-full">
      <select
        className="w-full appearance-none bg-white dark:bg-[#0B1222] border border-gray-300 dark:border-white/10 rounded-lg pl-2 md:pl-3 pr-8 md:pr-10 py-1.5 md:py-2 text-sm md:text-base text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors dark:[&>option]:bg-[#0B1222] [&>option]:bg-white"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        aria-label={label}
      >
        {options.map((option) => (
          <option 
            key={typeof option === 'string' ? option : option.value} 
            value={typeof option === 'string' ? option : option.value}
            className="bg-white dark:!bg-[#0B1222] text-gray-700 dark:!text-gray-300"
          >
            {typeof option === 'string' 
              ? (option ? option.charAt(0).toUpperCase() + option.slice(1) : 'All Languages')
              : option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 md:right-3 top-1.5 md:top-2.5 text-gray-400" size={16} />
    </div>
  );
} 