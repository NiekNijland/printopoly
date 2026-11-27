import { describe, expect, it } from 'vitest';
import { checkParts, checkPawns, runChecks } from './checks';
import type { CheckInput, CheckPhoto, PartSelection } from './checks-types';
import { coverTransform, setZoom } from './photos-transform';
import { DEFAULT_BOARD_PROFILE } from './print-board';

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

describe('checkPawns', () => {
    const on = { ...parts, tokens: true };

    it('warns when pawns are on and some have no photo', () => {
        const issues = checkPawns(on, ['pawn.01', 'pawn.02']);

        expect(issues).toHaveLength(1);
        expect(issues[0]).toMatchObject({
            code: 'pawns.no-photo',
            elementKey: 'pawn.01',
            severity: 'warning',
        });
        expect(issues[0]?.message.nl).toContain(
            '2 pionnen hebben nog geen foto',
        );
    });

    it('is silent with pawns off or all pawns photographed', () => {
        expect(checkPawns(parts, ['pawn.01'])).toEqual([]);
        expect(checkPawns(on, [])).toEqual([]);
    });

    it('is one message about the pawns, shown on every pawn without a photo (R5-09)', () => {
        const [only, ...more] = checkPawns(on, [
            'pawn.02',
            'pawn.03',
            'pawn.04',
        ]);

        expect(more).toEqual([]);
        expect(only?.alsoKeys).toEqual(['pawn.03', 'pawn.04']);
        expect(only?.about).toEqual({ nl: 'Pionnen', en: 'Pawns' });
        expect(only?.message.nl).toContain('3 pionnen');
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
            board: { ...DEFAULT_BOARD_PROFILE, boxLid: { w: 400, h: 400 } },
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
