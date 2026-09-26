import { useState, useRef } from 'react';
import { X } from 'lucide-react';
interface LabelsFilterProps {
  selectedLabels: string[];
  onLabelsChange: (labels: string[]) => void;
}
export default function LabelsFilter({
  selectedLabels,
  onLabelsChange
}: LabelsFilterProps) {
  const [inputValue, setInputValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    if (!isComposing && (value.includes(' ') || value.includes(','))) {
      const newLabels = value.split(/[\s,]+/).map(label => label.trim()).filter(label => label && !selectedLabels.includes(label));
      if (newLabels.length > 0) {
        onLabelsChange([...selectedLabels, ...newLabels]);
        setInputValue('');
      }
    }
  };
  const handleBlur = () => {
    if (inputValue.trim() && !selectedLabels.includes(inputValue.trim())) {
      onLabelsChange([...selectedLabels, inputValue.trim()]);
      setInputValue('');
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (!selectedLabels.includes(inputValue.trim())) {
        onLabelsChange([...selectedLabels, inputValue.trim()]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && selectedLabels.length > 0) {
      onLabelsChange(selectedLabels.slice(0, -1));
    }
  };
  const removeLabel = (labelToRemove: string) => {
    onLabelsChange(selectedLabels.filter(label => label !== labelToRemove));
  };
  const handleContainerClick = () => {
    inputRef.current?.focus();
  };
  return <div className="relative">
      <div onClick={handleContainerClick} className="flex flex-wrap items-center gap-1.5 px-2.5 py-1 bg-[#363B52] border border-white/[0.09] rounded-lg min-h-8 cursor-text hover:border-white/[0.18] focus-within:border-blue-500/50 focus-within:shadow-[0_0_0_3px_rgba(59,123,255,0.12)] transition-all">
        {selectedLabels.map(label => <span key={label} className="inline-flex items-center gap-0.5 pl-2 pr-1 h-5 rounded-md text-[11px] font-semibold bg-blue-500/[0.12] border border-blue-500/30 text-blue-300 whitespace-nowrap">
            {label}
            <button onClick={e => {
          e.stopPropagation();
          removeLabel(label);
        }} className="p-0.5 rounded hover:bg-blue-400/20 hover:text-white transition-colors cursor-pointer" aria-label={`Remove ${label}`}>
              <X size={11} />
            </button>
          </span>)}
        <input ref={inputRef} type="text" value={inputValue} onChange={handleInputChange} onKeyDown={handleKeyDown} onBlur={handleBlur} onCompositionStart={() => setIsComposing(true)} onCompositionEnd={() => setIsComposing(false)} placeholder={selectedLabels.length === 0 ? "Labels: type and press Enter" : ""} aria-label="Filter by labels" className="flex-1 min-w-[80px] sm:min-w-[100px] outline-none focus-visible:outline-none bg-transparent text-[11px] text-gray-200 placeholder-gray-500" />
      </div>
    </div>;
}