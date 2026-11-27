import { act, renderHook } from '@testing-library/react';

import { useAmountDraft } from './use-amount-draft';

const draft = (value = 60) => {
    const onChange = vi.fn<(amount: number) => void>();
    const hook = renderHook(() =>
        useAmountDraft({ value, min: 48, max: 72, onChange }),
    );

    return { ...hook, onChange };
};

describe('useAmountDraft', () => {
    it('shows the amount and applies a typed amount inside the limits at once', () => {
        const { result, onChange } = draft();

        expect(result.current.shown).toBe('60');

        act(() => result.current.type('65'));

        expect(result.current).toMatchObject({ shown: '65', invalid: false });
        expect(onChange).toHaveBeenCalledWith(65);
    });

    it('keeps an amount outside the limits as a draft and sets the nearest limit on commit', () => {
        const { result, onChange } = draft();

        act(() => result.current.type('90'));

        expect(result.current.invalid).toBe(true);
        expect(onChange).not.toHaveBeenCalled();

        act(() => result.current.commit());

        expect(onChange).toHaveBeenCalledWith(72);
        expect(result.current.clamped).toEqual({ limit: 'max', value: 72 });
        expect(result.current.shown).toBe('60');

        act(() => result.current.type('1'));

        expect(result.current.clamped).toBeNull();

        act(() => result.current.commit());

        expect(result.current.clamped).toEqual({ limit: 'min', value: 48 });
    });

    it('rounds a fraction inside the limits without a note, and leaves empty text alone', () => {
        const { result, onChange } = draft();

        act(() => result.current.type('60.4'));
        act(() => result.current.commit());

        expect(result.current.clamped).toBeNull();
        expect(onChange).not.toHaveBeenCalled();

        act(() => result.current.type(' '));
        act(() => result.current.commit());

        expect(onChange).not.toHaveBeenCalled();

        act(() => result.current.type('61.4'));
        act(() => result.current.commit());

        expect(onChange).toHaveBeenCalledWith(61);
    });

    it('steps within the limits and goes back to the standard', () => {
        const { result, onChange } = draft(72);

        act(() => result.current.step(1));

        expect(onChange).toHaveBeenLastCalledWith(72);

        act(() => result.current.step(-1));

        expect(onChange).toHaveBeenLastCalledWith(71);

        act(() => result.current.type('90'));
        act(() => result.current.reset(60));

        expect(onChange).toHaveBeenLastCalledWith(60);
        expect(result.current).toMatchObject({
            shown: '72',
            invalid: false,
            clamped: null,
        });
    });
});
