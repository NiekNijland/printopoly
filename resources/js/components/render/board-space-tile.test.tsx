import { render } from '@testing-library/react';

import { PlayfulPhotoTile } from './board-space-tile';

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
