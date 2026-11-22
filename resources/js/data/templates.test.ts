import { describe, expect, it } from 'vitest';

import { isCardAmountAllowed } from '@/lib/edition/amounts';
import { differsFromBaseline } from '@/lib/edition/baseline';
import { parseCardText } from '@/lib/edition/card-text';
import { updateElement } from '@/lib/edition/changes';
import { resolveEdition } from '@/lib/edition/resolve';
import { parseEdition } from '@/lib/edition/schema';
import { HIDDEN_TEMPLATE_IDS, isOfferedTemplate } from '@/lib/edition/types';
import { standardEdition } from '@/lib/game/standard-edition';
import type { Locale } from '@/lib/game/types';

import {
    TEMPLATE_IDS,
    lidExample,
    spaceTokens,
    template,
    templateEdition,
    templateInvitation,
    templates,
    type TemplateId,
} from './templates';

const LOCALES: readonly Locale[] = ['nl', 'en'];

/** The templates that were on offer until round 5 and are hidden now (B201); their content is still checked in full. */
const RETIRED = [
    'company',
    'school',
    'club',
    'bachelor',
    'birthday',
    'kidsparty',
] as const;

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

    describe.each([...TEMPLATE_IDS, ...RETIRED])('%s', (id) => {
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
                data?.houseRules.map(spaceTokens),
            );
        });

        it('names Start in the house rules with a token, so a rule follows a renamed Start', () => {
            if (edition === undefined) {
                throw new Error('no template edition');
            }
            const rules = edition.elements.house_rules?.text ?? '';
            const renamed = updateElement(edition, 'space.00', {
                name: 'Begin',
            }).edition;

            expect(rules).not.toMatch(/\bStart\b|\{\d+\}/);
            expect(resolveEdition(edition).houseRules?.text).not.toMatch(/\{/);
            const shown = resolveEdition(renamed).houseRules?.text ?? '';
            expect(shown.includes('Begin')).toBe(rules.includes('{space:0}'));
            expect(shown).not.toMatch(/\bStart\b/);
        });

        it('gives the house rules of an older edition their tokens', () => {
            if (edition === undefined) {
                throw new Error('no template edition');
            }
            const rules = edition.elements.house_rules?.text ?? '';
            const old = rules.replace(/\{space:0\}/g, 'Start');
            const stored = parseEdition({
                ...edition,
                elements: { ...edition.elements, house_rules: { text: old } },
            });
            const own = parseEdition({
                ...edition,
                elements: {
                    ...edition.elements,
                    house_rules: { text: `${old}\nEigen regel` },
                },
            });

            expect(stored.ok && stored.value.elements.house_rules?.text).toBe(
                rules,
            );
            expect(own.ok && own.value.elements.house_rules?.text).toBe(
                `${old}\nEigen regel`,
            );
        });

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

describe('the two languages of a template', () => {
    it.each([...TEMPLATE_IDS, ...HIDDEN_TEMPLATE_IDS])(
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

    it('uses euro in Dutch and pounds in English (B154)', () => {
        expect(templateEdition('village', 'nl')?.currency).toBe('eur');
        expect(templateEdition('village', 'en')?.currency).toBe('gbp');
    });
});

/** Every text of a template in one string: names, cards, house rules. */
function allText(id: TemplateId, locale: Locale): string {
    const data = template(id, locale);

    return [
        ...Object.values(data?.spaces ?? {}),
        ...(data?.chance ?? []).map((card) => card.text),
        ...(data?.chest ?? []).map((card) => card.text),
        ...(data?.houseRules ?? []),
        data?.name ?? '',
    ].join(' | ');
}

describe('templates that fit the group (B186)', () => {
    it.each(LOCALES)(
        'makes "Club of vereniging" fit a choir, scouting or church as well as a sports club (%s)',
        (locale) => {
            expect(allText('club', locale)).not.toMatch(
                /voetbal|wedstrijd|veld|tribune|scheidsrechter|supporter|bestuur|clubhuis|kantine|bond|sponsor|kleedkamer|training|football|match|pitch|stand\b|referee|supporters|committee|clubhouse|canteen|league|sponsor|changing room/i,
            );
        },
    );

    it.each(LOCALES)(
        'keeps Kinderfeest playful and safe for children (%s)',
        (locale) => {
            expect(allText('kidsparty', locale)).not.toMatch(
                /bier|wijn|champagne|borrel|kroeg|rondje|alcohol|beer|wine|pub\b|drinks|a round|bar\b|kater|hangover|boete|fine\b|politie|police|agent/i,
            );
            expect(allText('birthday', locale)).not.toMatch(
                /zijwieltjes|stabilisers|schoolbus|school bus|snoepgeld|sweet money/i,
            );
        },
    );

    it.each(['party', 'wedding', 'birthday', 'kidsparty'] as const)(
        'switches the invitation on for %s, with a kicker of its own',
        (id) => {
            for (const locale of LOCALES) {
                const edition = templateEdition(id, locale)!;
                const invitation = resolveEdition(edition).invitation;

                expect(edition.parts.invitation).toBe(true);
                expect(invitation?.subtitle).toBe(
                    template(id, locale)?.invitation?.kicker,
                );
                expect(invitation?.subtitle).not.toMatch(
                    /Spelavond|Game night/,
                );
            }
        },
    );

    it('lets the owner write over the kicker and headline of the template, or hide the kicker', () => {
        const edition = templateEdition('kidsparty', 'nl')!;
        const own = updateElement(edition, 'invitation', {
            subtitle: 'Lotte 8',
            name: 'Feest!',
        }).edition;
        const hidden = updateElement(edition, 'invitation', {
            subtitle: '',
        }).edition;

        expect(resolveEdition(edition).invitation).toMatchObject({
            subtitle: 'Kinderfeestje',
            name: 'Kom je op mijn feestje?',
        });
        expect(resolveEdition(own).invitation).toMatchObject({
            subtitle: 'Lotte 8',
            name: 'Feest!',
        });
        expect(resolveEdition(hidden).invitation?.subtitle).toBe('');
        expect(templateInvitation(null, 'nl')).toEqual({});
    });

    it('offers the six templates after Leeg and never the hidden ones (B201)', () => {
        expect(templates('nl').map((item) => item.label)).toEqual([
            'Dorp of wijk',
            'Familie',
            'Vrienden',
            'Feest',
            'Bruiloft',
            'Groep',
        ]);
        expect(templates('en').map((item) => item.label)).toEqual([
            'Village or neighbourhood',
            'Family',
            'Friends',
            'Party',
            'Wedding',
            'Group',
        ]);
        for (const id of HIDDEN_TEMPLATE_IDS) {
            expect(isOfferedTemplate(id)).toBe(false);
            for (const locale of LOCALES) {
                expect(template(id, locale)?.label).toBeTruthy();
            }
        }
        expect(template('club1', 'nl')?.label).toBe('Club of vereniging');
    });

    it.each(LOCALES)(
        'says in Vrienden that it fits a student house too (%s)',
        (locale) => {
            expect(template('friends', locale)?.tagline).toMatch(
                /studentenhuis|student house/,
            );
        },
    );

    it.each(LOCALES)(
        'keeps Feest playful for children and fine for adults (%s)',
        (locale) => {
            expect(allText('party', locale)).not.toMatch(
                /bier|wijn|champagne|borrel|kroeg|rondje|alcohol|beer|wine|pub\b|drinks|a round|bar\b|kater|hangover|boete|fine\b|politie|police|zijwieltjes|stabilisers|schoolbus|school bus|kleuter|toddler/i,
            );
            expect(template('party', locale)?.tagline).toMatch(
                /verjaardag|birthday/i,
            );
            expect(template('party', locale)?.tagline).toMatch(
                /kinderfeest|kids' party/i,
            );
        },
    );

    it.each(LOCALES)(
        'keeps Groep neutral, so a club, a school, a company and a team all fit (%s)',
        (locale) => {
            expect(allText('group', locale)).not.toMatch(
                /voetbal|wedstrijd|scheidsrechter|kantine|training|klas\b|lokaal|leraar|juf\b|meester|baas|manager|salaris|bonus|kerk|koor|football|match|referee|canteen|classroom|teacher|boss|salary|church|choir/i,
            );
        },
    );

    it('gives the box lid an example that follows the template, not Christmas for everyone (bug 25)', () => {
        expect(lidExample('wedding', 'nl')).toContain('Eva en Tim');
        expect(lidExample('club', 'en')).not.toMatch(/christmas/i);
        expect(lidExample(null, 'nl')).toBeUndefined();
        expect(lidExample('club1', 'nl')).toBeUndefined();
    });
});

describe('editions from a template before it was rewritten (B193)', () => {
    it.each([
        ['club', 'club1'],
        ['birthday', 'birthday1'],
    ] as const)(
        'keeps the earlier %s as the baseline of an untouched old edition, so nothing changes or counts as changed',
        (id, earlier) => {
            for (const locale of LOCALES) {
                const old = templateEdition(earlier, locale)!;
                const stored = parseEdition({ ...old, template: id });
                if (!stored.ok) {
                    throw new Error('not valid');
                }

                expect(stored.value.template).toBe(earlier);
                expect(stored.value.elements).toEqual(old.elements);
                expect(
                    Object.keys(stored.value.elements).filter((key) =>
                        differsFromBaseline(stored.value, key),
                    ),
                ).toEqual([]);
            }
        },
    );

    it('also keeps it for an old edition with the money still without a sign, and for one without a template', () => {
        const old = templateEdition('club1', 'nl')!;
        const plain = Object.fromEntries(
            Object.entries(old.elements).map(([key, element]) => [
                key,
                element.text === undefined
                    ? element
                    : {
                          ...element,
                          text: element.text.replaceAll('{currency} ', ''),
                      },
            ]),
        );
        const stored = parseEdition({
            ...old,
            template: 'club',
            elements: plain,
        });
        const { template: _, ...withoutTemplate } = old;
        const inferred = parseEdition(withoutTemplate);
        if (!stored.ok || !inferred.ok) {
            throw new Error('not valid');
        }

        expect(stored.value.template).toBe('club1');
        expect(stored.value.elements).toEqual(old.elements);
        expect(
            Object.keys(inferred.value.elements).filter((key) =>
                differsFromBaseline(inferred.value, key),
            ),
        ).toEqual([]);
    });

    it('leaves a new club edition, and an old one that was mostly rewritten, on the template of now', () => {
        const fresh = parseEdition(templateEdition('club', 'nl'));
        const old = templateEdition('club1', 'nl')!;
        const rewritten = Object.fromEntries(
            Object.entries(old.elements).map(([key, element], index) => [
                key,
                index < 60 && element.name !== undefined
                    ? { ...element, name: `Eigen ${String(index)}` }
                    : index < 60 && element.text !== undefined
                      ? { ...element, text: `Eigen tekst ${String(index)}` }
                      : element,
            ]),
        );
        const mine = parseEdition({
            ...old,
            template: 'club',
            elements: rewritten,
        });

        expect(fresh.ok && fresh.value.template).toBe('club');
        expect(mine.ok && mine.value.template).toBe('club');
    });

    it('never rewrites a text that a template has now', () => {
        for (const id of [...TEMPLATE_IDS, ...HIDDEN_TEMPLATE_IDS]) {
            for (const locale of LOCALES) {
                const edition = templateEdition(id, locale)!;
                const stored = parseEdition(edition);
                expect(stored.ok && stored.value.elements).toEqual(
                    edition.elements,
                );
            }
        }
    });
});

describe('an amount in a house rule (round 4, bug 33)', () => {
    it('names the currency of the edition, also in an older village edition', () => {
        const edition = templateEdition('village', 'nl');
        if (edition === undefined) {
            throw new Error('no template edition');
        }
        const rules = edition.elements.house_rules?.text ?? '';

        expect(resolveEdition(edition).houseRules?.text).toMatch(
            /dan krijg je €\s10\./,
        );

        // Stored before the fix: "dan krijg je 10", without the currency.
        const old = rules.replace('{currency} 10', '10');
        const stored = parseEdition({
            ...edition,
            elements: { ...edition.elements, house_rules: { text: old } },
        });
        expect(old).not.toBe(rules);
        expect(stored.ok && stored.value.elements.house_rules?.text).toBe(
            rules,
        );
    });
});

describe('editions from a template that is hidden now (B201, B152)', () => {
    it.each(HIDDEN_TEMPLATE_IDS)(
        'keeps %s as the baseline of an untouched edition, so it counts no change in either language',
        (id) => {
            for (const locale of LOCALES) {
                const edition = templateEdition(id, locale)!;
                const stored = parseEdition(edition);
                if (!stored.ok) {
                    throw new Error('not valid');
                }

                expect(stored.value.template).toBe(id);
                expect(stored.value.elements).toEqual(edition.elements);
                expect(() => resolveEdition(stored.value)).not.toThrow();
                expect(
                    Object.keys(stored.value.elements).filter((key) =>
                        differsFromBaseline(stored.value, key),
                    ),
                ).toEqual([]);
            }
        },
    );

    it.each(HIDDEN_TEMPLATE_IDS)(
        'still finds %s for an old edition without a template field',
        (id) => {
            const { template: _, ...withoutTemplate } = templateEdition(
                id,
                'nl',
            )!;
            const stored = parseEdition(withoutTemplate);
            if (!stored.ok) {
                throw new Error('not valid');
            }

            expect(
                Object.keys(stored.value.elements).filter((key) =>
                    differsFromBaseline(stored.value, key),
                ),
            ).toEqual([]);
        },
    );
});
