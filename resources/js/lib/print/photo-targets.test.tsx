import { renderToStaticMarkup } from 'react-dom/server';

import { resolveEdition } from '@/lib/edition/resolve';
import { makeEdition, photo } from '@/lib/edition/test-utils';
import type { Edition } from '@/lib/edition/types';
import { ItemArt, type ArtContext } from '@/print/item-art';

import { composePages } from './composition';
import { photoTargets, PRINT_SETS } from './photo-targets';
import { allPartsOn, toEdition } from './print-edition';

const FILLED = /data-photo="filled" data-w="([\d.]+)" data-h="([\d.]+)"/;

function withPhotos(): Edition {
    const base = makeEdition();

    return {
        ...base,
        parts: {
            ...base.parts,
            money: true,
            pawns: true,
            boxLid: true,
        },
        elements: {
            'space.01': { layout: 'frame', photo: photo() },
            'space.03': { layout: 'full', photo: photo() },
            'deed.01': { layout: 'frame', photo: photo() },
            'deed.05': { layout: 'full', photo: photo() },
            'card.chance.01': { layout: 'frame', photo: photo() },
            'card.chest.02': { layout: 'full', photo: photo() },
            'card_back.chance': { layout: 'frame', photo: photo() },
            'note.5': { photo: photo() },
            'pawn.01': { photo: photo() },
            box_lid: { layout: 'full', photo: photo() },
            // The text layout shows no photo: nothing to crop.
            'space.05': { layout: 'text', photo: photo() },
        },
    };
}

describe('photo targets', () => {
    it('takes the frame of every photo from the renderers, with bleed where there is bleed', () => {
        const targets = photoTargets(withPhotos());

        // A full-bleed card is 63 x 88 plus 3 mm bleed on each side, in both sets.
        expect(targets.printer['card.chest.02#photo']).toEqual({
            w: 69,
            h: 94,
        });
        expect(targets.home['deed.05#photo']).toEqual({ w: 69, h: 94 });
        // A framed photo has its frame and no bleed.
        expect(targets.printer['card.chance.01#photo']).toEqual({
            w: 54,
            h: 28,
        });
        // A full space is 40 x 70 on the board and 45 x 75 as a home sticker (0,5 mm inset plus 3 mm bleed).
        expect(targets.printer['space.03#photo']).toEqual({ w: 40, h: 70 });
        expect(targets.home['space.03#photo']).toEqual({ w: 45, h: 75 });
        // The box lid has 3 mm bleed (267 + 6).
        expect(targets.printer['box_lid#photo']).toEqual({ w: 273, h: 273 });
        expect(targets.printer['note.5#photo']).toBeDefined();
        expect(targets.printer['pawn.01#photo']).toBeDefined();
        expect(targets.printer['card_back.chance#photo']).toBeDefined();
    });

    it('lists no target for a photo the layout does not show', () => {
        const targets = photoTargets(withPhotos());

        expect(targets.printer['space.05#photo']).toBeUndefined();
        expect(targets.home['space.05#photo']).toBeUndefined();
    });

    it('lists no target for a part that is switched off', () => {
        const edition = withPhotos();
        const targets = photoTargets({
            ...edition,
            parts: { ...edition.parts, boxLid: false },
        });

        expect(targets.printer['box_lid#photo']).toBeUndefined();
    });

    it('measures what the print page draws: the slot in every printed item has the size of its target', () => {
        const edition = withPhotos();
        const targets = photoTargets(edition);
        const full = allPartsOn(edition);
        const printEdition = {
            ...edition,
            elements: edition.elements,
        } as unknown as Parameters<typeof composePages>[2];
        let checked = 0;

        for (const set of PRINT_SETS) {
            const ctx: ArtContext = {
                edition: full,
                resolved: resolveEdition(full),
                set,
                measure: true,
            };

            for (const part of [
                'board',
                'cards',
                'money',
                'tokens',
                'box_lid',
            ] as const) {
                for (const page of composePages(
                    part,
                    set,
                    printEdition,
                    edition.boardProfile,
                )) {
                    for (const item of page.items) {
                        // The whole board panel holds many spaces: those are checked per space above.
                        if (item.elementKey === null || item.side === 'back') {
                            continue;
                        }

                        const found = FILLED.exec(
                            renderToStaticMarkup(
                                <ItemArt ctx={ctx} item={item} />,
                            ),
                        );
                        const target = targets[set][`${item.elementKey}#photo`];

                        if (found === null || target === undefined) {
                            continue;
                        }

                        expect(Number(found[1])).toBeCloseTo(target.w, 1);
                        expect(Number(found[2])).toBeCloseTo(target.h, 1);
                        checked += 1;
                    }
                }
            }
        }

        // Cards, deeds, a note, a pawn and the lid, in both sets.
        expect(checked).toBeGreaterThanOrEqual(10);
    });

    it('survives the trip through the print payload', () => {
        const edition = withPhotos();
        const again = toEdition({
            name: edition.name,
            language: edition.language,
            theme: edition.theme,
            currency: edition.currency,
            boardProfile: edition.boardProfile,
            parts: edition.parts,
            elements: edition.elements as never,
        });

        expect(photoTargets(again)).toEqual(photoTargets(edition));
    });
});
