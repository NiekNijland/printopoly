import { render } from '@testing-library/react';

import {
    AwningBand,
    Confetti,
    Pill,
    PlayfulTile,
    seeded,
    wobblyRect,
} from './board-look-playful';

describe('the Speels pieces of the board', () => {
    it('gives the same random numbers for the same seed', () => {
        const a = seeded(7);
        const b = seeded(7);

        expect([a(), a()]).toEqual([b(), b()]);
        expect(seeded(8)()).not.toBe(seeded(7)());
    });

    it('draws a closed hand-drawn outline that stays the same per seed', () => {
        const path = wobblyRect(0, 0, 30, 50, 3, 1);

        expect(path.startsWith('M')).toBe(true);
        expect(path.endsWith('Z')).toBe(true);
        expect(wobblyRect(0, 0, 30, 50, 3, 1)).toBe(path);
    });

    it('draws a tile, an awning, a pill and confetti in their slots', () => {
        const { container } = render(
            <>
                <PlayfulTile w={30} h={50} fill="#fff" ink="#000" seed={1} />
                <AwningBand x={0} y={0} w={30} h={8} color="#f00" ink="#000" />
                <Pill x={0} y={0} w={20} h={6} fill="#fff" ink="#000" dashed />
                <Confetti size={60} colors={['#f00', '#0f0']} seed={2} />
            </>,
        );

        for (const name of ['tile', 'color-bar', 'pill', 'confetti']) {
            expect(
                container.querySelector(`[data-slot="${name}"]`),
            ).not.toBeNull();
        }
        expect(
            container
                .querySelector('[data-slot="pill"] rect')
                ?.getAttribute('stroke-dasharray'),
        ).toBe('1.1 0.8');
        expect(
            container.querySelector('[data-slot="confetti"]')?.children.length,
        ).toBe(12);
    });
});
