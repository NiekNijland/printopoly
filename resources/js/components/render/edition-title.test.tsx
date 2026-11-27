import { render } from '@testing-library/react';

import type { TitleStyle } from '@/lib/render/edition-types';
import type { PhotoSource } from '@/lib/render/photo';
import { THEMES, THEME_IDS } from '@/lib/render/themes';
import { css } from '@/testing/render-dom';

import {
    EditionTitle,
    FRAME_INSET,
    FramedPhoto,
    plateLookOf,
    titleFontOf,
    titleMarkOf,
    type EditionTitleProps,
} from './edition-title';
import { Sheet } from './sheet';

const photo: PhotoSource = { src: 'face.jpg', width: 1200, height: 900 };

const props: EditionTitleProps = {
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
};

const draw = (extra: Partial<EditionTitleProps> = {}) =>
    render(<EditionTitle {...props} {...extra} />).container;

const slot = (container: HTMLElement, name: string) =>
    container.querySelector<HTMLElement>(`[data-slot="${name}"]`);

describe('plateLookOf', () => {
    it('gives every theme its own plate and Klassiek its ribbon as the plate', () => {
        expect(plateLookOf(undefined, THEMES.classic).fill).toBe('#FFD84D');
        expect(plateLookOf(undefined, THEMES.strak).tilt).toBe(0);
        expect(plateLookOf('ribbon', THEMES.classic)).toBe(
            plateLookOf(undefined, THEMES.classic),
        );
    });

    it('folds a ribbon with flaps and a tilt in every theme', () => {
        for (const id of THEME_IDS) {
            const ribbon = plateLookOf('ribbon', THEMES[id]);

            expect(ribbon.flap).toBeDefined();
            expect(ribbon.tilt).toBe(-2.5);
        }

        expect(plateLookOf('ribbon', THEMES.strak).fill).toBe(
            plateLookOf(undefined, THEMES.strak).fill,
        );
        expect(plateLookOf(undefined, THEMES.strak).flap).toBeUndefined();
    });

    it('builds a straight bar in the strong ink of the theme with paper letters', () => {
        const theme = THEMES.riso;
        const bar = plateLookOf('bar', theme);

        expect(bar.fill).toBe(titleMarkOf(theme));
        expect(bar.text).toBe('#FFFDF7');
        expect(bar.edge).toBe(theme.ink);
        expect(bar.pillFill).toBe(theme.paper);
        expect(bar.tilt).toBe(0);
        expect(bar.radius).toBe(0);
    });

    it('takes the plate of the theme for styles without a plate of their own', () => {
        const styles: TitleStyle[] = ['stamp', 'script', 'plain'];

        for (const style of styles) {
            expect(plateLookOf(style, THEMES.gala)).toBe(
                plateLookOf(undefined, THEMES.gala),
            );
        }
    });
});

describe('titleMarkOf', () => {
    it('is the strong ink of each theme', () => {
        expect(titleMarkOf(THEMES.classic)).toBe('#C8321F');
        expect(titleMarkOf(THEMES.riso)).toBe('#E6007E');
        expect(titleMarkOf(THEMES.strak)).toBe('#1B1F24');
        expect(titleMarkOf(THEMES.gala)).toBe('#8C6A22');
    });
});

describe('titleFontOf', () => {
    const theme = THEMES.gala;

    it('sets a bar and a stamp in the heading font in capitals', () => {
        for (const style of ['bar', 'stamp'] satisfies TitleStyle[]) {
            expect(titleFontOf(style, theme)).toEqual({
                family: theme.headingFont,
                weight: theme.headingWeight,
                scale: 1,
                upper: true,
            });
        }
    });

    it('sets a script in Great Vibes, larger and as typed', () => {
        const font = titleFontOf('script', theme);

        expect(font.family).toContain('Great Vibes');
        expect(font.weight).toBe(400);
        expect(font.scale).toBe(1.5);
        expect(font.upper).toBe(false);
    });

    it('keeps the title font of the theme for the plate, the ribbon and plain', () => {
        const expected = {
            family: theme.titleFont,
            weight: theme.titleWeight,
            scale: theme.titleScale,
            upper: false,
        };

        expect(titleFontOf(undefined, theme)).toEqual(expected);
        expect(titleFontOf('ribbon', theme)).toEqual(expected);
        expect(titleFontOf('plain', theme)).toEqual(expected);
    });
});

