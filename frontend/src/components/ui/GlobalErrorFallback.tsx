import { ErrorDisplay } from './ErrorDisplay';

export const GlobalErrorFallback = ({ error, resetError }: { error: unknown; resetError: () => void }) => (
  <div className="flex h-screen w-full items-center justify-center p-6 bg-base">
    <div className="w-full max-w-lg">
      <ErrorDisplay 
        title="Application Error" 
        error={error instanceof Error ? error.message : 'An unexpected error occurred'} 
        onRetry={resetError}
      />
    </div>
  </div>
);
