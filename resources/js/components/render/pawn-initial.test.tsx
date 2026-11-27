import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { PawnStyle } from '@/lib/render/edition-part-styles';

import { Initial } from './pawn-initial';

describe('Initial', () => {
    it.each<PawnStyle | undefined>([undefined, 'vintage', 'modern', 'playful'])(
        'stamps the first letter of the name in style %s',
        (look) => {
            const { container } = render(<Initial name=" ellen" look={look} />);

            expect(
                container.querySelector('[data-slot="initial"]'),
            ).not.toBeNull();
            expect(
                container.querySelector('[data-slot="initial-letter"]')
                    ?.textContent,
            ).toBe('E');
        },
    );

    it('draws no letter for an empty name', () => {
        const { container } = render(<Initial name="  " look="modern" />);

        expect(
            container.querySelector('[data-slot="initial-letter"]'),
        ).toBeNull();
    });
});
