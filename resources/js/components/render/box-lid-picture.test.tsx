import { render } from '@testing-library/react';

import { lidLayout } from '@/lib/render/box-lid-layout';
import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';

import { PictureLid } from './box-lid-picture';
import { lidWords } from './box-lid-text';

const layout = lidLayout(
    { w: 200, h: 260 },
    { photo: 'none', offset: undefined, subtitle: true, lines: false },
);

const draw = (boardPicture: boolean) => {
    if (layout.picture === undefined) {
        throw new Error('no picture');
    }

    return render(
        <PictureLid
            w={200}
            h={260}
            bleed={3}
            look={undefined}
            picture={layout.picture}
            layout={layout}
            words={lidWords(260, 'Voor 2 tot 6', undefined, 'nl')}
            editionName="Ons Dorp"
            mode="none"
            profile={DEFAULT_BOARD_PROFILE}
            boardPicture={boardPicture}
        />,
    ).container;
};

describe('PictureLid', () => {
    it('draws the name plate, the board picture and the subtitle', () => {
        const container = draw(true);

        expect(
            container.querySelector('[data-slot="lid-plate"]'),
        ).not.toBeNull();
        expect(
            container.querySelector('[data-slot="lid-board"]'),
        ).not.toBeNull();
        expect(
            container.querySelector('[data-slot="subtitle"]')?.textContent,
        ).toBe('Voor 2 tot 6');
    });

    it('leaves the board picture out when asked', () => {
        expect(draw(false).querySelector('[data-slot="lid-board"]')).toBeNull();
    });
});
