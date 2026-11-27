import { describe, expect, it } from 'vitest';
import { checkCardText } from './checks-card-text';

const amount = { value: -50, min: 40, max: 60, shown: '€ 50' };

describe('checkCardText', () => {
    it('finds nothing in a clean text', () => {
        expect(checkCardText('card.chance.01', [], amount)).toEqual([]);
    });

    it('lists the unknown variables in one issue', () => {
        const [only, ...rest] = checkCardText('card.chance.01', [
            { kind: 'unknown-token', token: '{foo}' },
            { kind: 'unknown-token', token: '{bar}' },
            { kind: 'unknown-token', token: '{baz}' },
        ]);

        expect(rest).toEqual([]);
        expect(only?.code).toBe('text.unknown-token');
        expect(only?.message.en).toMatch(
            /^\{foo\}, \{bar\} and \{baz\} are not variables/,
        );
        expect(only?.message.nl).toMatch(/^\{foo\}, \{bar\} en \{baz\} zijn/);
    });

    it('gives one issue per kind, in a fixed order', () => {
        const codes = checkCardText(
            'card.chest.02',
            [
                { kind: 'stale-name', was: 'Dorpsstraat', now: 'Kerkstraat' },
                { kind: 'direction-both' },
                { kind: 'amount-differs', mentioned: 55 },
                { kind: 'amount-twice', amount: 50 },
                { kind: 'amount-missing' },
                { kind: 'unknown-token', token: '{x}' },
            ],
            amount,
        ).map((item) => item.code);

        expect(codes).toEqual([
            'text.unknown-token',
            'text.amount-missing',
            'text.amount-twice',
            'text.amount-differs',
            'text.amount-direction',
            'text.stale-name',
        ]);
    });

    it('says whether a differing amount is allowed, signed like the card', () => {
        const [inRange] = checkCardText(
            'card.chance.01',
            [{ kind: 'amount-differs', mentioned: 55 }],
            amount,
        );
        const [outOfRange] = checkCardText(
            'card.chance.01',
            [{ kind: 'amount-differs', mentioned: 90 }],
            amount,
        );

        expect(inRange?.data).toEqual({ mentioned: -55, allowed: true });
        expect(inRange?.message.en).toContain('Set the amount to 55');
        expect(outOfRange?.data).toEqual({ mentioned: -90, allowed: false });
        expect(outOfRange?.message.en).toContain('can be 40 to 60');
    });

    it('needs the amount of the card for the amount and direction checks', () => {
        expect(
            checkCardText('card.chance.01', [
                { kind: 'amount-differs', mentioned: 55 },
                { kind: 'direction-differs', says: 'pay' },
            ]),
        ).toEqual([]);
    });

    it('names the line at the bottom of the card when the direction differs', () => {
        const [paid] = checkCardText(
            'card.chance.01',
            [{ kind: 'direction-differs', says: 'receive' }],
            amount,
        );
        const [received] = checkCardText(
            'card.chance.01',
            [{ kind: 'direction-differs', says: 'pay' }],
            { ...amount, value: 50 },
        );

        expect(paid?.message.nl).toContain('"Betaal € 50": de speler betaalt');
        expect(paid?.data).toEqual({ says: 'receive' });
        expect(received?.message.en).toContain(
            '"Collect € 50": the player gets money',
        );
    });

    it('names each old name with the new one', () => {
        const [stale] = checkCardText('card.chance.01', [
            { kind: 'stale-name', was: 'A', now: 'B' },
            { kind: 'stale-name', was: 'C', now: 'D' },
        ]);

        expect(stale?.message.en).toBe(
            'This text mentions A (that space is now called B) and C (that space is now called D). Replace the name with a variable using Insert and it stays in sync.',
        );
    });
});
