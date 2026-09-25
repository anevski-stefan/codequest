interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const sizes = { sm: 'h-4 w-4 border-[1.5px]', md: 'h-6 w-6 border-2', lg: 'h-9 w-9 border-2' };

const LoadingSpinner = ({ size = 'md', label = 'Loading' }: LoadingSpinnerProps) => (
  <div className="flex justify-center items-center py-8" role="status" aria-label={label}>
    <span className={`${sizes[size]} rounded-full border-white/10 border-t-blue-400 animate-spin`} />
  </div>
);

export default LoadingSpinner;
