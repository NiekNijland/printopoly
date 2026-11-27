import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type * as Guilloche from '@/lib/render/banknote-guilloche';
import { ropeBand, waveNet } from '@/lib/render/banknote-guilloche';

import { NOTE_H, NOTE_W } from './banknote-styles-shared';
import { VINTAGE, VintageGuilloche } from './banknote-styles-vintage-lines';

vi.mock('@/lib/render/banknote-guilloche', async (importOriginal) => {
    const actual = await importOriginal<typeof Guilloche>();

    return { ...actual, waveNet: vi.fn(actual.waveNet) };
});

const vintageCovers = (x: number, y: number) =>
    vi.mocked(waveNet).mock.calls[0]?.[2]?.(x, y);

describe('the line work of a Vintage note', () => {
    it('keeps the net out of the oval, the banner and the cartouches', () => {
        render(
            <VintageGuilloche
                paper="#F3F0A8"
                patternInk="#112233"
                full={false}
                riso={false}
                clipId="clip-n"
            />,
        );

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
        ).toBe(
            ropeBand(
                {
                    x: VINTAGE.band,
                    y: VINTAGE.band,
                    w: NOTE_W - 2 * VINTAGE.band,
                    h: NOTE_H - 2 * VINTAGE.band,
                },
                { amp: 0.5, period: 2.4, strands: 3, corner: 1.2 },
            ),
        );
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
