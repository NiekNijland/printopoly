import { describe, expect, it } from 'vitest';
import { coverTransform } from '@/testing/photo-transform';
import { runChecks } from './checks';
import { checkElement } from './checks-element';
import type { CheckPhoto, CheckText, PartSelection } from './checks-types';
import { defaultTransform, setZoom } from './photos-transform';
import { DEFAULT_BOARD_PROFILE } from './print-board';

const checkPhoto = (key: string, photo: CheckPhoto) =>
    checkElement({ key, photos: [photo] });

const checkText = (key: string, text: CheckText) =>
    checkElement({ key, texts: [text] });

const parts: PartSelection = {
    board: true,
    titleDeeds: true,
    cards: true,
    money: false,
    tokens: false,
    boxLid: false,
    houseRules: false,
};

/** A deed photo frame of 40 x 30 mm with 3 mm bleed. */
const photo = (width: number, height: number, zoom = 1): CheckPhoto => {
    const frame = { w: 40, h: 30 };
    const target = { w: 46, h: 36 };
    const source = { w: width, h: height };
    return {
        field: 'photo',
        source,
        frame,
        bleed: 3,
        transform: setZoom(
            source,
            coverTransform(source, target),
            target,
            zoom,
        ),
    };
};

describe('checkPhoto', () => {
    it('is silent for a sharp photo', () => {
        expect(checkPhoto('space.01', photo(2000, 1500))).toEqual([]);
    });

    it('warns below 150 dpi with the design text and the dpi in the data', () => {
        // 46 mm = 1.811 in; 200 px wide photo (cover on the larger ratio) gives about 110 dpi.
        const [i, ...rest] = checkPhoto('space.24', photo(200, 150));
        expect(rest).toEqual([]);
        expect(i).toMatchObject({
            code: 'photo.low-resolution',
            elementKey: 'space.24',
            field: 'photo',
            severity: 'warning',
            icon: 'triangle-alert',
        });
        const dpi = i?.data?.dpi ?? 0;
        expect(dpi).toBeGreaterThan(100);
        expect(dpi).toBeLessThan(120);
        // How big it is and how big it should be, without telling off (B251, Kees).
        expect(i?.message.nl).toBe(
            'Deze foto is 200 × 150 px en wordt op papier wat korrelig. Scherp wordt hij vanaf ongeveer 300 × 225 px. Printen kan ook zo.',
        );
        // Plain words, no dpi numbers (vindbaarheid §2).
        expect(i?.message.en).not.toContain('dpi');
        expect(i?.severityLabel).toEqual({ nl: 'Waarschuwing', en: 'Warning' });
    });

    it('treats exactly 150 dpi as fine', () => {
        // 46 mm at 150 dpi = 271.65 px
        expect(checkPhoto('space.01', photo(272, 272))).toEqual([]);
        expect(
            checkPhoto('space.01', photo(260, 260)).map((i) => i.code),
        ).toEqual(['photo.low-resolution']);
    });

    it('counts the bleed: a photo that is fine on the trim alone can fall short with bleed', () => {
        const source = { w: 250, h: 250 };
        const noBleed = {
            field: 'photo',
            source,
            frame: { w: 40, h: 40 },
            bleed: 0,
            transform: defaultTransform(),
        };
        const withBleed = { ...noBleed, bleed: 3 };
        expect(checkPhoto('x', noBleed)).toEqual([]); // 250 px / 1.575 in = 159 dpi
        expect(checkPhoto('x', withBleed).map((i) => i.code)).toEqual([
            'photo.low-resolution',
        ]); // 250 / 1.811 = 138 dpi
    });

    it('says nothing about a new standing photo at the top third (R5-01)', () => {
        // A phone photo on a square frame with bleed, as it starts: centred at a third from the top.
        const p = {
            field: 'photo',
            source: { w: 3024, h: 4032 },
            frame: { w: 40, h: 40 },
            bleed: 2.5,
            transform: { ...defaultTransform(), y: 1 / 3 },
        };
        expect(checkPhoto('space.03', p)).toEqual([]);
    });

    it('measures the sharpness as the photo prints, at no less than 100%', () => {
        // 290 px on 46 mm is 160 dpi at 100%; a stored 80% would have said 200 dpi.
        const p = {
            ...photo(290, 290),
            transform: { ...defaultTransform(), scale: 0.8 },
        };
        expect(checkPhoto('space.03', p)).toEqual([]);
        const small = {
            ...photo(260, 260),
            transform: { ...defaultTransform(), scale: 0.8 },
        };
        expect(checkPhoto('space.03', small).map((i) => i.code)).toEqual([
            'photo.low-resolution',
        ]);
    });

    it('has stable ids per code, element and field', () => {
        expect(checkPhoto('space.24', photo(200, 150))[0]?.id).toBe(
            'photo.low-resolution|space.24|photo',
        );
    });
});

describe('checkText', () => {
    it('is silent when the text fits', () => {
        expect(
            checkText('space.01', { field: 'name', fit: { fits: true } }),
        ).toEqual([]);
    });

    it('says how many characters too many, as in the design', () => {
        const [i] = checkText('card.chance.03', {
            field: 'text',
            fit: { fits: false, excessCharacters: 20 },
        });
        expect(i?.message.nl).toBe(
            'De tekst past niet, ook niet in de kleinste letter. Haal ongeveer 20 tekens weg.',
        );
        expect(i?.message.en).toBe(
            "The text doesn't fit, not even at the smallest size. Remove about 20 characters.",
        );
        expect(i).toMatchObject({
            code: 'text.too-long',
            elementKey: 'card.chance.03',
            field: 'text',
            data: { excessCharacters: 20 },
        });
    });

    it('uses the singular for one character', () => {
        const [i] = checkText('x', {
            field: 'text',
            fit: { fits: false, excessCharacters: 1 },
        });
        expect(i?.message.nl).toContain('Haal 1 teken weg.');
        expect(i?.message.en).toContain('Remove 1 character.');
    });
});

describe('a photo on a space and on its title deed (R5-09)', () => {
    const run = (space: CheckPhoto, deed: CheckPhoto) =>
        runChecks({
            board: DEFAULT_BOARD_PROFILE,
            parts,
            elements: [
                { key: 'space.03', photos: [space] },
                {
                    key: 'deed.02',
                    photos: [{ ...deed, borrowedFrom: 'space.03' }],
                },
            ],
        });

    it('says once that it is too small, at the space, and names the deed', () => {
        const issues = run(photo(200, 150), photo(200, 150));

        expect(issues.map((i) => `${i.elementKey}:${i.code}`)).toEqual([
            'space.03:photo.low-resolution',
        ]);
        expect(issues[0]?.message.nl).toContain(
            'Dat geldt ook voor het eigendomsbewijs.',
        );
    });

    it('keeps the message of the deed when only the deed is too small', () => {
        const issues = run(photo(2000, 1500), photo(200, 150));

        expect(issues.map((i) => `${i.elementKey}:${i.code}`)).toEqual([
            'deed.02:photo.low-resolution',
        ]);
        expect(issues[0]?.message.nl).not.toContain('eigendomsbewijs');
    });
});
