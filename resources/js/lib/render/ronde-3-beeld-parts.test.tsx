import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Board } from '@/components/render/board';
import { boardPropsOf, NO_PHOTOS } from '@/components/render/board-props';
import { BoxLid } from '@/components/render/box-lid';
import { Invitation } from '@/components/render/invitation';
import { runChecks } from '@/lib/render/checks';
import { resolveEdition } from '@/lib/render/edition-resolve';
import type { Edition } from '@/lib/render/edition-types';
import { buildCheckInput } from '@/lib/render/editor-checks-input';
import { layersOverLidText } from '@/lib/render/editor-layers';
import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import { composePages } from '@/lib/render/print-composition';
import { makeEdition } from '@/testing/edition-test-utils';
import { lidLayout, lidTextZones } from './box-lid-layout';

const base = { theme: 'classic', locale: 'nl' } as const;

const withElements = (elements: Edition['elements'], parts = {}): Edition => {
    const edition = makeEdition();

    return {
        ...edition,
        parts: { ...edition.parts, ...parts },
        elements,
    };
};

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
        const clear = { ...over, id: 'clear', x: 20, y: 4, h: 8 };
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
