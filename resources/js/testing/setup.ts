import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
    cleanup();
    // What one test keeps in this browser (such as the last chosen currency) must not change the next one.
    try {
        window.localStorage.clear();
    } catch {
        // A test without a window.
    }
});
