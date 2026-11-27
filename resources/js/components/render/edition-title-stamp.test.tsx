import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { THEMES } from '@/lib/render/themes';

import { plateLookOf, titleFontOf, titleMarkOf } from './edition-title';
import type { TitleProps } from './edition-title-shared';
import { StampTitle } from './edition-title-stamp';

const props: TitleProps = {
    name: 'Beukerpoly',
    tagline: 'Sinds 1987',
    mode: 'name',
    photo: undefined,
    photoAspect: undefined,
    photoRotation: 0,
    photoFrame: true,
    w: 260,
    h: 110,
    unit: 1,
    withPhoto: false,
    look: plateLookOf(undefined, THEMES.classic),
    font: titleFontOf('stamp', THEMES.classic),
    mark: titleMarkOf(THEMES.classic),
    photoOnTitle: (top: number) => (
        <span data-slot="edition-photo" data-top={top} />
    ),
};
const photo = { src: 'a.jpg', width: 1200, height: 800 };

const slot = (container: HTMLElement, name: string) =>
    container.querySelector(`[data-slot="${name}"]`);

describe('StampTitle', () => {
    it('draws the name and the tagline on its plate', () => {
        const { container } = render(<StampTitle {...props} />);

        expect(
            slot(container, 'edition-plate')?.getAttribute('data-title-style'),
        ).toBe('stamp');
        expect(slot(container, 'edition-name')?.textContent).not.toBe('');
        expect(slot(container, 'edition-tagline')).not.toBeNull();
        expect(slot(container, 'edition-photo')).toBeNull();
    });

    it('leaves out an empty tagline and stands a photo on the title', () => {
        const { container } = render(
            <StampTitle
                {...props}
                tagline=" "
                mode="photo"
                photo={photo}
                withPhoto
            />,
        );

        expect(slot(container, 'edition-tagline')).toBeNull();
        expect(slot(container, 'edition-photo')).not.toBeNull();
    });
});
