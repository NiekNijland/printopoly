import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Board, BoardCenter } from '@/components/render/board';
import { boardPropsOf, NO_PHOTOS } from '@/components/render/board-props';
import { BoardSpace } from '@/components/render/board-space';
import { BoxLid } from '@/components/render/box-lid';
import type { EditionTitle } from '@/components/render/edition-title';
import { Invitation } from '@/components/render/invitation';
import { TitleDeed } from '@/components/render/title-deed';
import { runChecks } from '@/lib/checks/checks';
import {
    deedCrop,
    deedPhotoOf,
    withDeedPhotos,
} from '@/lib/edition/deed-photos';
import { resolveEdition } from '@/lib/edition/resolve';
import { makeEdition, photo } from '@/lib/edition/test-utils';
import type { Edition } from '@/lib/edition/types';
import { buildCheckInput } from '@/lib/editor/checks-input';
import { layersOverLidText } from '@/lib/editor/layers';
import { deedsFor, spaceAt } from '@/lib/game/standard-edition';
import { cropSpec } from '@/lib/photos/resolution';
import {
    clampTransform,
    coversTarget,
    setFit,
    startingPoint,
} from '@/lib/photos/transform';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';
import { composePages } from '@/lib/print/composition';

import { lidLayout, lidTextZones } from './box-lid-layout';
import { photoLayout } from './photo';

const base = { theme: 'classic', locale: 'nl' } as const;

function withElements(elements: Edition['elements'], parts = {}): Edition {
    const edition = makeEdition();

    return {
        ...edition,
        parts: { ...edition.parts, ...parts },
        elements,
    };
}

describe('photo that fits instead of fills (B168)', () => {
    const logo = { w: 4000, h: 1000 };
    const square = { w: 60, h: 60 };

    it('shows the whole photo at 100% and may go to 50%', () => {
        const fit = setFit(
            logo,
            { x: 0.5, y: 0.5, scale: 2, rotation: 0, grayscale: false },
            square,
            true,
        );

        expect(fit).toMatchObject({ fit: true, scale: 1, x: 0.5, y: 0.5 });
        expect(clampTransform(logo, { ...fit, scale: 0.2 }, square).scale).toBe(
            0.5,
        );
        // Filling never goes below 100%.
        expect(
            clampTransform(logo, { ...fit, fit: false, scale: 0.2 }, square)
                .scale,
        ).toBe(1);
    });

    it('cuts only the visible part, at its own shape, like the server', () => {
        const spec = cropSpec(
            logo,
            {
                x: 0.5,
                y: 0.5,
                scale: 1,
                rotation: 0,
                grayscale: false,
                fit: true,
            },
            square,
        );

        expect(spec.rect).toEqual({ x: 0, y: 0, w: 4000, h: 1000 });
        expect(spec.output).toEqual({ w: 709, h: 177 });
    });

    it('draws a print crop that fits whole and centred in its slot', () => {
        const layout = photoLayout({ src: 'crop.jpg', fit: true }, 60, 40);

        expect(layout.objectFit).toBe('contain');
        expect(layout.box).toEqual({ left: 0, top: 0, width: 60, height: 40 });
    });

    it('prints a logo in the board centre whole, and lets it shrink below 100% in the editor', () => {
        const title = (source: Parameters<typeof EditionTitle>[0]['photo']) =>
            render(
                <BoardCenter
                    theme="classic"
                    locale="nl"
                    editionName="Zaterdagclub"
                    title={{ mode: 'logo', photo: source }}
                />,
            ).container.querySelector(
                '[data-slot="center-logo"] img',
            ) as HTMLImageElement;

        // In print the server sends the visible part; it sits whole in the frame, whatever the frame's shape.
        expect(title({ src: 'logo-crop.png', fit: true }).style.objectFit).toBe(
            'contain',
        );

        // In the editor a logo that fits may go to 50%: the image is then smaller than its frame.
        const img = title({
            src: 'logo.png',
            width: 600,
            height: 600,
            transform: {
                x: 0.5,
                y: 0.5,
                scale: 0.5,
                rotation: 0,
                grayscale: false,
                fit: true,
            },
        });
        const slot = img.parentElement as HTMLElement;
        expect(parseFloat(img.style.height)).toBeLessThan(
            parseFloat(slot.style.height),
        );
    });
});

