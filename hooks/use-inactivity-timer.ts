
'use client';
/**
 * @fileOverview A custom React hook to detect user inactivity.
 */
import { useEffect, useRef } from 'react';

/**
 * Triggers a callback function after a specified period of user inactivity.
 * @param {() => void} onTimeout The function to call when the timer expires.
 * @param {number} timeout The inactivity timeout in milliseconds.
 */
export default function useInactivityTimer(onTimeout: () => void, timeout: number) {
  const timeoutId = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }
    timeoutId.current = setTimeout(onTimeout, timeout);
  };

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];

    const handleActivity = () => {
      resetTimer();
    };

    // Set up event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Initialize the timer
    resetTimer();

    // Cleanup function
    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [onTimeout, timeout]); // Rerun effect if onTimeout or timeout changes
}
