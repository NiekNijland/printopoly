import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { PhotoSource } from '@/lib/render/photo';

import { ModernFront } from './game-card-styles-modern-front';
import type { StyledFrontProps } from './game-card-styles-shared';

const MODERN: Pick<StyledFrontProps, 'style'> = { style: 'modern' };

const photo: PhotoSource = { src: 'a.jpg', width: 800, height: 600 };

const front = (extra: Partial<Parameters<typeof ModernFront>[0]> = {}) =>
    render(
        <ModernFront
            {...MODERN}
            deck="chance"
            w={63}
            h={88}
            name="Kans"
            body="Ga naar start"
            amountText="Ontvang € 50"
            lineHeight={8}
            full={false}
            bleed={3}
            {...extra}
        />,
    ).container;

describe('the Modern card', () => {
    it('sets the name in a block and the amount on a bar of ink', () => {
        const container = front();

        expect(container.querySelector('[data-slot="block"]')).not.toBeNull();
        expect(
            container.querySelector('[data-slot="amount-bar"]'),
        ).not.toBeNull();
        expect(
            container.querySelector('[data-slot="amount"]')?.textContent,
        ).toBe('Ontvang € 50');
    });

    it('turns the block into a title band over a full photo', () => {
        const container = front({ photo, full: true, amountText: '' });

        expect(
            container.querySelector('[data-slot="title-band"]'),
        ).not.toBeNull();
        expect(
            container.querySelector('[data-slot="text-panel"]'),
        ).not.toBeNull();
        expect(container.querySelector('[data-slot="amount-bar"]')).toBeNull();
    });
});
