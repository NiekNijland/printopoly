import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CapArt, CarArt, PawnArt } from './corner-art';

describe('the drawings of the corners', () => {
    it('draws a cap, a car and a pawn in their boxes', () => {
        const { container } = render(
            <>
                <CapArt x={0} y={0} w={20} h={15} />
                <CarArt x={0} y={0} w={20} h={12} />
                <PawnArt x={0} y={0} size={10} />
            </>,
        );

        for (const name of ['cap', 'car', 'pawn']) {
            expect(
                container.querySelector(`[data-slot="${name}"]`),
            ).not.toBeNull();
        }
    });
});
