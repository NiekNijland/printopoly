import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { StyledFrontProps } from './game-card-styles-shared';
import { VintageArtPlate, VintageBack } from './game-card-styles-vintage-back';

const VINTAGE: Pick<StyledFrontProps, 'style'> = { style: 'vintage' };

describe('the Vintage back', () => {
    it('engraves an oval with the deck name and the edition', () => {
        const { container } = render(
            <VintageBack
                {...VINTAGE}
                deck="chest"
                w={63}
                h={88}
                name="Fonds"
                edition="Zaterdagclub"
            />,
        );

        expect(
            container.querySelector('[data-slot="engraved-border"]'),
        ).not.toBeNull();
        expect(
            container.querySelector('[data-slot="title"]')?.textContent,
        ).toBe('Fonds');
        expect(
            container.querySelector('[data-slot="edition"]')?.textContent,
        ).toBe('Zaterdagclub');
    });

    it('leaves out an empty edition on the art plate', () => {
        const { container } = render(
            <VintageArtPlate
                deck="chance"
                w={63}
                h={88}
                name="Kans"
                edition="  "
                bleed={0}
            />,
        );

        expect(
            container.querySelector('[data-slot="title"]')?.textContent,
        ).toBe('Kans');
        expect(container.querySelector('[data-slot="edition"]')).toBeNull();
    });
});
