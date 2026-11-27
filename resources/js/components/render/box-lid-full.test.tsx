import { render } from '@testing-library/react';

import { FullPhotoLid } from './box-lid-full';

const draw = (onPhoto: boolean) =>
    render(
        <FullPhotoLid
            w={200}
            h={260}
            bleed={3}
            photo={{ src: 'a.jpg', style: 'full' }}
            look={undefined}
            block={{ y: 100, h: 40 }}
            onPhoto={onPhoto}
            text={<span data-testid="text" />}
        />,
    ).container;

describe('FullPhotoLid', () => {
    it('puts the text on a light band over the photo', () => {
        const container = draw(false);

        expect(
            container.querySelector('[data-slot="name-band"]'),
        ).not.toBeNull();
        expect(container.querySelector('[data-testid="text"]')).not.toBeNull();
    });

    it('puts the text on a dark fade when the band is off', () => {
        const container = draw(true);

        expect(
            container.querySelector('[data-slot="text-fade"]'),
        ).not.toBeNull();
        expect(container.querySelector('[data-slot="name-band"]')).toBeNull();
    });
});
