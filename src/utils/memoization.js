import React from 'react';

/**
 * Create a memoized component with custom comparison
 * @param {React.Component} Component - Component to memoize
 * @param {Function} propsAreEqual - Custom comparison function
 */
export function createMemoComponent(Component, propsAreEqual) {
  return React.memo(Component, propsAreEqual);
}

/**
 * Shallow comparison for props
 */
export function shallowEqual(prevProps, nextProps) {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  return prevKeys.every(key => prevProps[key] === nextProps[key]);
}

/**
 * Deep comparison for specific props
 */
export function deepEqualProps(keys) {
  return (prevProps, nextProps) => {
    return keys.every(key => {
      return JSON.stringify(prevProps[key]) === JSON.stringify(nextProps[key]);
    });
  };
}

/**
 * Memoize expensive calculations
 */
export class MemoCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key) {
    const serializedKey = JSON.stringify(key);
    return this.cache.get(serializedKey);
  }

  set(key, value) {
    const serializedKey = JSON.stringify(key);
    
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(serializedKey, value);
  }

  has(key) {
    const serializedKey = JSON.stringify(key);
    return this.cache.has(serializedKey);
  }

  clear() {
    this.cache.clear();
  }
}

/**
 * Create memoized function with cache
 */
export function memoize(fn, cacheSize = 100) {
  const cache = new MemoCache(cacheSize);

  return function memoized(...args) {
    if (cache.has(args)) {
      return cache.get(args);
    }

    const result = fn.apply(this, args);
    cache.set(args, result);
    return result;
  };
}
