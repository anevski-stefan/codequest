import { ChevronDown } from 'lucide-react';

type Option = string | { value: string; label: string };

interface FilterChipProps {
  prefix: string;
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  maxW?: string;
  defaultValue?: string;
}

const FilterChip = ({ prefix, options, value, onChange, maxW = '', defaultValue = '' }: FilterChipProps) => {
  const selected = options.find(o => (typeof o === 'string' ? o : o.value) === value);
  const selectedLabel = selected
    ? (typeof selected === 'string' ? (selected || 'All') : selected.label)
    : 'All';
  const isActive = value !== defaultValue;

  return (
    <div className={`relative flex-1 min-w-[110px] ${maxW} h-8`}>
      <div className={`absolute inset-0 flex items-center gap-1.5 px-3 rounded-lg border text-xs transition-all pointer-events-none ${
        isActive
          ? 'border-blue-500/40 bg-blue-500/[0.08]'
          : 'border-white/[0.10] bg-[#111927]'
      }`}>
        <span className="text-gray-500 whitespace-nowrap">{prefix}:</span>
        <span className={`font-medium truncate ${isActive ? 'text-blue-300' : 'text-gray-200'}`}>
          {selectedLabel}
        </span>
        <ChevronDown className={`w-3 h-3 ml-auto shrink-0 ${isActive ? 'text-blue-400' : 'text-gray-600'}`} />
      </div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer w-full"
        aria-label={prefix}
      >
        {options.map(o => (
          <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
            {typeof o === 'string' ? (o || 'All') : o.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default FilterChip;
