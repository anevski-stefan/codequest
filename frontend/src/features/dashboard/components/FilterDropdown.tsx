import { ChevronDown } from 'lucide-react';

interface FilterDropdownProps {
  label: string;
  options: string[] | { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

export function FilterDropdown({ label, options, value, onChange }: FilterDropdownProps) {
  return (
    <div className="relative w-full">
      <select
        className="w-full appearance-none bg-white/[0.05] border border-white/[0.08] rounded-xl pl-3 pr-8 py-2 text-sm text-gray-300 hover:text-white hover:border-white/[0.15] hover:bg-white/[0.07] focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.07] transition-all duration-200 cursor-pointer [&>option]:bg-[#0A1020] [&>option]:text-gray-300"
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label={label}
      >
        {options.map(option => (
          <option
            key={typeof option === 'string' ? option : option.value}
            value={typeof option === 'string' ? option : option.value}
          >
            {typeof option === 'string'
              ? option ? option.charAt(0).toUpperCase() + option.slice(1) : 'All Languages'
              : option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
    </div>
  );
}
