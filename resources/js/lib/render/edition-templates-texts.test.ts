import { describe, expect, it } from 'vitest';
import { differsFromBaseline } from '@/lib/render/edition-baseline';
import { updateElement } from '@/lib/render/edition-changes';
import { resolveEdition } from '@/lib/render/edition-resolve';
import { parseEdition } from '@/lib/render/edition-schema';
import type { Locale } from '@/types/game';
import {
    TEMPLATE_IDS,
    spaceTokens,
    template,
    templateEdition,
} from './edition-templates';

const LOCALES: readonly Locale[] = ['nl', 'en'];

const RETIRED = [
    'company',
    'school',
    'club',
    'bachelor',
    'birthday',
    'kidsparty',
] as const;

describe.each(LOCALES)('templates (%s)', (locale) => {
    describe.each([...TEMPLATE_IDS, ...RETIRED])('%s', (id) => {
        const data = template(id, locale);
        const edition = templateEdition(id, locale);

        it('puts the currency sign before the money on its cards (bug 26)', () => {
            const texts = [...(data?.chance ?? []), ...(data?.chest ?? [])].map(
                (card) => card.text,
            );

            expect(texts.some((text) => text.includes('{currency}'))).toBe(
                true,
            );
            // Every number on a card is money, unless it counts times or years.
            for (const text of texts) {
                const bare = text
                    .replace(/\{currency\} ?\d+/g, '')
                    .replace(/\{[^}]*\}/g, '')
                    .replace(/\d+ (keer|times|years|jaar)/g, '');
                expect(bare).not.toMatch(/\d/);
            }
        });

        it('gives the cards of an older edition their currency sign, so nothing counts as changed (bug 26, B152)', () => {
            if (edition === undefined) {
                throw new Error('no template edition');
            }
            // The cards as an edition from before stored them: the money without the sign.
            const old = Object.fromEntries(
                Object.entries(edition.elements).map(([key, element]) => [
                    key,
                    key.startsWith('card.') && element.text !== undefined
                        ? {
                              ...element,
                              text: element.text
                                  .replaceAll('{currency} ', '')
                                  .replaceAll('{currency}', ''),
                          }
                        : element,
                ]),
            );
            const changedBefore = Object.keys(old).filter(
                (key) => old[key]?.text !== edition.elements[key]?.text,
            );
            expect(changedBefore.length).toBeGreaterThan(0);

            const stored = parseEdition({ ...edition, elements: old });
            if (!stored.ok) {
                throw new Error('not valid');
            }
            expect(stored.value.elements).toEqual(edition.elements);
            expect(
                Object.keys(stored.value.elements).filter((key) =>
                    differsFromBaseline(stored.value, key),
                ),
            ).toEqual([]);

            // A text of one's own, even one close to the template, stays as typed.
            const key = changedBefore[0] ?? '';
            const own = parseEdition({
                ...edition,
                elements: {
                    ...old,
                    [key]: { ...old[key], text: `${old[key]?.text ?? ''}!` },
                },
            });
            expect(own.ok && own.value.elements[key]?.text).toBe(
                `${old[key]?.text ?? ''}!`,
            );
        });

        it('names the station, houses, hotels and jail with a word token, so the cards follow the words (B177)', () => {
            if (edition === undefined) {
                throw new Error('no template edition');
            }
            const texts = [...(data?.chance ?? []), ...(data?.chest ?? [])].map(
                (card) => card.text,
            );
            for (const text of texts) {
                expect(text).not.toMatch(
                    /nearest station|dichtstbijzijnde station|per (house|huis|hotel)\b|de gevangenis|(?<!\{)\bjail\b/,
                );
            }
            expect(texts.join(' ')).toContain('{station}');
            expect(texts.join(' ')).toContain('{jail}');

            const worded = updateElement(
                updateElement(
                    updateElement(edition, 'words.station', {
                        name: 'Bushalte',
                    }).edition,
                    'words.jail',
                    { name: 'de strafbank' },
                ).edition,
                'words.house',
                { name: 'Hut' },
            ).edition;
            const shown = [
                ...(resolveEdition(worded).decks?.chance ?? []),
                ...(resolveEdition(worded).decks?.chest ?? []),
            ]
                .map((card) => card.text)
                .join(' ');
            expect(shown).toContain('Bushalte');
            expect(shown).toContain('de strafbank');
            expect(shown).toContain('Hut');
            expect(shown).not.toMatch(
                /\{|nearest station|dichtstbijzijnde station/,
            );
        });

        it('rewrites the old "het dichtstbijzijnde {station}" of an older edition, so it fits every word (round 4, bug 6)', () => {
            if (edition === undefined) {
                throw new Error('no template edition');
            }
            const old = Object.fromEntries(
                Object.entries(edition.elements).map(([key, element]) => [
                    key,
                    key.startsWith('card.') && element.text !== undefined
                        ? {
                              ...element,
                              text: element.text.replace(
                                  'Ga vooruit tot je bij een {station} komt.',
                                  'Ga naar het dichtstbijzijnde {station}.',
                              ),
                          }
                        : element,
                ]),
            );
            const stored = parseEdition({ ...edition, elements: old });
            if (!stored.ok) {
                throw new Error('not valid');
            }

            expect(stored.value.elements).toEqual(edition.elements);
            expect(JSON.stringify(stored.value.elements)).not.toContain(
                'dichtstbijzijnde',
            );
        });

        it('gives the cards of an older edition their word tokens, so nothing counts as changed (B177, B152)', () => {
            if (edition === undefined) {
                throw new Error('no template edition');
            }
            const words = {
                station: 'station',
                house: locale === 'nl' ? 'huis' : 'house',
                hotel: 'hotel',
                jail: locale === 'nl' ? 'de gevangenis' : 'jail',
            };
            const plain = (text: string, withMoney: boolean): string => {
                const filled = text
                    .replaceAll('{station}', words.station)
                    .replaceAll('{house}', words.house)
                    .replaceAll('{hotel}', words.hotel)
                    .replaceAll('{jail}', words.jail);

                return withMoney
                    ? filled
                    : filled
                          .replaceAll('{currency} ', '')
                          .replaceAll('{currency}', '');
            };
            for (const withMoney of [true, false]) {
                const old = Object.fromEntries(
                    Object.entries(edition.elements).map(([key, element]) => [
                        key,
                        key.startsWith('card.') && element.text !== undefined
                            ? {
                                  ...element,
                                  text: plain(element.text, withMoney),
                              }
                            : element,
                    ]),
                );
                const stored = parseEdition({ ...edition, elements: old });
                if (!stored.ok) {
                    throw new Error('not valid');
                }
                expect(stored.value.elements).toEqual(edition.elements);
                expect(
                    Object.keys(stored.value.elements).filter((key) =>
                        differsFromBaseline(stored.value, key),
                    ),
                ).toEqual([]);
            }
        });

        it('puts the currency before every amount in the house rules (round 4, bug 33)', () => {
            for (const rule of data?.houseRules ?? []) {
                const bare = rule
                    .replace(/\{currency\} ?\d+/g, '')
                    .replace(/\{[^}]*\}/g, '');
                expect(bare).not.toMatch(/\d/);
            }
        });

        it('puts no gendered article before a word token, so a renamed word still reads right (round 4)', () => {
            const texts = [...(data?.chance ?? []), ...(data?.chest ?? [])].map(
                (card) => card.text,
            );
            for (const text of [...texts, ...(data?.houseRules ?? [])]) {
                expect(text).not.toMatch(
                    /\b(de|het|De|Het)\s+\{(station|utility|house|hotel|stations|utilities|houses|hotels)\}/,
                );
            }
        });

        it('says who it is for and gives the box lid an example of its own (UX 8, bug 25)', () => {
            expect(data?.tagline).toMatch(/^(Voor|For) /);
            expect(data?.tagline.length).toBeLessThanOrEqual(70);
            expect(data?.lidExample?.trim()).toBeTruthy();
            // Only the family template is about Christmas (bug 25).
            expect(/kerst|christmas/i.test(data?.lidExample ?? '')).toBe(
                id === 'family',
            );
        });

        it('gives an edition from before a text change the text of now, so nothing counts as changed (B193)', () => {
            if (edition === undefined || data === undefined) {
                throw new Error('no template edition');
            }
            const old = { ...edition.elements };
            (['chance', 'chest'] as const).forEach((deck) => {
                data[deck].forEach((card, index) => {
                    const key = `card.${deck}.${String(index + 1).padStart(2, '0')}`;
                    const was = card.was?.[0];
                    if (was !== undefined) {
                        old[key] = { ...old[key], text: spaceTokens(was) };
                    }
                });
            });
            const rules = data.houseRulesWas?.[0];
            if (rules !== undefined) {
                old.house_rules = { text: spaceTokens(rules.join('\n')) };
            }
            // An earlier space name too, such as "De proefproeverij" (R5-17).
            for (const [position, names] of Object.entries(
                data.spacesWas ?? {},
            )) {
                const key = `space.${position.padStart(2, '0')}`;
                old[key] = { ...old[key], name: names[0] };
            }
            const stored = parseEdition({ ...edition, elements: old });
            if (!stored.ok) {
                throw new Error('not valid');
            }

            expect(stored.value.elements).toEqual(edition.elements);
            expect(stored.value.template).toBe(id);
            expect(
                Object.keys(stored.value.elements).filter((key) =>
                    differsFromBaseline(stored.value, key),
                ),
            ).toEqual([]);
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
