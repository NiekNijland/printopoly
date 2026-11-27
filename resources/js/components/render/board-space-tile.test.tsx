import { render } from '@testing-library/react';

import { PlayfulPhotoTile, SpaceUnderlay } from './board-space-tile';

describe('PlayfulPhotoTile', () => {
    it('clips its content to the tile and draws the hand-drawn edge on top', () => {
        const { container } = render(
            <PlayfulPhotoTile w={30} h={50} ink="#111" seed={3}>
                <span data-testid="content" />
            </PlayfulPhotoTile>,
        );
        const tile = container.querySelector('[data-slot="tile"]');

        expect(
            container.querySelector('[data-testid="content"]'),
        ).not.toBeNull();
        expect(tile?.querySelector('path')?.getAttribute('fill')).toBe('none');
        expect(container.firstElementChild?.getAttribute('style')).toContain(
            'overflow: hidden',
        );
    });
});

describe('SpaceUnderlay', () => {
    const draw = (look: 'playful' | 'vintage' | undefined, full: boolean) =>
        render(
            <SpaceUnderlay
                look={look}
                w={30}
                h={50}
                background="#ffffff"
                position={3}
                corner
                full={full}
            />,
        ).container;

    it('lays a tile under a Speels space and rules under a Vintage one', () => {
        expect(
            draw('playful', false).querySelector('[data-slot="tile"]'),
        ).not.toBeNull();
        expect(
            draw('vintage', false).querySelectorAll(
                '[data-slot="vintage-rules"] path',
            ),
        ).toHaveLength(4);
    });

    it('draws nothing under the theme look or under a full Vintage photo', () => {
        expect(draw(undefined, false).innerHTML).toBe('');
        expect(draw('vintage', true).innerHTML).toBe('');
    });
});
