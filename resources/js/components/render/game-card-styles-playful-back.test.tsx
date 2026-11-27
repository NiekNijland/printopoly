import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PlayfulArtPlate, PlayfulBack } from './game-card-styles-playful-back';
import type { StyledFrontProps } from './game-card-styles-shared';

const PLAYFUL: Pick<StyledFrontProps, 'style'> = { style: 'playful' };

describe('the Speels back', () => {
    it('names the deck on a badge and the edition on a tilted pill', () => {
        const { container } = render(
            <PlayfulBack
                {...PLAYFUL}
                deck="chance"
                w={63}
                h={88}
                name="Kans"
                edition="Zaterdagclub"
            />,
        );
        const edition = container.querySelector('[data-slot="edition"]');

        expect(
            container.querySelector('[data-slot="title"]')?.textContent,
        ).toBe('Kans');
        expect(edition?.textContent).toBe('Zaterdagclub');
        expect(edition?.closest('[style*="rotate(2deg)"]')).not.toBeNull();
    });

    it('leaves the edition off the art plate when there is none', () => {
        const { container } = render(
            <PlayfulArtPlate
                deck="chest"
                w={63}
                h={88}
                name="Fonds"
                bleed={0}
            />,
        );

        expect(
            container.querySelector('[data-slot="title"]')?.textContent,
        ).toBe('Fonds');
        expect(container.querySelector('[data-slot="edition"]')).toBeNull();
    });
});
