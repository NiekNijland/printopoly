import { act, renderHook } from '@testing-library/react';

import type { Edition } from '@/lib/render/edition-types';
import { makeEdition } from '@/testing/edition-test-utils';

import { usePrintSet } from './use-print-set';

describe('usePrintSet', () => {
    beforeEach(() => {
        window.localStorage.clear();
        window.history.replaceState(null, '', '/nl/print');
    });

    it('switches to the set the edition remembers once it has loaded (B199)', () => {
        const { result, rerender } = renderHook<
            ReturnType<typeof usePrintSet>,
            { checked: Edition | null }
        >(({ checked }) => usePrintSet('e1', checked), {
            initialProps: { checked: null },
        });
        expect(result.current.set).toBe('home');

        rerender({
            checked: {
                ...makeEdition({ id: 'e1' }),
                printSelection: { set: 'printer', parts: ['board'] },
            },
        });
        expect(result.current.set).toBe('printer');
        expect(result.current.rememberedSet).toBe('printer');
    });

    it('keeps the set the person picked, and remembers it in this browser', () => {
        const { result, rerender } = renderHook<
            ReturnType<typeof usePrintSet>,
            { checked: Edition | null }
        >(({ checked }) => usePrintSet('e1', checked), {
            initialProps: { checked: null },
        });

        act(() => {
            result.current.pick('printer');
        });
        rerender({
            checked: {
                ...makeEdition({ id: 'e1' }),
                printSelection: { set: 'home', parts: ['board'] },
            },
        });
        expect(result.current.set).toBe('printer');
        expect(
            renderHook(() => usePrintSet('e1', null)).result.current.set,
        ).toBe('printer');
    });

    it('lets the address win over what the edition remembers', () => {
        window.history.replaceState(null, '', '/nl/print?set=home');
        const { result } = renderHook(() =>
            usePrintSet('e1', {
                ...makeEdition({ id: 'e1' }),
                printSelection: { set: 'printer', parts: ['board'] },
            }),
        );

        expect(result.current.set).toBe('home');
    });
});
