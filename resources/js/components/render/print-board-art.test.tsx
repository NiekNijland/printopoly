import { render } from '@testing-library/react';

import { resolveEdition } from '@/lib/render/edition-resolve';
import type { PageItem } from '@/lib/render/print-composition';
import { allPartsOn } from '@/lib/render/print-edition';
import { sampleEdition } from '@/lib/render/sample-edition';

import type { ArtKit } from './print-art-kit';
import {
    CentreTitleArt,
    HomeSpaceArt,
    PanelArt,
    SpaceArt,
    Window,
} from './print-board-art';

const edition = allPartsOn(sampleEdition('nl'));
const kit: ArtKit = {
    ctx: { edition, resolved: resolveEdition(edition), set: 'home' },
    photo: () => undefined,
    icon: () => undefined,
    layers: () => [],
};
const item = (id: string): PageItem => ({
    id,
    kind: 'panel',
    elementKey: null,
    label: id,
    bleed: { x: 0, y: 0, w: 40, h: 60 },
    trim: { x: 0, y: 0, w: 40, h: 60 },
});

describe('the board art of the print', () => {
    it('shows a part of a bigger artwork through a window', () => {
        const { container } = render(
            <Window width={10} height={20} x={5} y={6} background="#fff">
                <span />
            </Window>,
        );
        const inner = container.firstElementChild?.firstElementChild;

        expect(inner?.getAttribute('style')).toContain('left: -5mm');
    });

    it('draws one space and a home sticker of it', () => {
        const space = render(
            <SpaceArt kit={kit} position={1} bleedMm={0} frame />,
        ).container;
        const sticker = render(
            <HomeSpaceArt kit={kit} item={item('space.1')} />,
        ).container;

        expect(
            space.querySelector('[data-element="space-street"]'),
        ).not.toBeNull();
        expect(
            sticker.querySelector('[data-element="space-street"]'),
        ).not.toBeNull();
    });

    it('draws the whole board in a panel and the centre with its title', () => {
        const whole = render(
            <PanelArt kit={kit} item={item('board.whole')} />,
        ).container;
        const centre = render(<CentreTitleArt kit={kit} />).container;

        expect(whole.querySelector('[data-element="board"]')).not.toBeNull();
        expect(
            centre.querySelector('[data-element="board-center"]'),
        ).not.toBeNull();
    });

    it('draws nothing for a panel that is not on the board', () => {
        expect(
            render(<PanelArt kit={kit} item={item('panel.zz')} />).container
                .innerHTML,
        ).toBe('');
    });
});
