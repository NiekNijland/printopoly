import { describe, expect, it } from 'vitest';
import { makeEdition } from '../../testing/edition-test-utils';
import { amountIntoText, cardTextProblems } from './edition-card-text-problems';
import { updateElement } from './edition-changes';

describe('cardTextProblems', () => {
    const edition = makeEdition({ language: 'nl' });
    const renamed = updateElement(edition, 'space.01', {
        name: 'Jalinkhof',
    }).edition;

    it('finds nothing in a clean text', () => {
        expect(
            cardTextProblems('Ga naar {space:1}.', renamed, undefined),
        ).toEqual([]);
    });

    it('reports unknown tokens once each', () => {
        expect(
            cardTextProblems('{foo} {foo} {bar}', edition, undefined),
        ).toEqual([
            { kind: 'unknown-token', token: '{foo}' },
            { kind: 'unknown-token', token: '{bar}' },
        ]);
    });

    it('reports {amount} on a card without an amount', () => {
        expect(cardTextProblems('Betaal {amount}', edition, undefined)).toEqual(
            [{ kind: 'amount-missing' }],
        );
        expect(cardTextProblems('Betaal {amount}', edition, -20)).toEqual([]);
        // Paying above an amount that is received is its own problem (bug 9, ronde 4).
        expect(cardTextProblems('Betaal {amount}', edition, 20)).toEqual([
            { kind: 'direction-differs', says: 'pay' },
        ]);
    });

    it.each([
        'An old friend pays back what he owes, with interest.',
        'You arrange the tickets and everyone pays you back.',
        'The paper puts your photo on the front page and pays you for it.',
        'Een oude vriend betaalt zijn schuld terug, met rente.',
        'Je regelt de tickets en iedereen betaalt je terug.',
        'De krant zet jouw foto op de voorpagina en betaalt je ervoor.',
        'Het meisje van de bakker betaalt je voor de taart.',
    ])(
        'counts someone else who pays the player as receiving: "%s" (R5-11)',
        (text) => {
            expect(cardTextProblems(text, edition, 100)).toEqual([]);
            expect(cardTextProblems(text, edition, -100)).toEqual([
                { kind: 'direction-differs', says: 'receive' },
            ]);
        },
    );

    it.each([
        'You pay back the loan.',
        'Je betaalt je huur.',
        'Jij betaalt de boete terug.',
        'Pay the school fees.',
    ])('still counts the player who pays as paying: "%s" (R5-11)', (text) => {
        expect(cardTextProblems(text, edition, -100)).toEqual([]);
        expect(cardTextProblems(text, edition, 100)).toEqual([
            { kind: 'direction-differs', says: 'pay' },
        ]);
    });

    it('hints at a frozen name of a renamed space', () => {
        expect(
            cardTextProblems('Ga naar Molenweg.', renamed, undefined),
        ).toEqual([{ kind: 'stale-name', was: 'Molenweg', now: 'Jalinkhof' }]);
    });

    it('does not hint when the space is not renamed, or the old name is in use by another space', () => {
        expect(
            cardTextProblems('Ga naar Molenweg.', edition, undefined),
        ).toEqual([]);

        const swapped = updateElement(renamed, 'space.03', {
            name: 'Molenweg',
        }).edition;

        expect(
            cardTextProblems('Ga naar Molenweg.', swapped, undefined),
        ).toEqual([]);
    });
});

describe('amountIntoText', () => {
    it('puts the amount token where the text names the amount', () => {
        expect(amountIntoText('Betaal 50 aan de bank.', -50)).toBe(
            'Betaal {amount} aan de bank.',
        );
        expect(amountIntoText('Collect 1,500 from the bank.', 1500)).toBe(
            'Collect {amount} from the bank.',
        );
    });

    it('only takes the first mention', () => {
        expect(amountIntoText('Betaal 50, of 50 later.', 50)).toBe(
            'Betaal {amount}, of 50 later.',
        );
    });

    it('leaves a bigger number and a token alone', () => {
        expect(amountIntoText('Betaal 150 bij {space:5}.', 5)).toBeNull();
        expect(amountIntoText('Ga naar {space:24}.', 24)).toBeNull();
    });
});
