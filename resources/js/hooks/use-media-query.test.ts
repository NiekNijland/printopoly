import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { mediaQueryList } from '@/testing/media-query';
import { useWideScreen } from './use-media-query';

const screenOf = (width: number): void => {
    vi.stubGlobal('matchMedia', (query: string) =>
        mediaQueryList(
            query,
            /min-width: (\d+)px/.exec(query) !== null &&
                width >= Number(/min-width: (\d+)px/.exec(query)?.[1]),
        ),
    );
};

describe('useWideScreen', () => {
    // B155: the phone layout is below 768 px, the same as Tailwind `md`, so script and classes agree.
    it('is the Tailwind md breakpoint of the phone layout', () => {
        const asked: string[] = [];
        vi.stubGlobal('matchMedia', (query: string) => {
            asked.push(query);
            return mediaQueryList(query, false);
        });
        renderHook(() => useWideScreen());
        expect(asked).toContain('(min-width: 768px)');
    });

    it('calls a tablet wide and a phone not', () => {
        screenOf(768);
        expect(renderHook(() => useWideScreen()).result.current).toBe(true);

        screenOf(767);
        expect(renderHook(() => useWideScreen()).result.current).toBe(false);
    });
});
