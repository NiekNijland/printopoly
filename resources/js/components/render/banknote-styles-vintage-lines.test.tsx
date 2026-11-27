import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
    VINTAGE,
    VintageGuilloche,
    vintageCovers,
    vintageLines,
} from './banknote-styles-vintage-lines';

describe('the line work of a Vintage note', () => {
    it('keeps the net out of the oval, the banner and the cartouches', () => {
        expect(vintageCovers(VINTAGE.oval.cx, VINTAGE.oval.cy)).toBe(true);
        expect(vintageCovers(VINTAGE.banner.x + 5, VINTAGE.banner.y + 3)).toBe(
            true,
        );
        expect(vintageCovers(12, 12)).toBe(true);
        expect(vintageCovers(30, 50)).toBe(false);
    });

    it('draws the net, rosettes, rope, hatching and beads, the first two clipped to the field', () => {
        const { container } = render(
            <VintageGuilloche
                paper="#F3F0A8"
                patternInk="#112233"
                full={false}
                riso={false}
                clipId="clip-v"
            />,
        );

        expect(container.querySelector('#clip-v')).not.toBeNull();
        for (const pattern of ['net', 'rosette']) {
            expect(
                container
                    .querySelector(`[data-pattern="${pattern}"]`)
                    ?.getAttribute('clip-path'),
            ).toBe('url(#clip-v)');
        }
        expect(
            container.querySelector('[data-pattern="rope"]')?.getAttribute('d'),
        ).toBe(vintageLines().rope);
        expect(
            container.querySelector('[data-pattern="hatch"]'),
        ).not.toBeNull();
        expect(
            container
                .querySelector('[data-slot="beads"]')
                ?.getAttribute('stroke-dasharray'),
        ).toBe('0 0.85');
    });
});
