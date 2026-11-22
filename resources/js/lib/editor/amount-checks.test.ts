import { describe, expect, it } from 'vitest';

import { runChecks } from '@/lib/checks/checks';
import { makeEdition } from '@/lib/edition/test-utils';
import { DEFAULT_PARTS, type Edition } from '@/lib/edition/types';

import { buildCheckInput } from './checks-input';

function issuesOf(elements: Edition['elements']) {
    const edition = {
        ...makeEdition({
            parts: { ...DEFAULT_PARTS, deeds: true, cards: true },
        }),
        elements,
    };

    return runChecks(buildCheckInput(edition, new Map(), new Map()));
}

describe('Controle for amounts (B132)', () => {
    it('finds nothing for amounts within 20%', () => {
        expect(
            issuesOf({
                'space.01': { amounts: { price: 72, mortgage: 24 } },
                'card.chest.03': { amount: -60 },
            }),
        ).toEqual([]);
    });

    it('marks an amount of a space outside 20% as an error, with the range', () => {
        const issues = issuesOf({ 'space.01': { amounts: { price: 90 } } });

        expect(issues).toHaveLength(1);
        expect(issues[0]).toMatchObject({
            code: 'amount.out-of-range',
            elementKey: 'space.01',
            field: 'amounts.price',
            severity: 'error',
            data: { value: 90, min: 48, max: 72 },
        });
        expect(issues[0]?.message.nl).toContain('tussen 48 en 72');
    });

    it('marks a card amount outside 20%, but not one in the other direction (R5-11)', () => {
        const issues = issuesOf({
            'card.chest.03': { amount: -80 },
            'card.chest.04': { amount: -50 },
        });

        expect(issues.map((issue) => [issue.elementKey, issue.field])).toEqual([
            ['card.chest.03', 'amount'],
        ]);
    });

    it('hints when an own story also names the amount of the line under it', () => {
        const issues = issuesOf({
            'card.chest.03': { text: 'Je tandarts kost je 50.' },
        });

        expect(issues).toHaveLength(1);
        expect(issues[0]).toMatchObject({
            code: 'text.amount-twice',
            severity: 'warning',
        });
    });

    it('does not hint when the amount is in the text as a variable, or the line is off', () => {
        expect(
            issuesOf({
                'card.chest.03': { text: 'Je tandarts kost je {amount}.' },
                'card.chest.04': {
                    text: 'Je verkoopt je fiets voor 50.',
                    amount: 0,
                },
            }),
        ).toEqual([]);
    });

    it('hints when the text says paying above a line that receives, without any number (bug 9)', () => {
        const issues = issuesOf({
            'card.chest.17': {
                added: true,
                text: 'Betaal een snoepje.',
                amount: 40,
            },
        });

        expect(issues).toHaveLength(1);
        expect(issues[0]).toMatchObject({
            code: 'text.amount-direction',
            elementKey: 'card.chest.17',
            severity: 'warning',
        });
        expect(issues[0]?.message.nl).toMatch(
            /^De tekst zegt betalen, maar onderaan de kaart staat "Ontvang €\s40": de speler krijgt geld\./u,
        );
    });

    it('hints when the text says both paying and receiving (bug 9)', () => {
        const issues = issuesOf({
            'card.chest.03': {
                text: 'Betaal je tandarts en ontvang een sticker.',
            },
        });

        expect(issues.map((issue) => issue.code)).toEqual([
            'text.amount-direction',
        ]);
    });

    it('says nothing when the words match the line, or the line is off', () => {
        expect(
            issuesOf({
                'card.chest.03': { text: 'Betaal de tandarts.' },
                'card.chest.17': {
                    added: true,
                    text: 'Ontvang een cadeautje.',
                    amount: 40,
                },
            }),
        ).toEqual([]);
        expect(
            issuesOf({
                'card.chest.03': { text: 'Ontvang een sticker.', amount: 0 },
            }),
        ).toEqual([]);
    });
});
