import { useState, useRef } from 'react';
import { X } from 'lucide-react';

interface LabelsFilterProps {
  selectedLabels: string[];
  onLabelsChange: (labels: string[]) => void;
}

export default function LabelsFilter({ selectedLabels, onLabelsChange }: LabelsFilterProps) {
  const [inputValue, setInputValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle input changes with auto-complete
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // If the input includes a space or comma, treat it as a complete label
    if (!isComposing && (value.includes(' ') || value.includes(','))) {
      const newLabels = value
        .split(/[\s,]+/) // Split by spaces or commas
        .map(label => label.trim())
        .filter(label => label && !selectedLabels.includes(label));

      if (newLabels.length > 0) {
        onLabelsChange([...selectedLabels, ...newLabels]);
        setInputValue('');
      }
    }
  };

  // Handle blur event to add the current input as a label
  const handleBlur = () => {
    if (inputValue.trim() && !selectedLabels.includes(inputValue.trim())) {
      onLabelsChange([...selectedLabels, inputValue.trim()]);
      setInputValue('');
    }
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (!selectedLabels.includes(inputValue.trim())) {
        onLabelsChange([...selectedLabels, inputValue.trim()]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && selectedLabels.length > 0) {
      // Remove the last label when backspace is pressed with empty input
      onLabelsChange(selectedLabels.slice(0, -1));
    }
  };

  const removeLabel = (labelToRemove: string) => {
    onLabelsChange(selectedLabels.filter(label => label !== labelToRemove));
  };

  // Focus input when clicking the container
  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div 
        onClick={handleContainerClick}
        className="flex flex-wrap gap-2 p-2 border rounded-lg min-h-[42px] bg-white cursor-text"
      >
        {selectedLabels.map(label => (
          <span
            key={label}
            className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
          >
            {label}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeLabel(label);
              }}
              className="ml-1 hover:text-blue-600"
            >
              <X size={14} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder={selectedLabels.length === 0 ? "Add labels..." : ""}
          className="flex-1 min-w-[100px] outline-none bg-transparent"
        />
      </div>
    </div>
  );
} 