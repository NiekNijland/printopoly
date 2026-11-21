import { describe, expect, it } from 'vitest';

import { runChecks } from '@/lib/checks/checks';
import { buildCheckInput } from '@/lib/editor/checks-input';
import { standardEdition } from '@/lib/game/standard-edition';
import { parseCardText } from './card-text';
import { updateElement } from './changes';
import { resolveEdition } from './resolve';
import { makeEdition } from './test-utils';

const chanceWith = (position: number) =>
    standardEdition.decks.chance.findIndex((card) =>
        card.text.nl.includes(`{space:${String(position)}}`),
    );

describe('standard card texts (B131)', () => {
    it('name spaces with tokens only, in both languages', () => {
        for (const card of [
            ...standardEdition.decks.chance,
            ...standardEdition.decks.chest,
        ]) {
            for (const language of ['nl', 'en'] as const) {
                const segments = parseCardText(card.text[language]);

                // `{house}`, `{hotel}` and `{jail}` are words of the edition (B126), filled in before the tokens.
                expect(
                    segments.filter(
                        (segment) =>
                            segment.type === 'unknown' &&
                            !/^\{(house|hotel|houses|hotels|jail)\}$/.test(
                                segment.raw,
                            ),
                    ),
                ).toEqual([]);
                for (const space of standardEdition.spaces) {
                    expect(
                        segments
                            .filter((segment) => segment.type === 'text')
                            .some((segment) =>
                                segment.text.includes(space.name[language]),
                            ),
                    ).toBe(false);
                }
            }
        }
    });
});

describe('card texts that name a space (B131)', () => {
    it('keep the standard text identical when nothing is renamed', () => {
        const resolved = resolveEdition(makeEdition({ language: 'nl' }));
        const card = resolved.decks?.chance[chanceWith(39)];

        expect(card?.text).toBe(
            'Ga naar Kroonplein, het duurste vak van het bord.',
        );
        expect(card?.originalText).toBe(card?.text);
        expect(card?.template).toContain('{space:39}');
    });

    it('keep the sign of the currency out of the tokens', () => {
        const resolved = resolveEdition(makeEdition({ language: 'nl' }));

        expect(resolved.decks?.chance[0]?.template).toContain(
            '{space:0}. Je krijgt €\u00A0200',
        );
        expect(resolved.decks?.chance[0]?.text).toBe(
            'Draai om en loop recht naar Start. Je krijgt €\u00A0200 van de bank.',
        );
    });

    it('use the renamed name of the space, also for Start', () => {
        let { edition } = updateElement(
            makeEdition({ language: 'nl' }),
            'space.39',
            { name: 'Raalterwetering' },
        );
        edition = updateElement(edition, 'space.00', { name: 'Begin' }).edition;
        const resolved = resolveEdition(edition);
        const text = resolved.decks?.chance[chanceWith(39)]?.text;

        expect(text).toBe(
            'Ga naar Raalterwetering, het duurste vak van het bord.',
        );
        expect(resolved.decks?.chance[0]?.text).toContain('naar Begin.');
        // The reference text and the effect follow the names too.
        expect(resolved.decks?.chance[chanceWith(39)]?.originalText).toContain(
            'Raalterwetering',
        );
        expect(resolved.decks?.chance[chanceWith(39)]?.effect).toContain(
            '(Raalterwetering)',
        );
    });

    it('resolve the tokens of an edited text, and follow a swap', () => {
        let { edition } = updateElement(
            makeEdition({ language: 'nl' }),
            'card.chance.07',
            {
                text: 'Ga van {space:24} naar {space:39} voor {amount}.',
                amount: 45,
            },
        );
        edition = updateElement(edition, 'space.24', {
            name: 'Kroonplein',
        }).edition;
        edition = updateElement(edition, 'space.39', {
            name: 'Raadhuisplein',
        }).edition;

        expect(resolveEdition(edition).decks?.chance[6]?.text).toBe(
            'Ga van Kroonplein naar Raadhuisplein voor 45.',
        );
    });

    it('keep a frozen plain name as plain text, and hint about it in the Controle', () => {
        let { edition } = updateElement(
            makeEdition({ language: 'nl' }),
            'card.chance.01',
            { text: 'Ga naar Molenweg.' },
        );
        edition = updateElement(edition, 'space.01', {
            name: 'Jalinkhof',
        }).edition;

        expect(resolveEdition(edition).decks?.chance[0]?.text).toBe(
            'Ga naar Molenweg.',
        );

        const issues = runChecks(
            buildCheckInput(edition, new Map(), new Map()),
        );

        expect(issues.map((issue) => issue.code)).toContain('text.stale-name');
        expect(
            issues.find((issue) => issue.code === 'text.stale-name')?.message
                .nl,
        ).toContain('Deze tekst noemt Molenweg (dat vak heet nu Jalinkhof)');
    });

    it('show unknown tokens as typed and warn in the Controle', () => {
        const { edition } = updateElement(
            makeEdition({ language: 'nl' }),
            'card.chance.01',
            { text: 'Hallo {foo} en {amount}.' },
        );

        expect(resolveEdition(edition).decks?.chance[0]?.text).toBe(
            'Hallo {foo} en {amount}.',
        );

        const codes = runChecks(
            buildCheckInput(edition, new Map(), new Map()),
        ).map((issue) => issue.code);

        expect(codes).toContain('text.unknown-token');
        expect(codes).toContain('text.amount-missing');
    });
});

describe('card texts with renamed spaces and the words of an edition (B126, B131)', () => {
    const edition = () => {
        let result = makeEdition({ language: 'nl' });

        result = updateElement(result, 'space.24', {
            name: 'Jalinkhof',
        }).edition;
        result = updateElement(result, 'words.currency', {
            name: 'Raalter pegels',
            text: 'RP',
        }).edition;
        result = updateElement(result, 'words.jail', {
            name: 'de Strafbank',
        }).edition;

        return result;
    };

    it('fills the renamed space, the custom currency sign and the custom jail into standard cards', () => {
        const resolved = resolveEdition(edition());
        const card = resolved.decks?.chance[chanceWith(24)];

        expect(card?.text).toContain('Jalinkhof');
        expect(card?.text).not.toContain('{');
        // The standard text of that card pays 200 at the start: the sign of the edition goes before it.
        expect(card?.text).toContain('RP\u00A0200');
        expect(card?.text).not.toContain('€');
        // The original text follows the names of the edition but keeps the standard words and sign.
        expect(card?.originalText).toContain('Jalinkhof');
        expect(card?.originalText).toContain('€\u00A0200');
        expect(
            resolved.decks?.chance.some((candidate) =>
                candidate.text.includes('Ga meteen naar de Strafbank'),
            ),
        ).toBe(true);
    });

    it('lets {currency} and {amount} of a card of your own use the custom currency sign', () => {
        const { edition: changed } = updateElement(
            edition(),
            'card.chance.07',
            {
                text: 'Ga naar {space:24} en pak {currency}{amount}.',
                amount: 55,
            },
        );
        const card = resolveEdition(changed).decks?.chance[6];

        expect(card?.text).toBe('Ga naar Jalinkhof en pak RP55.');
        // The amount is in the text, so there is no amount line under it.
        expect(card?.lineAmount).toBeUndefined();
        expect(card?.template).toBe(
            'Ga naar {space:24} en pak {currency}{amount}.',
        );
    });
});
