import { render } from '@testing-library/react';

import type { BoxLidStyle } from '@/lib/render/edition-part-styles';
import type { PhotoSource } from '@/lib/render/photo';
import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import { THEMES } from '@/lib/render/themes';
import { css, root } from '@/testing/render-dom';

import { BoxLid, type BoxLidProps } from './box-lid';

const photo: PhotoSource = { src: 'lid.jpg', width: 1200, height: 900 };
const fullPhoto: PhotoSource = { ...photo, style: 'full' };

const lid = (extra: Partial<BoxLidProps> = {}, look?: BoxLidStyle) =>
    render(
        <BoxLid
            theme="classic"
            locale="nl"
            editionName="Ons Dorp"
            {...(look === undefined
                ? {}
                : { style: { parts: { boxLid: look } } })}
            {...extra}
        />,
    ).container;

const slot = (container: HTMLElement, name: string) =>
    container.querySelector<HTMLElement>(`[data-slot="${name}"]`);

describe('BoxLid', () => {
    it('is a sheet at the lid size of the board profile in the board colour', () => {
        const sheet = root(lid());

        expect(sheet.getAttribute('data-element')).toBe('box-lid');
        expect(sheet.getAttribute('data-width-mm')).toBe(
            String(DEFAULT_BOARD_PROFILE.boxLid.w),
        );
        expect(sheet.getAttribute('data-height-mm')).toBe(
            String(DEFAULT_BOARD_PROFILE.boxLid.h),
        );
        expect(sheet.style.background).toBe(
            css(THEMES.classic.boardBackground),
        );
        expect(
            root(
                lid({
                    profile: {
                        ...DEFAULT_BOARD_PROFILE,
                        boxLid: { w: 300, h: 200 },
                    },
                }),
            ).getAttribute('data-width-mm'),
        ).toBe('300');
    });

    it('shows the name plate and the board picture without an own photo', () => {
        const container = lid();

        expect(slot(container, 'lid-plate')).not.toBeNull();
        expect(slot(container, 'lid-board')).not.toBeNull();
        expect(container.querySelector('[data-photo]')).toBeNull();
    });

    it('leaves the board picture out when asked', () => {
        const container = lid({ boardPicture: false });

        expect(slot(container, 'lid-plate')).not.toBeNull();
        expect(slot(container, 'lid-board')).toBeNull();
    });

    it('puts the logo in the place of the board picture', () => {
        const container = lid({ photo, logo: true });

        expect(slot(container, 'lid-board')).toBeNull();
        expect(slot(container, 'lid-plate')).not.toBeNull();
        expect(container.querySelector('img')?.getAttribute('src')).toBe(
            'lid.jpg',
        );
    });
});

describe('BoxLid with an own photo', () => {
    it('frames an own photo above the name instead of the board', () => {
        const container = lid({ photo });

        expect(slot(container, 'lid-board')).toBeNull();
        expect(slot(container, 'lid-plate')).toBeNull();
        expect(slot(container, 'name-band')).toBeNull();
        expect(
            container.querySelectorAll('[data-photo="filled"]'),
        ).toHaveLength(1);
        expect(slot(container, 'edition-name')?.textContent).toBe('Ons Dorp');
        expect(container.querySelector('[data-frame]')).not.toBeNull();
    });

    it('lays the name on a light band over a photo over the whole lid', () => {
        const container = lid({ photo: fullPhoto });

        expect(slot(container, 'name-band')).not.toBeNull();
        expect(slot(container, 'text-fade')).toBeNull();
        expect(slot(container, 'lid-plate')).toBeNull();
    });

    it('sets the name in white on a dark fade when the band is off', () => {
        const container = lid({ photo: fullPhoto, titleBand: false });
        const name = slot(container, 'edition-name')?.querySelector('div');

        expect(slot(container, 'text-fade')).not.toBeNull();
        expect(slot(container, 'name-band')).toBeNull();
        expect(name?.style.color).toBe(css('#FFFFFF'));
    });

    it('draws the free layers over the lid', () => {
        const container = lid({
            layers: [
                {
                    id: 'l1',
                    kind: 'text',
                    text: 'Kerst 2026',
                    x: 5,
                    y: 5,
                    w: 50,
                    h: 8,
                },
            ],
        });

        expect(container.querySelector('[data-layer="l1"]')?.textContent).toBe(
            'Kerst 2026',
        );
    });
});

describe('BoxLid with an own framed photo, per lid style', () => {
    it('lays cream paper and an engraved mat in Vintage', () => {
        const container = lid({ photo }, 'vintage');

        expect(slot(container, 'lid-paper')).not.toBeNull();
        expect(slot(container, 'lid-border')).not.toBeNull();
        expect(slot(container, 'photo-edge')).not.toBeNull();
    });

    it('adds the street band and an offset block behind the photo in Modern', () => {
        const container = lid({ photo }, 'modern');

        expect(slot(container, 'lid-strip')).not.toBeNull();
        expect(slot(container, 'offset-block')).not.toBeNull();
        expect(slot(container, 'lid-discs')).not.toBeNull();
        expect(slot(container, 'photo-edge')).toBeNull();
    });

    it('rounds the photo of Speels and tapes it on the doily', () => {
        const container = lid({ photo }, 'playful');
        const rounded = container.querySelector(
            '[data-photo="filled"]',
        )?.parentElement;

        expect(rounded?.style.borderRadius).toBe('6mm');
        expect(rounded?.style.overflow).toBe('hidden');
        expect(slot(container, 'lid-doily')).not.toBeNull();
        expect(slot(container, 'tape')).not.toBeNull();
    });

    it('keeps the photo square-cornered and the ornate line of the theme without a style', () => {
        const container = lid({ photo });
        const parent = container.querySelector(
            '[data-photo="filled"]',
        )?.parentElement;

        expect(parent?.style.borderRadius).toBe('');
        expect(slot(container, 'lid-strip')).toBeNull();
        expect(slot(container, 'lid-paper')).toBeNull();
    });
});
