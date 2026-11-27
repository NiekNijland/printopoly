import { act, renderHook } from '@testing-library/react';

import { friendAmountRule, useFriendAmount } from './friend-amount';

describe('friendAmountRule', () => {
    it('keeps a card amount within its range and direction', () => {
        expect(friendAmountRule('card.chance.12')).toEqual({
            min: 12,
            max: 18,
            sign: -1,
        });
        expect(friendAmountRule('card.chance.15')).toEqual({
            min: 120,
            max: 180,
            sign: 1,
        });
    });

    it('lets a new card pay or receive up to the free maximum, and a space has no amount', () => {
        expect(friendAmountRule('newcard.chest')).toMatchObject({
            min: 1,
            sign: null,
        });
        expect(friendAmountRule('space.02')).toBeNull();
        expect(friendAmountRule('card.chance.01')).toBeNull();
    });
});

describe('useFriendAmount', () => {
    it('signs a valid amount and drops one out of range', () => {
        const { result } = renderHook(() => useFriendAmount('card.chance.12'));

        expect(result.current).toMatchObject({
            amountValid: true,
            amount: null,
        });

        act(() => result.current.setAmountText('14'));
        expect(result.current).toMatchObject({
            amountValid: true,
            amount: -14,
        });

        act(() => result.current.setAmountText('99'));
        expect(result.current).toMatchObject({
            amountValid: false,
            amount: null,
        });

        act(() => result.current.setAmountText('14.5'));
        expect(result.current.amountValid).toBe(false);
    });

    it('takes the chosen direction for a new card, and refuses any amount without a rule', () => {
        const card = renderHook(() => useFriendAmount('newcard.chance'));

        act(() => card.result.current.setAmountText('20'));
        expect(card.result.current.amount).toBe(-20);
        act(() => card.result.current.setDirection(1));
        expect(card.result.current.amount).toBe(20);

        const space = renderHook(() => useFriendAmount('space.02'));
        act(() => space.result.current.setAmountText('5'));
        expect(space.result.current).toMatchObject({
            amountValid: false,
            amount: null,
        });
    });
});