describe('EditionTitle', () => {
    it.each([
        [undefined, 'theme'],
        ['ribbon', 'ribbon'],
        ['bar', 'bar'],
        ['stamp', 'stamp'],
        ['script', 'script'],
        ['plain', 'plain'],
    ] satisfies [TitleStyle | undefined, string][])(
        'draws title style %s as the %s title',
        (titleStyle, shown) => {
            const container = draw(
                titleStyle === undefined ? {} : { titleStyle },
            );

            expect(
                slot(container, 'edition-plate')?.getAttribute(
                    'data-title-style',
                ),
            ).toBe(shown);
            expect(slot(container, 'edition-name')).not.toBeNull();
        },
    );
});

describe('EditionTitle with a photo', () => {
    it('stands the photo on the title only in photo mode with a photo', () => {
        expect(
            slot(draw({ mode: 'photo', photo }), 'edition-photo'),
        ).not.toBeNull();
        expect(slot(draw({ mode: 'photo' }), 'edition-photo')).toBeNull();
        expect(slot(draw({ mode: 'logo', photo }), 'edition-photo')).toBeNull();
    });

    it('sizes the photo on a title without a plate to 62 mm high in its frame', () => {
        const box = slot(
            draw({ titleStyle: 'script', mode: 'photo', photo }),
            'edition-photo',
        );
        const w = 62 * (4 / 3);

        expect(box?.style.width).toBe(
            `${String(Math.round((w + 2 * FRAME_INSET) * 1000) / 1000)}mm`,
        );
        expect(box?.style.height).toBe(`${String(62 + 2 * FRAME_INSET)}mm`);
    });

    it('turns the photo on a title without a plate when it is placed a quarter turn', () => {
        const box = slot(
            draw({
                titleStyle: 'plain',
                mode: 'photo',
                photo,
                photoRotation: 90,
                photoFrame: false,
            }),
            'edition-photo',
        );

        expect(box?.style.width).toBe('46.5mm');
        expect(box?.style.height).toBe('62mm');
        expect(box?.style.left).toBe(`${String((260 - 46.5) / 2)}mm`);
    });

    it('uses the strong ink of the theme from the render context for a stamp', () => {
        const { container } = render(
            <Sheet
                element="centre"
                theme="riso"
                locale="nl"
                widthMm={300}
                heightMm={150}
                background="#fff"
            >
                <EditionTitle {...props} titleStyle="stamp" />
            </Sheet>,
        );

        expect(container.innerHTML).toContain(titleMarkOf(THEMES.riso));
        expect(container.innerHTML).not.toContain(titleMarkOf(THEMES.classic));
    });
});

describe('FramedPhoto', () => {
    const base = {
        x: 10,
        y: 20,
        w: 80,
        h: 60,
        photo,
        inset: 2,
        unit: 1,
    };

    it('lays a paper frame with an ink edge around the photo, leaning against the plate', () => {
        const { container } = render(<FramedPhoto {...base} frame tilt={2} />);
        const box = slot(container, 'edition-photo');

        expect(box?.style.left).toBe('8mm');
        expect(box?.style.top).toBe('18mm');
        expect(box?.style.width).toBe('84mm');
        expect(box?.style.background).toBe(css('#FFFDF7'));
        expect(box?.style.border).toContain('1.3mm');
        expect(box?.style.borderRadius).toBe('1.5mm');
        expect(box?.style.transform).toBe('rotate(-2.6deg)');
        expect(box?.querySelector('img')?.getAttribute('src')).toBe('face.jpg');
    });

    it('stands straight on a straight plate', () => {
        const { container } = render(<FramedPhoto {...base} frame tilt={0} />);

        expect(slot(container, 'edition-photo')?.style.transform).toBe('');
    });

    it('draws a cut-out photo without paper, edge or tilt', () => {
        const { container } = render(
            <FramedPhoto {...base} frame={false} tilt={2} />,
        );
        const box = slot(container, 'edition-photo');

        expect(box?.style.background).toBe('');
        expect(box?.style.border).toBe('');
        expect(box?.style.transform).toBe('');
    });
});
