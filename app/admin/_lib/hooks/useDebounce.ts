// lib/hooks/useDebounce.ts (o la ruta que corresponda a tu alias @/hooks)
import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce a value.
 * Useful for delaying updates based on user input, like search terms.
 * @param value The value to debounce.
 * @param delay The debounce delay in milliseconds.
 * @returns The debounced value./hooks/useDebounce.ts
 */
export function useDebounce<T>(value: T, delay: number): T {
    // State and setters for debounced value
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(
        () => {
            // Update debounced value after delay
            const handler = setTimeout(() => {
                setDebouncedValue(value);
            }, delay);

            // Cancel the timeout if value changes (also on delay change or unmount)
            // This is how we prevent debounced value from updating if value is changed ...
            // .. within the delay period. Timeout gets cleared and restarted.
            return () => {
                clearTimeout(handler);
            };
        },
        [value, delay] // Only re-call effect if value or delay changes
    );

    return debouncedValue;
}
