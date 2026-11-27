import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CardBack } from './game-card-back';

const back = (extra: Partial<Parameters<typeof CardBack>[0]> = {}) =>
    render(
        <CardBack
            deck="chance"
            w={63}
            h={88}
            name="Kans"
            edition="Zaterdagclub"
            bleed={3}
            {...extra}
        />,
    ).container;

describe('CardBack', () => {
    it('stacks the symbol, the deck name and the edition in the theme look', () => {
        const container = back();

        expect(
            container.querySelector('[data-slot="title"]')?.textContent,
        ).toBe('Kans');
        expect(
            container.querySelector('[data-slot="edition"]')?.textContent,
        ).toBe('Zaterdagclub');
        expect(container.querySelector('[data-slot="back-art"]')).toBeNull();
    });

    it('lays a pattern over the whole back with a plate that names the deck', () => {
        const container = back({ pattern: 'dots' });

        expect(
            container.querySelector('[data-slot="back-art"]'),
        ).not.toBeNull();
        expect(container.querySelector('[data-pattern="dots"]')).not.toBeNull();
        expect(
            container.querySelector('[data-slot="title"]')?.textContent,
        ).toBe('Kans');
    });
});