describe('where a new photo starts (ronde 3, UX 1)', () => {
    it('puts a standing photo at the top third and keeps a lying one in the middle', () => {
        expect(startingPoint({ w: 3000, h: 4000 }).y).toBeCloseTo(1 / 3);
        expect(startingPoint({ w: 4000, h: 3000 }).y).toBe(0.5);
    });

    it('never shows an edge when a start or another frame puts the photo off its frame', () => {
        const source = { w: 3000, h: 4000 };
        const tall = { w: 30, h: 60 };
        // At the top third in a frame taller than the photo's shape: the window would run off the top.
        const layout = photoLayout(
            {
                src: 'p.jpg',
                width: source.w,
                height: source.h,
                transform: {
                    x: 0.5,
                    y: 0.1,
                    scale: 1,
                    rotation: 0,
                    grayscale: false,
                },
            },
            tall.w,
            tall.h,
        );

        expect(layout.box.top).toBeLessThanOrEqual(0);
        expect(layout.box.top + layout.box.height).toBeGreaterThanOrEqual(
            tall.h - 0.001,
        );
        expect(
            coversTarget(
                source,
                clampTransform(
                    source,
                    { x: 0.5, y: 0.1, scale: 1, rotation: 0, grayscale: false },
                    tall,
                ),
                tall,
            ),
        ).toBe(true);
    });
});

describe('the photo of a space on its title deed (B157)', () => {
    const street = deedsFor()[0];
    const station = deedsFor().find((space) => space.type === 'station');
    const stationDeed =
        station === undefined ? 0 : deedsFor().indexOf(station) + 1;

    it('shows the photo of the space by default, with its style', () => {
        const edition = withElements({
            'space.01': { photo: photo('p1'), photoStyle: 'full' },
        });

        expect(deedPhotoOf(edition, 1)).toMatchObject({
            from: 'space',
            photoStyle: 'full',
            photo: { photoId: 'p1' },
        });
        expect(resolveEdition(edition).deeds?.[0]?.photo?.photoId).toBe('p1');
        expect(street?.position).toBe(1);
    });

    it('keeps an own deed photo, and leaves the deed alone when the space says so', () => {
        const edition = withElements({
            'space.05': { photo: photo('p1') },
            [`deed.0${String(stationDeed)}`]: { photo: photo('own') },
            'space.03': { photo: photo('p3'), deedPhoto: false },
        });
        const resolved = resolveEdition(edition);

        expect(resolved.deeds?.[stationDeed - 1]).toMatchObject({
            photoFrom: 'deed',
            photo: { photoId: 'own' },
        });
        expect(resolved.deeds?.[1]?.photo).toBeUndefined();
    });

    it('writes the photo onto the deed for the print job, and nothing else', () => {
        const edition = withElements({
            'space.01': { photo: photo('p1') },
            'space.04': { photo: photo('tax') },
        });
        const printed = withDeedPhotos(edition);

        expect(printed.elements['deed.01']?.photo?.photoId).toBe('p1');
        expect(Object.keys(printed.elements).sort()).toEqual([
            'deed.01',
            'space.01',
            'space.04',
        ]);
        expect(withDeedPhotos(withElements({}))).toEqual(withElements({}));
    });
});

