import { describe, expect, it } from 'vitest';

import { templateEdition } from '@/data/templates';
import { tabCounts } from '@/lib/editor/catalogue';
import { resetSection, sectionDiffers } from '@/lib/editor/edition-panel';

import {
    baselineElement,
    baselineOf,
    differsFromBaseline,
    fieldDiffers,
    inferTemplate,
    INFER_MIN_MATCHES,
    templateOf,
} from './baseline';
import { setElement, updateElement } from './changes';
import { parseEdition } from './schema';
import { makeEdition } from './test-utils';
import { DEFAULT_PARTS, type Edition } from './types';

function village(): Edition {
    const edition = templateEdition('village', 'nl');
    if (edition === undefined) {
        throw new Error('no template');
    }

    return { ...edition, id: 'v1' };
}

/** A template edition as it was stored before B152: without the template id. */
function legacy(edition: Edition): Edition {
    const { template: _template, ...rest } = edition;

    return rest;
}

describe('baseline (B152)', () => {
    it('is the standard game for an edition that started blank', () => {
        const edition = makeEdition();

        expect(templateOf(edition)).toBeNull();
        expect(baselineOf(edition).parts).toEqual(DEFAULT_PARTS);
        expect(baselineElement(edition, 'space.01')).toBeUndefined();
        expect(
            differsFromBaseline(
                updateElement(edition, 'space.01', { name: 'Dorpsstraat' })
                    .edition,
                'space.01',
            ),
        ).toBe(true);
    });

    it('is the template for an edition made from one', () => {
        const edition = village();

        expect(edition.template).toBe('village');
        expect(templateOf(edition)).toBe('village');
        expect(differsFromBaseline(edition, 'space.01')).toBe(false);
        expect(differsFromBaseline(edition, 'card.chance.01')).toBe(false);
        expect(differsFromBaseline(edition, 'house_rules')).toBe(false);
        expect(tabCounts('board', edition).customized).toBe(0);
        expect(tabCounts('cards', edition).customized).toBe(0);
    });

    it('sees a change to a template value, and a value that went back to the game', () => {
        const edition = village();
        const renamed = updateElement(edition, 'space.01', {
            name: 'Kerkpad',
        }).edition;
        const cleared = updateElement(edition, 'space.01', {
            name: undefined,
        }).edition;
        const priced = updateElement(edition, 'space.01', {
            amounts: { price: 62 },
        }).edition;

        expect(fieldDiffers(renamed, 'space.01', 'name')).toBe(true);
        expect(fieldDiffers(cleared, 'space.01', 'name')).toBe(true);
        expect(differsFromBaseline(cleared, 'space.01')).toBe(true);
        expect(fieldDiffers(priced, 'space.01', 'name')).toBe(false);
        expect(fieldDiffers(priced, 'space.01', 'amounts')).toBe(true);
        expect(tabCounts('board', renamed).customized).toBe(1);
    });

    it('follows the language of the edition, like the standard game', () => {
        const english = { ...village(), language: 'en' as const };

        expect(baselineElement(english, 'space.01')?.name).toBe(
            templateEdition('village', 'en')?.elements['space.01']?.name,
        );
    });

    it('keeps the template id through storage and drops one it does not know', () => {
        const parsed = parseEdition(village());
        const unknown = parseEdition({ ...village(), template: 'circus' });

        expect(parsed.ok && parsed.value.template).toBe('village');
        expect(unknown.ok).toBe(true);
        expect(unknown.ok && unknown.value.template).toBeUndefined();
    });

    describe('an edition from before B152', () => {
        it('finds the template it came from in its texts', () => {
            const edition = legacy(village());
            const english = legacy({
                ...templateEdition('wedding', 'en')!,
                id: 'w1',
            });

            expect(inferTemplate(edition)).toBe('village');
            expect(templateOf(english)).toBe('wedding');
            expect(differsFromBaseline(edition, 'card.chance.05')).toBe(false);
        });

        it('still finds it after a good part was rewritten', () => {
            let edition = legacy(village());
            const keys = Object.keys(edition.elements).filter((key) =>
                key.startsWith('card.'),
            );
            // All cards rewritten; the street names and the rules are still there.
            for (const key of keys) {
                edition = updateElement(edition, key, {
                    text: `Eigen tekst ${key}`,
                }).edition;
            }

            expect(templateOf(edition)).toBe('village');
        });

        it('does not guess for a blank edition or one with only a few template names', () => {
            const template = village();
            let edition = makeEdition();
            const names = Object.entries(template.elements)
                .filter(([key]) => key.startsWith('space.'))
                .slice(0, INFER_MIN_MATCHES - 1);
            for (const [key, override] of names) {
                edition = setElement(edition, key, override).edition;
            }

            expect(templateOf(makeEdition())).toBeNull();
            expect(templateOf(edition)).toBeNull();
        });
    });

    describe('the edition panel', () => {
        it('takes the parts of the template as the standard', () => {
            const edition = village();
            const fewer = {
                ...edition,
                parts: { ...edition.parts, houseRules: false },
            };

            expect(sectionDiffers(edition, 'parts')).toBe(false);
            expect(sectionDiffers(fewer, 'parts')).toBe(true);
            expect(resetSection(fewer, 'parts').edition.parts).toEqual(
                edition.parts,
            );
        });
    });
});
