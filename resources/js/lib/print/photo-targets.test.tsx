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
            'space.01': { photo: photo() },
            'space.03': { photo: photo() },
            'deed.01': { photo: photo() },
            'deed.05': { photo: photo() },
            'card.chance.01': { photo: photo() },
            'card.chest.02': { photo: photo() },
            'card_back.chance': { photo: photo() },
            'note.5': { photo: photo() },
            'pawn.01': { photo: photo() },
            box_lid: { photo: photo() },
        },
    };
}

describe('photo targets', () => {
    it('takes the frame of every photo from the renderers, as they are printed', () => {
        const targets = photoTargets(withPhotos());

        // Every photo sits in a frame, with no bleed, in both sets.
        expect(targets.printer['card.chest.02#photo']).toEqual({
            w: 54,
            h: 28,
        });
        expect(targets.home['deed.05#photo']).toEqual({ w: 54, h: 16.5 });
        expect(targets.printer['space.03#photo']).toEqual({ w: 37, h: 35.5 });
        expect(targets.printer['box_lid#photo']).toEqual({ w: 243, h: 154.86 });
        expect(targets.printer['note.5#photo']).toBeDefined();
        expect(targets.printer['pawn.01#photo']).toBeDefined();
        expect(targets.printer['card_back.chance#photo']).toBeDefined();
    });

    it('measures the photo of the board centre only when it shows one (B125)', () => {
        const base = makeEdition();
        const centre = (centerMode?: 'photo' | 'logo') => ({
            ...base,
            elements: {
                board_center: {
                    photo: photo(),
                    photoAspect: 2,
                    ...(centerMode === undefined ? {} : { centerMode }),
                },
            },
        });
        const shown = photoTargets(centre('photo'));
        const frame = shown.printer['board_center#photo'];

        expect(frame).toBeDefined();
        expect((frame?.w ?? 0) / (frame?.h ?? 1)).toBeCloseTo(2, 1);
        expect(shown.home['board_center#photo']).toEqual(frame);
        expect(
            photoTargets(centre('logo')).printer['board_center#photo'],
        ).toBeDefined();
        expect(
            photoTargets(centre()).printer['board_center#photo'],
        ).toBeUndefined();
    });

    it('gives the background photo of the centre the size of the centre plus its bleed in both sets (B125, R5-03)', () => {
        const base = makeEdition();
        const targets = photoTargets({
            ...base,
            elements: { board_center: { background: photo() } },
        });

        expect(targets.printer['board_center#background']).toEqual({
            w: 366,
            h: 366,
        });
        expect(targets.home['board_center#background']).toEqual({
            w: 366,
            h: 366,
        });
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

    it('measures a full photo including the bleed, per set', () => {
        const base = withPhotos();
        const edition: Edition = {
            ...base,
            elements: {
                ...base.elements,
                'space.01': { photo: photo(), photoStyle: 'full' },
                'space.05': { photo: photo(), photoStyle: 'full' },
                'deed.01': { photo: photo(), photoStyle: 'full' },
                'card.chance.01': { photo: photo(), photoStyle: 'full' },
                'note.5': { photo: photo(), photoStyle: 'full' },
                box_lid: { photo: photo(), photoStyle: 'full' },
            },
        };
        const targets = photoTargets(edition);
        const framed = photoTargets(withPhotos());
        const lid = edition.boardProfile.boxLid;
        const width = edition.boardProfile.corner;

        // Cards and deeds: 63 x 88 plus 3 mm on every side.
        expect(targets.printer['card.chance.01#photo']).toEqual({
            w: 69,
            h: 94,
        });
        expect(targets.home['deed.01#photo']).toEqual({ w: 69, h: 42 });
        expect(targets.printer['box_lid#photo']).toEqual({
            w: Math.round((lid.w + 6) * 100) / 100,
            h: Math.round((lid.h + 6) * 100) / 100,
        });
        // A street on the board has no bleed, on a home sticker 2.5 mm.
        expect(targets.printer['space.01#photo']?.h).toBeCloseTo(
            width * 0.8,
            1,
        );
        expect(targets.home['space.01#photo']?.h).toBeCloseTo(
            width * 0.8 + 2.5,
            1,
        );
        expect(targets.printer['space.05#photo']?.h).toBeCloseTo(width, 1);
        // A framed photo keeps its old frame.
        expect(framed.printer['card.chance.01#photo']).toEqual({
            w: 54,
            h: 28,
        });
        // Money prints without bleed: the field inside the frame, behind the pattern (B137).
        expect(targets.printer['note.5#photo']).toEqual({ w: 120.8, h: 50.8 });
    });
});

describe('photo targets of the style items (B130)', () => {
    it('measures a card back photo over the whole card with bleed', () => {
        const base = makeEdition();
        const edition: Edition = {
            ...base,
            elements: {
                'card_back.chance': { photo: photo() },
            },
        };
        const targets = photoTargets(edition);

        expect(targets.printer['card_back.chance#photo']).toEqual({
            w: 69,
            h: 94,
        });
    });
});
