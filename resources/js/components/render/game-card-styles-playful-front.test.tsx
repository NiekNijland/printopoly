import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { PhotoSource } from '@/lib/render/photo';

import { PlayfulFront } from './game-card-styles-playful-front';
import type { StyledFrontProps } from './game-card-styles-shared';

const PLAYFUL: Pick<StyledFrontProps, 'style'> = { style: 'playful' };

const photo: PhotoSource = { src: 'a.jpg', width: 800, height: 600 };

const draw = (extra: Partial<Parameters<typeof PlayfulFront>[0]> = {}) =>
    render(
        <PlayfulFront
            {...PLAYFUL}
            deck="chest"
            w={63}
            h={88}
            name="Fonds"
            body="Je wint de loterij"
            amountText="Ontvang € 100"
            lineHeight={8}
            full={false}
            bleed={0}
            {...extra}
        />,
    ).container;

describe('PlayfulFront', () => {
    it('puts the name on a sticker and the amount on a pill', () => {
        const container = draw();

        expect(
            container.querySelector('[data-slot="title"]')?.textContent,
        ).toBe('Fonds');
        expect(
            container.querySelector('[data-slot="amount"]')?.textContent,
        ).toBe('Ontvang € 100');
    });

    it('gives a framed photo a hand-drawn edge', () => {
        const container = draw({ photo });

        expect(container.querySelector('[data-slot="art"]')).not.toBeNull();
        expect(
            container.querySelector('[data-slot="photo-edge"]'),
        ).not.toBeNull();
    });

    it('lays the text on a panel over a full photo', () => {
        const container = draw({ photo, full: true, amountText: '' });

        expect(
            container.querySelector('[data-slot="text-panel"]'),
        ).not.toBeNull();
        expect(
            container.querySelector('[data-slot="title-band"]'),
        ).not.toBeNull();
        expect(container.querySelector('[data-slot="amount"]')).toBeNull();
    });
});
