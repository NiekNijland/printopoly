import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { deedsFor } from '@/lib/render/standard-edition';
import { THEMES } from '@/lib/render/themes';

import { DeedBlock, blockColors, iconOf, townLabel } from './title-deed-parts';

const street = deedsFor().find((space) => space.type === 'street');
const station = deedsFor().find((space) => space.type === 'station');
const utilities = deedsFor().filter((space) => space.type === 'utility');

describe('the parts of a title deed', () => {
    it('prints a town on a street only, and never an empty one', () => {
        if (street === undefined || station === undefined) {
            throw new Error('the standard edition has streets and stations');
        }

        expect(townLabel(street, ' Zwolle ')).toBe('Zwolle');
        expect(townLabel(street, '  ')).toBeUndefined();
        expect(townLabel(station, 'Zwolle')).toBeUndefined();
    });

    it('draws a train on a station and a bulb or a tap on a utility', () => {
        expect(station === undefined ? null : iconOf(station)).toBe('train');
        expect(utilities.map((space) => iconOf(space)).sort()).toEqual([
            'bulb',
            'tap',
        ]);
    });

    it('paints a street block in its group colour and the others on paper', () => {
        if (street === undefined || station === undefined) {
            throw new Error('the standard edition has streets and stations');
        }
        const theme = THEMES.classic;

        expect(blockColors(station, theme, undefined).band).toBe(
            theme.deedPaper,
        );
        expect(
            blockColors(street, theme, {
                groupColors: { [street.group]: '#123456' },
            }).band,
        ).toBe('#123456');
    });

    it('sets the block in the theme look or in a deed style', () => {
        const block = (deedStyle: 'modern' | undefined) =>
            render(
                <DeedBlock
                    deedStyle={deedStyle}
                    w={63}
                    label="Eigendomsbewijs"
                    title="Dorpsstraat"
                    townText="Zwolle"
                    band="#C8321F"
                    onBand="#FFFFFF"
                    street
                    bleed={0}
                    seed={3}
                />,
            ).container;

        expect(
            block(undefined).querySelector('[data-slot="name"]')?.textContent,
        ).toBe('DORPSSTRAAT');
        expect(
            block('modern').querySelector('[data-slot="name"]')?.textContent,
        ).toBe('Dorpsstraat');
        expect(
            block('modern').querySelector('[data-slot="town"]')?.textContent,
        ).toBe('Zwolle');
    });
});
