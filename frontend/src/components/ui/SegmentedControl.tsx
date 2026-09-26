import { useId } from 'react';
import { motion } from 'framer-motion';

interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}

// Radio-group semantics with a spring-animated thumb.
function SegmentedControl<T extends string>({ label, value, onChange, options }: SegmentedControlProps<T>) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex items-center h-8 p-0.5 rounded-lg border border-white/[0.09] bg-[#252836]">
      {options.map(o => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`relative h-full px-3 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${active ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-md bg-[#363B52] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_1px_2px_rgba(0,0,0,0.3)]"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
