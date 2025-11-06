import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Loading fallback component
 */
function LoadingFallback({ message = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-3" />
        <p className="text-dark-400 text-sm">{message}</p>
      </div>
    </div>
  );
}

/**
 * Lazy loader wrapper with suspense
 */
export function LazyLoader({ children, fallback }) {
  return (
    <Suspense fallback={fallback || <LoadingFallback />}>
      {children}
    </Suspense>
  );
}

/**
 * Create lazy loaded component
 */
export function createLazyComponent(importFunc, fallback) {
  const LazyComponent = React.lazy(importFunc);
  
  return function LazyWrapped(props) {
    return (
      <LazyLoader fallback={fallback}>
        <LazyComponent {...props} />
      </LazyLoader>
    );
  };
}

export default LazyLoader;
