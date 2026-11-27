import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { THEMES } from '@/lib/render/themes';

import { plateLookOf, titleFontOf, titleMarkOf } from './edition-title';
import { PlateTitle } from './edition-title-plate';
import type { TitleProps } from './edition-title-shared';

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
    font: titleFontOf(undefined, THEMES.classic),
    mark: titleMarkOf(THEMES.classic),
    photoOnTitle: (top: number) => (
        <span data-slot="edition-photo" data-top={top} />
    ),
};
const photo = { src: 'a.jpg', width: 1200, height: 800 };

const slot = (container: HTMLElement, name: string) =>
    container.querySelector(`[data-slot="${name}"]`);

describe('PlateTitle', () => {
    it('draws the name and the tagline on its plate', () => {
        const { container } = render(<PlateTitle {...props} />);

        expect(
            slot(container, 'edition-plate')?.getAttribute('data-title-style'),
        ).toBe('theme');
        expect(slot(container, 'edition-name')?.textContent).not.toBe('');
        expect(slot(container, 'edition-tagline')).not.toBeNull();
        expect(slot(container, 'edition-photo')).toBeNull();
    });

    it('leaves out an empty tagline and stands a photo on the title', () => {
        const { container } = render(
            <PlateTitle
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

    it('folds the ends of a ribbon and keeps a bar straight', () => {
        const ribbon = render(
            <PlateTitle
                {...props}
                titleStyle="ribbon"
                look={plateLookOf('ribbon', THEMES.classic)}
            />,
        ).container;
        const bar = render(
            <PlateTitle
                {...props}
                titleStyle="bar"
                look={plateLookOf('bar', THEMES.classic)}
            />,
        ).container;

        expect(ribbon.querySelectorAll('polygon')).toHaveLength(2);
        expect(
            slot(bar, 'edition-plate')?.getAttribute('data-title-style'),
        ).toBe('bar');
        expect(bar.querySelectorAll('polygon')).toHaveLength(0);
    });
});
