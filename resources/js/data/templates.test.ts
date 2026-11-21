import { describe, expect, it } from 'vitest';

import { isCardAmountAllowed } from '@/lib/edition/amounts';
import { parseCardText } from '@/lib/edition/card-text';
import { updateElement } from '@/lib/edition/changes';
import { resolveEdition } from '@/lib/edition/resolve';
import { parseEdition } from '@/lib/edition/schema';
import { standardEdition } from '@/lib/game/standard-edition';
import type { Locale } from '@/lib/game/types';

import {
    TEMPLATE_IDS,
    spaceTokens,
    template,
    templateEdition,
    templates,
} from './templates';

const LOCALES: readonly Locale[] = ['nl', 'en'];

/**
 * Cards with money on them; the others say what happens in their text (moves, jail, repairs, per player). Only a
 * card with a standard amount can have one (B132).
 */
const CHANCE_AMOUNTS = [7, 12, 15];
const CHEST_AMOUNTS = [2, 3, 4, 7, 8, 10, 11, 12, 13, 15, 16];

const OWNABLE_POSITIONS = standardEdition.spaces
    .filter((space) => ['street', 'station', 'utility'].includes(space.type))
    .map((space) => String(space.position))
    .sort();

const STANDARD_TEXTS = new Set(
    [...standardEdition.decks.chance, ...standardEdition.decks.chest].flatMap(
        (card) => [card.text.nl, card.text.en, card.effect.nl, card.effect.en],
    ),
);

describe.each(LOCALES)('templates (%s)', (locale) => {
    it('has every template in display order', () => {
        expect(templates(locale).map((item) => item.id)).toEqual([
            ...TEMPLATE_IDS,
        ]);
    });

    describe.each(TEMPLATE_IDS)('%s', (id) => {
        const data = template(id, locale);
        const edition = templateEdition(id, locale);

        it('is a valid edition', () => {
            expect(data).toBeDefined();
            expect(edition).toBeDefined();

            const result = parseEdition(edition);
            expect(result.ok ? [] : result.errors).toEqual([]);
            expect(result.ok && result.value.parts.board).toBe(true);
            expect(() => resolveEdition(edition!)).not.toThrow();
        });

        it('names every street, station and utility once', () => {
            const positions = Object.keys(data?.spaces ?? {}).sort();
            const names = Object.values(data?.spaces ?? {});

            expect(positions).toEqual(OWNABLE_POSITIONS);
            expect(new Set(names).size).toBe(names.length);
            for (const name of names) {
                expect(name.trim()).toBe(name);
                expect(name.length).toBeGreaterThan(2);
                expect(name.length).toBeLessThanOrEqual(28);
            }
        });

        it('has 16 + 16 cards with the money where it belongs', () => {
            expect(data?.chance).toHaveLength(16);
            expect(data?.chest).toHaveLength(16);

            const amounts = (cards: { amount?: number }[] = []) =>
                cards.flatMap((card, index) =>
                    card.amount === undefined ? [] : [index + 1],
                );
            expect(amounts(data?.chance)).toEqual(CHANCE_AMOUNTS);
            expect(amounts(data?.chest)).toEqual(CHEST_AMOUNTS);
            for (const card of [
                ...(data?.chance ?? []),
                ...(data?.chest ?? []),
            ]) {
                expect(card.amount).not.toBe(0);
                expect(Number.isInteger(card.amount ?? 1)).toBe(true);
            }
            const outOfRange = (['chance', 'chest'] as const).flatMap((deck) =>
                (data?.[deck] ?? []).flatMap((card, index) => {
                    const standard = standardEdition.decks[deck][index];

                    return card.amount === undefined ||
                        standard === undefined ||
                        isCardAmountAllowed(standard, card.amount)
                        ? []
                        : [`${deck}.${String(index + 1)}`];
                }),
            );
            expect(outOfRange).toEqual([]);
        });

        it('writes its own card texts, short enough for a card', () => {
            const texts = [...(data?.chance ?? []), ...(data?.chest ?? [])].map(
                (card) => card.text,
            );

            expect(new Set(texts).size).toBe(texts.length);
            for (const text of texts) {
                expect(text.length).toBeGreaterThan(10);
                expect(text.length).toBeLessThanOrEqual(150);
                expect(STANDARD_TEXTS.has(text)).toBe(false);
            }
        });

        it('names spaces with tokens, Start included, so a card follows a rename', () => {
            const texts = Object.entries(edition?.elements ?? {})
                .filter(([key]) => key.startsWith('card.'))
                .map(([, override]) => override.text ?? '');

            for (const text of texts) {
                expect(text).not.toMatch(/\{\d+\}/);
                expect(text).not.toMatch(/\bStart\b/);
                expect(
                    parseCardText(text).filter(
                        (segment) => segment.type === 'unknown',
                    ),
                ).toEqual([]);
            }
            expect(edition?.elements['card.chance.02']?.text).toContain(
                '{space:24}',
            );
            expect(
                texts.filter((text) => text.includes('{space:0}')).length,
            ).toBeGreaterThan(0);
            expect(spaceTokens('naar {24} en {0}, niet {99}')).toBe(
                'naar {space:24} en {space:0}, niet {99}',
            );
        });

        it('shows the current names on the cards, also of a renamed Start', () => {
            if (edition === undefined) {
                throw new Error('no template edition');
            }
            const renamed = updateElement(edition, 'space.00', {
                name: 'Begin',
            }).edition;
            const resolved = resolveEdition(renamed);
            const texts = [
                ...(resolved.decks?.chance ?? []),
                ...(resolved.decks?.chest ?? []),
            ].map((card) => card.text);

            expect(texts.join(' ')).toContain(data?.spaces['24'] ?? '?');
            expect(texts.join(' ')).toContain('Begin');
            expect(texts.join(' ')).not.toMatch(/\bStart\b|\{/);
        });

        it('has three house rules and switches the house rules part on', () => {
            expect(data?.houseRules).toHaveLength(3);
            for (const rule of data?.houseRules ?? []) {
                expect(rule.length).toBeLessThanOrEqual(110);
            }
            expect(edition?.parts.houseRules).toBe(true);
            expect(edition?.elements.house_rules?.text?.split('\n')).toEqual(
                data?.houseRules,
            );
        });

        it('keeps to the writing rules and avoids protected text', () => {
            const all = JSON.stringify(data);

            expect(all).not.toMatch(/[—–]/);
            expect(all).not.toMatch(/hasbro|monopoly|boardwalk|mayfair/i);
            expect(all).not.toMatch(/\bnot [^.]*\bbut\b/i);
            expect(all).not.toMatch(/\bniet [^.]*\bmaar\b/i);
        });
    });
});

describe('the two languages of a template', () => {
    it.each(TEMPLATE_IDS)(
        '%s has the same shape in Dutch and English',
        (id) => {
            const nl = template(id, 'nl');
            const en = template(id, 'en');

            expect(en?.theme).toBe(nl?.theme);
            expect(en?.parts).toEqual(nl?.parts);
            expect(Object.keys(en?.spaces ?? {})).toEqual(
                Object.keys(nl?.spaces ?? {}),
            );
            expect(en?.chance.map((card) => card.amount)).toEqual(
                nl?.chance.map((card) => card.amount),
            );
            expect(en?.chest.map((card) => card.amount)).toEqual(
                nl?.chest.map((card) => card.amount),
            );
        },
    );

    it('uses euro in Dutch and play money in English', () => {
        expect(templateEdition('village', 'nl')?.currency).toBe('eur');
        expect(templateEdition('village', 'en')?.currency).toBe('play');
    });
});
