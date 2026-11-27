import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { mix } from '@/lib/render/color';
import type { DeedStyle } from '@/lib/render/edition-part-styles';
import { isOwnable, spaceAt } from '@/lib/render/standard-edition';
import { THEMES } from '@/lib/render/themes';
import { css, root } from '@/testing/render-dom';
import type { OwnableSpace } from '@/types/game';

import { creamed } from './card-look';
import { TitleDeed, type TitleDeedProps } from './title-deed';

const base = { theme: 'classic', locale: 'nl' } as const;
const theme = THEMES.classic;

const ownableAt = (position: number): OwnableSpace => {
    const space = spaceAt(position);

    if (!isOwnable(space)) {
        throw new Error(`Space ${String(position)} has no deed`);
    }

    return space;
};

const street = ownableAt(1);
const station = ownableAt(5);

const deed = (
    props: Partial<TitleDeedProps> & { deedStyle?: DeedStyle } = {},
) => {
    const { deedStyle, ...rest } = props;

    return render(
        <TitleDeed
            {...base}
            space={street}
            side="front"
            {...(deedStyle === undefined
                ? {}
                : { style: { parts: { deeds: deedStyle } } })}
            {...rest}
        />,
    ).container;
};

const slot = (container: HTMLElement, name: string) =>
    container.querySelector(`[data-slot="${name}"]`);

describe('TitleDeed', () => {
    it('names the sheet after the kind of space and the side, at card size', () => {
        const front = root(deed());
        const back = root(deed({ space: station, side: 'back' }));

        expect(front.dataset.element).toBe('deed-street-front');
        expect(back.dataset.element).toBe('deed-station-back');
        expect(front.dataset.widthMm).toBe('63');
        expect(front.dataset.heightMm).toBe('88');
    });

    it('rounds the corners without bleed and passes the bleed on', () => {
        expect(root(deed()).style.borderRadius).toBe(`${theme.cardRadiusMm}mm`);
        const bled = root(deed({ bleedMm: 3 }));

        expect(bled.dataset.bleedMm).toBe('3');
        expect(bled.style.borderRadius).toBe('0mm');
    });

    it('draws the rent table on the front and the mortgage on the back', () => {
        const front = deed();
        const back = deed({ side: 'back' });

        expect(slot(front, 'rent-table')).not.toBeNull();
        expect(slot(front, 'mortgage')).toBeNull();
        expect(slot(back, 'mortgage')).not.toBeNull();
        expect(slot(back, 'rent-table')).toBeNull();
    });

    it('passes the own name to the front and the story to the back', () => {
        expect(slot(deed({ name: 'Molenweg' }), 'name')?.textContent).toBe(
            'MOLENWEG',
        );
        expect(
            slot(deed({ side: 'back', story: 'Hier stond de molen.' }), 'story')
                ?.textContent,
        ).toBe('Hier stond de molen.');
    });

    it('draws the free layers on the back only', () => {
        const layers = [
            {
                id: 'note',
                kind: 'text',
                text: 'Van oma',
                x: 5,
                y: 5,
                w: 30,
                h: 8,
            },
        ] as const;

        expect(
            deed({ side: 'back', layers }).querySelector('[data-layer="note"]'),
        ).not.toBeNull();
        expect(
            deed({ side: 'front', layers }).querySelector(
                '[data-layer="note"]',
            ),
        ).toBeNull();
    });

    it('lays the deed on the deed paper of the theme without a deed style', () => {
        expect(root(deed()).style.background).toBe(css(theme.deedPaper));
    });

    it('lays a styled deed on the paper of its style', () => {
        expect(root(deed({ deedStyle: 'vintage' })).style.background).toBe(
            css(creamed(theme.deedPaper, 0.5)),
        );
        expect(
            root(deed({ deedStyle: 'playful', space: station })).style
                .background,
        ).toBe(css(theme.boardBackground));
    });

    it('tints a playful street with its own group colour', () => {
        expect(street).toMatchObject({ group: 'brown' });
        const sheet = root(
            render(
                <TitleDeed
                    {...base}
                    space={street}
                    side="front"
                    style={{
                        parts: { deeds: 'playful' },
                        groupColors: { brown: '#123456' },
                    }}
                />,
            ).container,
        );

        expect(sheet.style.background).toBe(
            css(mix('#123456', theme.deedPaper, 0.72)),
        );
    });
});
