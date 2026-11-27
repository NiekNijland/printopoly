import { act, renderHook } from '@testing-library/react';

import { useAskedPart } from './use-asked-part';

describe('useAskedPart', () => {
    afterEach(() => {
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    it('brings the asked row into view once loaded, then lets it go (R6 Kees)', () => {
        vi.useFakeTimers();
        window.history.replaceState(null, '', '/nl/print?part=money');
        const row = document.createElement('li');
        row.id = 'part-money';
        document.body.append(row);
        const scrolled = vi.fn();
        row.scrollIntoView = scrolled;

        const { result, rerender } = renderHook(
            ({ loaded }) => useAskedPart(loaded),
            { initialProps: { loaded: false } },
        );
        expect(result.current).toBe('money');
        expect(window.location.search).toBe('');
        expect(scrolled).not.toHaveBeenCalled();

        rerender({ loaded: true });
        expect(scrolled).toHaveBeenCalledWith({ block: 'center' });

        act(() => {
            vi.advanceTimersByTime(4000);
        });
        expect(result.current).toBeNull();
    });

    it('asks for nothing without a part in the address', () => {
        window.history.replaceState(null, '', '/nl/print?set=home');

        expect(renderHook(() => useAskedPart(true)).result.current).toBeNull();
    });
});
