import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ModernArtPlate, ModernBack } from './game-card-styles-modern-back';
import type { StyledFrontProps } from './game-card-styles-shared';

const MODERN: Pick<StyledFrontProps, 'style'> = { style: 'modern' };

describe('the Modern back', () => {
    it('draws a disc on the back and a block across the art plate', () => {
        const back = render(
            <ModernBack {...MODERN} deck="chest" w={63} h={88} name="Fonds" />,
        ).container;
        const plate = render(
            <ModernArtPlate
                deck="chest"
                w={63}
                h={88}
                name="Fonds"
                edition="Zaterdagclub"
                bleed={3}
            />,
        ).container;

        expect(back.querySelector('[data-slot="disc"]')).not.toBeNull();
        expect(back.querySelector('[data-slot="edition"]')).toBeNull();
        expect(plate.querySelector('[data-slot="plate"]')).not.toBeNull();
        expect(plate.querySelector('[data-slot="edition"]')?.textContent).toBe(
            'Zaterdagclub',
        );
    });
});
