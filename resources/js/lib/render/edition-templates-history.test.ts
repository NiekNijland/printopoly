import { describe, expect, it } from 'vitest';
import { differsFromBaseline } from '@/lib/render/edition-baseline';
import { resolveEdition } from '@/lib/render/edition-resolve';
import { parseEdition } from '@/lib/render/edition-schema';
import { TEMPLATE_IDS } from '@/lib/render/edition-template-ids';
import { defined } from '@/testing/defined';
import { HIDDEN_TEMPLATE_IDS } from '@/testing/templates';
import type { Locale } from '@/types/game';
import { templateEdition } from './edition-templates';

const LOCALES: readonly Locale[] = ['nl', 'en'];

describe('editions from a template before it was rewritten (B193)', () => {
    it.each([
        ['club', 'club1'],
        ['birthday', 'birthday1'],
    ] as const)(
        'keeps the earlier %s as the baseline of an untouched old edition, so nothing changes or counts as changed',
        (id, earlier) => {
            for (const locale of LOCALES) {
                const old = defined(templateEdition(earlier, locale));
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
        const old = defined(templateEdition('club1', 'nl'));
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
        const old = defined(templateEdition('club1', 'nl'));
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
                const edition = defined(templateEdition(id, locale));
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
                const edition = defined(templateEdition(id, locale));
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
            const { template: _, ...withoutTemplate } = defined(
                templateEdition(id, 'nl'),
            );
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
