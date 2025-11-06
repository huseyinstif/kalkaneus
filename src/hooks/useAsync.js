import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for handling async operations
 * @param {Function} asyncFunction - Async function to execute
 * @param {boolean} immediate - Execute immediately on mount
 * @returns {Object} { execute, loading, data, error }
 */
export function useAsync(asyncFunction, immediate = true) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...params) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await asyncFunction(...params);
      setData(response);
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { execute, loading, data, error };
}
