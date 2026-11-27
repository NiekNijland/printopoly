import { describe, expect, it } from 'vitest';

import type { Edition } from '@/lib/render/edition-types';
import { defaultCurrency } from '@/lib/render/game-currency';
import { makeEdition as baseEdition } from '@/testing/edition-test-utils';

import {
    chooseCurrency,
    contributionElement,
    currencyChoice,
    firstContributionElement,
    resetSection,
    sectionDiffers,
    sectionOfKey,
} from './editor-edition-panel';

/** An edition with overrides of any field, elements and parts included. */
const makeEdition = (overrides: Partial<Edition> = {}): Edition => {
    return { ...baseEdition(), ...overrides };
};

describe('edition panel sections (B145)', () => {
    it('files the words, the currency and the colours under their section', () => {
        expect(sectionOfKey('words.currency')).toBe('general');
        expect(sectionOfKey('words.house')).toBe('words');
        expect(sectionOfKey('words.bank')).toBe('words');
        expect(sectionOfKey('theme_accent')).toBe('look');
        expect(sectionOfKey('space.01')).toBeNull();
        expect(sectionOfKey('group.brown')).toBeNull();
    });

    it('puts a section back in one step and leaves name, language and theme alone', () => {
        const edition = makeEdition({
            name: 'Club',
            theme: 'riso',
            currency: 'usd',
            elements: {
                'words.currency': { name: 'Kroketten', text: 'K' },
                board_center: { subtitle: '', name: 'Midden' },
                theme_accent: { color: '#7B4B94' },
                'group.red': { color: '#F7941D', town: 'Heeten' },
                'words.jail': { name: 'de Strafbank' },
            },
        });

        const general = resetSection(edition, 'general');
        expect(general.edition.currency).toBe(defaultCurrency('nl'));
        expect(general.edition.elements['words.currency']).toBeUndefined();
        expect(general.edition.elements['board_center']).toEqual({
            name: 'Midden',
        });
        expect(general.edition.name).toBe('Club');
        expect(general.changes).toHaveLength(2);

        const look = resetSection(edition, 'look');
        expect(look.edition.theme).toBe('riso');
        // An accent stored before B203 is ignored, so the reset leaves it be.
        expect(look.edition.elements['theme_accent']).toEqual({
            color: '#7B4B94',
        });
        expect(look.edition.elements['group.red']).toEqual({ town: 'Heeten' });

        const words = resetSection(edition, 'words');
        expect(words.edition.elements['words.jail']).toBeUndefined();
        expect(words.edition.elements['words.currency']).toBeDefined();
    });

    it('only offers the reset where the section differs', () => {
        const plain = makeEdition();
        expect(sectionDiffers(plain, 'general')).toBe(false);
        expect(sectionDiffers(plain, 'look')).toBe(false);
        expect(
            sectionDiffers(
                makeEdition({
                    elements: { theme_accent: { color: '#7B4B94' } },
                }),
                'look',
            ),
        ).toBe(false);
        expect(
            sectionDiffers(
                makeEdition({ elements: { 'group.red': { town: 'Heeten' } } }),
                'look',
            ),
        ).toBe(false);
        expect(sectionDiffers(plain, 'together')).toBe(false);
    });
});

describe('one currency field (B147)', () => {
    it('reads one of the four or an own currency', () => {
        expect(currencyChoice(makeEdition({ currency: 'gbp' }))).toBe('gbp');
        expect(
            currencyChoice(
                makeEdition({ elements: { 'words.currency': { text: 'K' } } }),
            ),
        ).toBe('custom');
    });

    it('drops the own name and sign when a standard currency is chosen', () => {
        const change = chooseCurrency(
            makeEdition({
                elements: { 'words.currency': { name: 'Kroketten' } },
            }),
            'play',
        );

        expect(change.edition.currency).toBe('play');
        expect(change.edition.elements['words.currency']).toBeUndefined();
        expect(change.changes).toHaveLength(1);
        expect(chooseCurrency(makeEdition(), 'usd').changes).toEqual([]);
    });
});

describe('Van vrienden (B146)', () => {
    it('opens the element of a contribution, and the first street for a town', () => {
        expect(contributionElement('card.chance.03')).toBe('card.chance.03');
        expect(contributionElement('group.brown')).toBe('space.01');
        expect(contributionElement('group.darkblue')).toBe('space.37');
        expect(
            firstContributionElement([
                { elementKey: 'pawn.02' },
                { elementKey: 'space.05' },
            ]),
        ).toBe('pawn.02');
        expect(firstContributionElement([])).toBeUndefined();
    });
});
