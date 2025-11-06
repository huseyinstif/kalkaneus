import { useEffect, useRef } from 'react';

/**
 * Custom hook for monitoring component performance
 * @param {string} componentName - Name of the component
 * @param {boolean} enabled - Enable performance monitoring
 */
export function usePerformance(componentName, enabled = import.meta.env.DEV) {
  const renderCount = useRef(0);
  const renderTime = useRef(performance.now());

  useEffect(() => {
    if (!enabled) return;

    renderCount.current += 1;
    const currentTime = performance.now();
    const timeSinceLastRender = currentTime - renderTime.current;
    renderTime.current = currentTime;

    if (renderCount.current > 1) {
      console.log(
        `[Performance] ${componentName} - Render #${renderCount.current} - Time: ${timeSinceLastRender.toFixed(2)}ms`
      );
    }
  });

  return {
    renderCount: renderCount.current,
    getRenderCount: () => renderCount.current
  };
}

/**
 * Hook for measuring function execution time
 */
export function useMeasure() {
  return (fn, label = 'Function') => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    if (import.meta.env.DEV) {
      console.log(`[Performance] ${label} took ${(end - start).toFixed(2)}ms`);
    }
    
    return result;
  };
}
