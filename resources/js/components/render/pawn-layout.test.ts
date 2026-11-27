import { describe, expect, it } from 'vitest';

import {
    NAME_BOX,
    PANEL_HEIGHT,
    PAWN_WIDTH,
    PORTRAIT,
    nameBoxOf,
} from './pawn-layout';

describe('the layout of a pawn', () => {
    it('puts the portrait left and the name right, inside one panel', () => {
        expect(PAWN_WIDTH).toBe(40);
        expect(PORTRAIT.h).toBe(PANEL_HEIGHT - 3);
        expect(NAME_BOX.x).toBe(PORTRAIT.x + PORTRAIT.w + 1.5);
        expect(NAME_BOX.x + NAME_BOX.w + 1.5).toBe(PAWN_WIDTH);
    });

    it('moves the name box for the ornaments of a style', () => {
        expect(nameBoxOf(undefined)).toBe(NAME_BOX);
        expect(nameBoxOf('vintage').h).toBe(13.3);
        expect(nameBoxOf('modern').x).toBe(NAME_BOX.x + 0.4);
        expect(nameBoxOf('playful').y).toBe(4);
    });
});
