import { describe, expect, it } from 'vitest';
import { coverTransform, defaultTransform, setZoom } from '../photos/transform';
import { DEFAULT_BOARD_PROFILE } from '../print/board';
import {
    checkBoard,
    checkBoxLid,
    checkColor,
    checkParts,
    checkPhoto,
    checkText,
    runChecks,
} from './checks';
import type { CheckInput, CheckPhoto, PartSelection } from './types';

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
function photo(width: number, height: number, zoom = 1): CheckPhoto {
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
}

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
        expect(i?.message.nl).toBe(
            `De foto heeft ${dpi} dpi op dit formaat. Kies een grotere foto of zoom minder in.`,
        );
        expect(i?.message.en).toContain(`${dpi} dpi`);
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

    it('warns when the photo does not cover the frame', () => {
        const p = {
            ...photo(2000, 1500),
            transform: { ...defaultTransform(), scale: 0.8 },
        };
        const codes = checkPhoto('space.03', p).map((i) => i.code);
        expect(codes).toContain('photo.not-covering');
        expect(codes).not.toContain('photo.low-resolution');
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

describe('checkBoard', () => {
    it('accepts the default profile', () => {
        expect(checkBoard(DEFAULT_BOARD_PROFILE)).toEqual([]);
    });

    it('refuses a profile with nonsense numbers', () => {
        const [i] = checkBoard({ ...DEFAULT_BOARD_PROFILE, outer: 0 });
        expect(i).toMatchObject({
            code: 'board.profile-invalid',
            severity: 'error',
            icon: 'octagon-x',
        });
        expect(
            checkBoard({ ...DEFAULT_BOARD_PROFILE, panels: 3 as 2 })[0]?.code,
        ).toBe('board.profile-invalid');
    });

    it('flags a board whose middle disappears', () => {
        expect(
            checkBoard({ ...DEFAULT_BOARD_PROFILE, corner: 260 }).map(
                (i) => i.code,
            ),
        ).toEqual(['board.center-missing']);
    });

    it('flags spaces under 15 mm', () => {
        const codes = checkBoard({ ...DEFAULT_BOARD_PROFILE, corner: 190 }).map(
            (i) => i.code,
        );
        expect(codes).toContain('board.spaces-too-narrow');
    });

    it('flags a home-print centre piece that does not fit A4 with bleed (B65)', () => {
        // Centre 500 - 2*70 = 360 -> pieces of 180 - 1 + 6 = 185 mm: fits 194 mm. Make the corners smaller.
        const [i] = checkBoard({ ...DEFAULT_BOARD_PROFILE, corner: 40 });
        expect(i?.code).toBe('board.home-print-too-big');
        expect(i?.message.nl).toContain('past niet op A4');
        expect(i?.message.en).toContain("doesn't fit on A4");
    });

    it('accepts the boundary: pieces of exactly 194 mm with bleed', () => {
        // piece = (outer - 2*corner)/2 - 1 + 6 = 194 -> outer - 2*corner = 378 with outer 500 -> corner 61
        expect(checkBoard({ ...DEFAULT_BOARD_PROFILE, corner: 61 })).toEqual(
            [],
        );
        expect(
            checkBoard({ ...DEFAULT_BOARD_PROFILE, corner: 60.5 }).map(
                (i) => i.code,
            ),
        ).toEqual(['board.home-print-too-big']);
    });
});

describe('checkBoxLid', () => {
    it('is fine for 267 x 267 (fits A3 with bleed and margin)', () => {
        expect(checkBoxLid(DEFAULT_BOARD_PROFILE)).toEqual([]);
    });

    it('warns when the lid does not fit A3', () => {
        const [i] = checkBoxLid({
            ...DEFAULT_BOARD_PROFILE,
            boxLid: { w: 300, h: 300 },
        });
        expect(i).toMatchObject({
            code: 'board.box-lid-too-big',
            severity: 'warning',
            elementKey: 'boxLid',
        });
    });
});

describe('checkParts', () => {
    it('requires the board only (B99)', () => {
        expect(checkParts(parts)).toEqual([]);
        expect(
            checkParts({ ...parts, titleDeeds: false, cards: false }),
        ).toEqual([]);
        expect(checkParts({ ...parts, board: false })[0]).toMatchObject({
            code: 'parts.board-missing',
            severity: 'error',
        });
    });
});

describe('runChecks', () => {
    const input: CheckInput = {
        board: DEFAULT_BOARD_PROFILE,
        parts,
        elements: [
            {
                key: 'space.01',
                photos: [photo(2000, 1500)],
                texts: [{ field: 'name', fit: { fits: true } }],
            },
            { key: 'space.24', photos: [photo(200, 150)] },
            {
                key: 'card.chance.03',
                texts: [
                    {
                        field: 'text',
                        fit: { fits: false, excessCharacters: 20 },
                    },
                ],
            },
        ],
    };

    it('collects issues from all elements in order', () => {
        const issues = runChecks(input);
        expect(issues.map((i) => `${i.elementKey}:${i.code}`)).toEqual([
            'space.24:photo.low-resolution',
            'card.chance.03:text.too-long',
        ]);
    });

    it('returns nothing for a clean edition', () => {
        expect(runChecks({ ...input, elements: [] })).toEqual([]);
    });

    it('checks the box lid only when it is a selected part', () => {
        const big = {
            ...input,
            elements: [],
            board: { ...DEFAULT_BOARD_PROFILE, boxLid: { w: 300, h: 300 } },
        };
        expect(runChecks(big)).toEqual([]);
        expect(
            runChecks({ ...big, parts: { ...parts, boxLid: true } }).map(
                (i) => i.code,
            ),
        ).toEqual(['board.box-lid-too-big']);
    });

    it('puts errors on parts and board first', () => {
        const issues = runChecks({
            ...input,
            parts: { ...parts, board: false },
        });
        expect(issues[0]?.code).toBe('parts.board-missing');
    });

    it('gives every issue an icon and a text label, never colour alone (B98)', () => {
        const all = runChecks({
            ...input,
            parts: { ...parts, board: false, boxLid: true },
            board: {
                ...DEFAULT_BOARD_PROFILE,
                corner: 40,
                boxLid: { w: 400, h: 400 },
            },
        });
        expect(all.length).toBeGreaterThan(3);
        for (const i of all) {
            expect(i.icon).toMatch(/^(triangle-alert|octagon-x)$/);
            expect(i.severityLabel.nl.length).toBeGreaterThan(0);
            expect(i.severityLabel.en.length).toBeGreaterThan(0);
            expect(i.message.nl.length).toBeGreaterThan(0);
            expect(i.message.en.length).toBeGreaterThan(0);
        }
    });
});

describe('checkColor (B75, B130)', () => {
    const board = '#D4E9D7';

    it('stays quiet about a standard colour on a deed bar', () => {
        expect(
            checkColor({
                field: 'red',
                name: { nl: 'Rood', en: 'Red' },
                hex: '#ED1B24',
                role: 'bar',
                against: board,
            }),
        ).toEqual([]);
    });

    it('warns about a neon colour that print ink cannot make', () => {
        const issues = checkColor({
            field: 'green',
            name: { nl: 'X', en: 'X' },
            hex: '#00FF00',
            role: 'bar',
            against: board,
        });

        expect(issues.map((issue) => issue.code)).toContain(
            'style.out-of-gamut',
        );
        expect(issues[0]?.elementKey).toBe('theme_accent');
    });

    it('warns when the bar blends into the board', () => {
        expect(
            checkColor({
                field: 'lightblue',
                name: { nl: 'X', en: 'X' },
                hex: '#D4E9D7',
                role: 'bar',
                against: board,
            }).map((issue) => issue.code),
        ).toContain('style.low-contrast');
    });

    it('wants an accent that reads on the board', () => {
        expect(
            checkColor({
                field: 'accent',
                name: { nl: 'X', en: 'X' },
                hex: '#CFE8D2',
                role: 'accent',
                against: board,
            }).map((issue) => issue.code),
        ).toContain('style.low-contrast');
        expect(
            checkColor({
                field: 'accent',
                name: { nl: 'X', en: 'X' },
                hex: '#C8321F',
                role: 'accent',
                against: board,
            }),
        ).toEqual([]);
    });

    it('runs with the other checks', () => {
        const issues = runChecks({
            board: DEFAULT_BOARD_PROFILE,
            parts,
            elements: [],
            colors: [
                {
                    field: 'x',
                    name: { nl: 'X', en: 'X' },
                    hex: '#00FF00',
                    role: 'bar',
                    against: board,
                },
            ],
        });

        expect(issues.map((issue) => issue.code)).toContain(
            'style.out-of-gamut',
        );
    });
});
