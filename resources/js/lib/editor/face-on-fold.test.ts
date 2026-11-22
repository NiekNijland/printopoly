import { runChecks } from '@/lib/checks/checks';
import { BOARD_CENTER_KEY } from '@/lib/edition/keys';
import { resolveEdition } from '@/lib/edition/resolve';
import type { Edition, PhotoPlacement } from '@/lib/edition/types';
import { buildCheckInput } from '@/lib/editor/checks-input';
import { placementTarget } from '@/lib/photos/resolution';
import { seamClearX, subjectOffset } from '@/lib/photos/transform';
import { centerRect, DEFAULT_BOARD_PROFILE } from '@/lib/print/board';
import { CENTER_PHOTO_BLEED } from '@/lib/render/center-layout';
import { sampleEdition } from '@/testing/editions';

import { centerFoldItems, faceOnFold } from './layers';
import { startingPlacement } from './placements';

const centre = centerRect(DEFAULT_BOARD_PROFILE);
const target = placementTarget(
    { w: centre.w, h: centre.h },
    CENTER_PHOTO_BLEED,
);
const STANDING = { width: 3024, height: 4032 };
const LYING = { width: 4032, height: 3024 };

function over(placement: PhotoPlacement): Edition {
    const edition = sampleEdition({ parts: { board: true } });

    return {
        ...edition,
        elements: { [BOARD_CENTER_KEY]: { background: placement } },
    };
}

describe('a photo over the whole centre and the folds (R6 Tom, Sara; B261)', () => {
    it('starts a lying photo with its middle in the left half, clear of the vertical fold', () => {
        const placement = startingPlacement('p', LYING, target, true);
        const offset = subjectOffset(
            { w: LYING.width, h: LYING.height },
            target,
            {
                x: placement.cx,
                y: placement.cy,
                scale: 1,
                rotation: 0,
            },
        );

        // Left of the fold, and still covering the centre (the visible part stays inside the photo).
        expect(offset.x).toBeLessThan(-0.15 * centre.w);
        // 4:3 on a square shows 3/4 of the width: the middle of the visible part goes no further than 0.625.
        expect(placement.cx).toBeCloseTo(0.625);
        expect(
            faceOnFold(DEFAULT_BOARD_PROFILE, placement, {
                w: LYING.width,
                h: LYING.height,
            }),
        ).toBe(false);
    });

    it('keeps a standing photo in the middle, where Controle warns about the fold', () => {
        const placement = startingPlacement('p', STANDING, target, true);

        expect(placement.cx).toBe(0.5);
        expect(seamClearX({ w: 3, h: 4 }, target)).toBe(0.5);
        expect(
            faceOnFold(DEFAULT_BOARD_PROFILE, placement, {
                w: STANDING.width,
                h: STANDING.height,
            }),
        ).toBe(true);
        // Zoomed in and slid aside, the face is clear.
        expect(
            faceOnFold(
                DEFAULT_BOARD_PROFILE,
                { ...placement, scale: 1.6, cx: 0.66 },
                { w: STANDING.width, h: STANDING.height },
            ),
        ).toBe(false);
    });

    it('says so in Controle, like a logo on the fold, and only with the size of the photo known', () => {
        const placement = startingPlacement('p', STANDING, target, true);
        const edition = over(placement);
        const centreOf = resolveEdition(edition).boardCenter;

        expect(centerFoldItems(edition, centreOf)).toEqual([]);
        expect(
            centerFoldItems(edition, centreOf, {
                w: STANDING.width,
                h: STANDING.height,
            }),
        ).toEqual([{ field: 'background', what: 'face' }]);

        const issues = runChecks(
            buildCheckInput(
                edition,
                new Map(),
                new Map([
                    [
                        'p',
                        {
                            id: 'p',
                            url: 'blob:p',
                            width: STANDING.width,
                            height: STANDING.height,
                        },
                    ],
                ]),
            ),
        );
        const fold = issues.find(
            (issue) =>
                issue.code === 'center.on-fold' && issue.field === 'background',
        );
        expect(fold?.message.nl).toContain(
            'Het midden van de foto valt op een vouwlijn',
        );
        expect(fold?.message.en).toContain('falls on a fold line');
    });
});
