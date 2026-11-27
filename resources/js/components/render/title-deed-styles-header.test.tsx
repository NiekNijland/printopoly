import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { DeedStyle } from '@/lib/render/edition-part-styles';

import { StyledDeedHeader } from './title-deed-styles-header';

const header = (style: DeedStyle, street: boolean) =>
    render(
        <StyledDeedHeader
            style={style}
            w={63}
            block={4.5}
            blockHeight={16.5}
            label="Eigendomsbewijs"
            title="Dorpsstraat"
            townText="Zwolle"
            band="#C8321F"
            onBand="#FFFFFF"
            street={street}
            bleed={3}
            seed={3}
        />,
    ).container;

describe('StyledDeedHeader', () => {
    it.each<DeedStyle>(['vintage', 'modern', 'playful'])(
        'draws the band, the label, the town and the name in %s',
        (style) => {
            const container = header(style, true);

            for (const slot of ['band', 'label', 'town', 'name']) {
                expect(
                    container.querySelector(`[data-slot="${slot}"]`),
                ).not.toBeNull();
            }
        },
    );

    it('rules the band of Vintage and hatches it only for a street', () => {
        expect(
            header('vintage', true).querySelector('[data-slot="band-rule"]'),
        ).not.toBeNull();
        expect(
            header('vintage', true).querySelectorAll('svg').length,
        ).toBeGreaterThan(
            header('vintage', false).querySelectorAll('svg').length,
        );
    });

    it('gives Speels an awning for a street and a tile for the others', () => {
        expect(
            header('playful', false).querySelector('[data-slot="label-tile"]'),
        ).not.toBeNull();
        expect(
            header('playful', true).querySelector('[data-slot="label-tile"]'),
        ).toBeNull();
    });
});
