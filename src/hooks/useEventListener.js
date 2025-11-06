import { useEffect, useRef } from 'react';

/**
 * Custom hook for adding event listeners
 * @param {string} eventName - Event name
 * @param {Function} handler - Event handler
 * @param {Element} element - Target element (default: window)
 */
export function useEventListener(eventName, handler, element = window) {
  const savedHandler = useRef();

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const isSupported = element && element.addEventListener;
    if (!isSupported) return;

    const eventListener = (event) => savedHandler.current(event);
    element.addEventListener(eventName, eventListener);

    return () => {
      element.removeEventListener(eventName, eventListener);
    };
  }, [eventName, element]);
}