describe('a standing photo on the narrow frame of its title deed (B177)', () => {
    const standing = { width: 1200, height: 1600 };
    const frame = { w: 54, h: 16.5 };

    it('fills the strip with a standing photo, the face line a third down (B253, Kees)', () => {
        const edition = withElements({
            'space.01': { photo: { ...photo('p1'), cy: 1 / 3 } },
        });
        const borrowed = deedPhotoOf(edition, 1)?.photo;
        if (borrowed === undefined) {
            throw new Error('no deed photo');
        }
        expect(borrowed.borrowed).toBe(true);

        const crop = deedCrop(borrowed, standing, undefined);
        expect(crop).toMatchObject({ photoId: 'p1', scale: 1 });
        expect(crop.fit).toBeUndefined();
        expect(crop.borrowed).toBeUndefined();

        const source = { w: standing.width, h: standing.height };
        const t = clampTransform(
            source,
            {
                x: crop.cx,
                y: crop.cy,
                scale: crop.scale,
                rotation: 0,
                grayscale: false,
            },
            frame,
        );
        // Filled: the strip shows the full width of the photo and a band of its height around the face line.
        const shown = (frame.h / frame.w) * (standing.width / standing.height);
        expect((1 / 3 - (t.y - shown / 2)) / shown).toBeCloseTo(1 / 3, 5);
    });

    it('shows the upper part of a landscape photo on the strip, where faces are (R5-05)', () => {
        const wide = { width: 1600, height: 1200 };
        const crop = deedCrop(photo('p1'), wide, undefined);
        const strip = { w: 54, h: 16.5 };
        const t = clampTransform(
            { w: wide.width, h: wide.height },
            {
                x: crop.cx,
                y: crop.cy,
                scale: crop.scale,
                rotation: 0,
                grayscale: false,
            },
            strip,
        );
        const shown = (strip.h / strip.w) * (wide.width / wide.height);

        // The face line, a third from the top of the photo, is a third from the top of the strip.
        expect((1 / 3 - (t.y - shown / 2)) / shown).toBeCloseTo(1 / 3, 5);
        expect(crop.fit).toBeUndefined();
    });

    it('keeps the crop of a moved landscape photo, a photo that fits, or one of unknown size', () => {
        const placement = { ...photo('p1'), cy: 0.4 };

        expect(
            deedCrop(placement, { width: 1600, height: 900 }, undefined),
        ).toEqual(placement);
        expect(
            deedCrop({ ...placement, fit: true }, standing, undefined),
        ).toEqual({ ...placement, fit: true });
        expect(deedCrop(placement, undefined, undefined)).toEqual(placement);
        // A full-width photo gets the face line of its own, wider strip (B253).
        const full = deedCrop(photo('p1'), standing, 'full');
        expect(full.fit).toBeUndefined();
        expect(full.cy).not.toBe(0.5);
    });

    it('sends that crop to the print job, the space keeps its own', () => {
        const edition = withElements({
            'space.01': { photo: { ...photo('p1'), cy: 1 / 3 } },
        });
        const printed = withDeedPhotos(edition, new Map([['p1', standing]]));

        expect(printed.elements['deed.01']?.photo?.fit).toBeUndefined();
        expect(printed.elements['deed.01']?.photo?.cy).not.toBeCloseTo(1 / 3);
        expect(printed.elements['deed.01']?.photo?.borrowed).toBeUndefined();
        expect(printed.elements['space.01']?.photo?.cy).toBeCloseTo(1 / 3);
    });
});

describe('the story on a title deed (B169)', () => {
    it('prints on the back, between the mortgage and its text', () => {
        const space = spaceAt(1);
        if (space.type !== 'street') throw new Error('Street expected');
        const { container } = render(
            <TitleDeed
                {...base}
                space={space}
                side="back"
                story="Hier stond de bakkerij van opa."
            />,
        );

        expect(
            container.querySelector('[data-slot="story"]')?.textContent,
        ).toBe('Hier stond de bakkerij van opa.');
    });

    it('is resolved trimmed, and empty is none', () => {
        const edition = withElements({
            'deed.01': { text: '  Opa  ' },
            'deed.02': { text: ' ' },
        });
        const deeds = resolveEdition(edition).deeds;

        expect(deeds?.[0]?.story).toBe('Opa');
        expect(deeds?.[1]?.story).toBeUndefined();
    });
});

describe('one builder for the board (bug 5 of ronde 3)', () => {
    it('carries theme, own currency, words, subtitle and centre, but no stored accent (B203)', () => {
        const edition = withElements({
            'words.currency': { name: 'Kussen', text: 'Kx' },
            'words.chance': { name: 'Geluk' },
            theme_accent: { color: '#2255AA' },
            board_center: { subtitle: 'Ons dorp', titleOffset: -1 },
            'space.01': { name: 'Bakkerstraat' },
        });
        const props = boardPropsOf(resolveEdition(edition), NO_PHOTOS);

        expect(props.style).toBeUndefined();
        expect(props.words?.currencySymbol).toBe('Kx');
        expect(props.centerTitle).toMatchObject({
            subtitle: 'Ons dorp',
            offset: -1,
        });

        const { container } = render(<Board {...props} />);
        expect(container.textContent).toContain('Bakkerstraat');
        expect(container.textContent).toContain('Kx');
        expect(container.textContent).toContain('Geluk');
        expect(container.textContent).toContain('Ons dorp');
    });

    it('hides the title ribbon when the edition asks (B170)', () => {
        const edition = withElements({ board_center: { titleHidden: true } });
        const { container } = render(
            <Board {...boardPropsOf(resolveEdition(edition))} />,
        );

        expect(
            container.querySelector('[data-slot="edition-name-diagonal"]'),
        ).toBeNull();
    });
});

