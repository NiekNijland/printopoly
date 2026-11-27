import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { PhotoSource } from '@/lib/render/photo';

import type { StyledFrontProps } from './game-card-styles-shared';
import { VintageFront } from './game-card-styles-vintage-front';

const VINTAGE: Pick<StyledFrontProps, 'style'> = { style: 'vintage' };

const photo: PhotoSource = { src: 'a.jpg', width: 800, height: 600 };

const draw = (extra: Partial<Parameters<typeof VintageFront>[0]> = {}) =>
    render(
        <VintageFront
            {...VINTAGE}
            deck="chance"
            w={63}
            h={88}
            name="Kans"
            body="Ga naar start"
            amountText="Betaal € 15"
            lineHeight={8}
            full={false}
            bleed={0}
            {...extra}
        />,
    ).container;

const slots = (container: HTMLElement) =>
    [...container.querySelectorAll('[data-slot]')].map((node) =>
        node.getAttribute('data-slot'),
    );

describe('VintageFront', () => {
    it('engraves the border and puts the amount in a cartouche', () => {
        const container = draw();

        expect(slots(container)).toEqual(
            expect.arrayContaining([
                'engraved-border',
                'title',
                'text',
                'amount',
            ]),
        );
        expect(
            container.querySelector('[data-slot="amount"]')?.textContent,
        ).toBe('Betaal € 15');
    });

    it('frames a photo under the title and leaves out the amount without one', () => {
        const container = draw({ photo, amountText: '' });

        expect(container.querySelector('[data-slot="art"]')).not.toBeNull();
        expect(container.querySelector('[data-slot="amount"]')).toBeNull();
    });

    it('fills the card with a full photo, on a band and a panel', () => {
        const container = draw({ photo, full: true });

        expect(slots(container)).toEqual(
            expect.arrayContaining(['title-band', 'text-panel']),
        );
        expect(
            container.querySelector('[data-slot="engraved-border"]'),
        ).toBeNull();
    });
});