describe('the invitation (B169, bug 5)', () => {
    it('has its own headline and line, and the real board with the photos of the edition', () => {
        const edition = withElements({ 'space.01': { name: 'Bakkerstraat' } });
        const board = boardPropsOf(resolveEdition(edition), {
            ...NO_PHOTOS,
            photo: (key) =>
                key === 'space.01' ? { src: 'bakker.jpg' } : undefined,
        });
        const { container } = render(
            <Invitation
                {...base}
                text="Zaterdag"
                editionName="Club"
                headline="Kom spelen!"
                kicker="Kerstavond"
                board={board}
            />,
        );

        expect(container.textContent).toContain('Kom spelen!');
        expect(container.textContent).toContain('Kerstavond');
        expect(container.textContent).not.toContain('Spelavond');
        expect(container.textContent).toContain('Bakkerstraat');
        expect(container.querySelector('img[src="bakker.jpg"]')).not.toBeNull();
    });

    it('drops the small line when it is empty', () => {
        const { container } = render(
            <Invitation {...base} text="" editionName="Club" kicker="" />,
        );

        expect(
            container.querySelector('[data-slot="invitation-kicker"]'),
        ).toBeNull();
    });
});

describe('the box lid (B169, B170, bug 36)', () => {
    const size = DEFAULT_BOARD_PROFILE.boxLid;

    it('has an own subtitle and own lines, and none when the subtitle is empty', () => {
        const { container, rerender } = render(
            <BoxLid
                {...base}
                editionName="Club"
                subtitle="Voor de hele club"
                lines="Kerst 2026"
            />,
        );

        expect(
            container.querySelector('[data-slot="subtitle"]')?.textContent,
        ).toBe('Voor de hele club');
        expect(
            container.querySelector('[data-slot="lines"]')?.textContent,
        ).toBe('Kerst 2026');

        rerender(<BoxLid {...base} editionName="Club" subtitle="" />);
        expect(container.querySelector('[data-slot="subtitle"]')).toBeNull();
    });

    it('can drop the band under the title on a full photo, and move the title', () => {
        const full = { src: 'lid.jpg', style: 'full' } as const;
        const { container } = render(
            <BoxLid
                {...base}
                editionName="Club"
                photo={full}
                titleBand={false}
            />,
        );

        expect(container.querySelector('[data-slot="name-band"]')).toBeNull();
        expect(
            container.querySelector('[data-slot="text-fade"]'),
        ).not.toBeNull();

        const top = lidLayout(size, {
            photo: 'full',
            offset: -1,
            subtitle: true,
            lines: false,
        });
        const middle = lidLayout(size, {
            photo: 'full',
            offset: 0,
            subtitle: true,
            lines: false,
        });
        expect(top.title.y).toBeLessThan(middle.title.y);
    });

    it('says in Controle when a layer covers the fixed text of the lid', () => {
        const zones = lidTextZones(
            lidLayout(size, { photo: 'none', subtitle: true, lines: false }),
        );
        const title = zones[0];
        if (title === undefined) throw new Error('Title zone expected');
        const over = {
            id: 'over',
            kind: 'text' as const,
            text: 'Hoi',
            x: title.x + 10,
            y: title.y + 5,
            w: 40,
            h: 10,
        };
        const clear = { ...over, id: 'clear', x: 20, y: 14, h: 8 };
        const edition = withElements(
            { box_lid: { layers: [over, clear] } },
            { boxLid: true },
        );

        expect(layersOverLidText(edition).map((layer) => layer.id)).toEqual([
            'over',
        ]);
        const issues = runChecks(
            buildCheckInput(edition, new Map(), new Map()),
        );
        expect(
            issues.filter((issue) => issue.code === 'layer.over-text'),
        ).toMatchObject([{ elementKey: 'box_lid', field: 'layer.over' }]);
    });
});

describe('the pawn sheet (bug 32 of ronde 3)', () => {
    it('names as many pawns as the set has', () => {
        const pages = composePages('tokens', 'printer', {
            elements: {
                'pawn.06': { hidden: true },
                'pawn.07': { hidden: true },
                'pawn.08': { hidden: true },
            },
        });

        expect(pages[0]?.label).toBe('Pionnen 1 t/m 5');
        expect(pages[0]?.items.map((item) => item.elementKey)).toEqual([
            'pawn.01',
            'pawn.02',
            'pawn.03',
            'pawn.04',
            'pawn.05',
        ]);
    });
});

describe('a full photo on a space (ronde 3, UX 1)', () => {
    it('puts a dark plate behind the price, so it reads on any photo', () => {
        const { container } = render(
            <BoardSpace
                {...base}
                space={spaceAt(1)}
                photo={{ src: 'dark.jpg', style: 'full' }}
            />,
        );

        expect(
            container.querySelector('[data-slot="price-plate"]'),
        ).not.toBeNull();
    });
});
