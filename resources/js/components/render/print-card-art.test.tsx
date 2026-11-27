import { render } from '@testing-library/react';

import { resolveEdition } from '@/lib/render/edition-resolve';
import { allPartsOn } from '@/lib/render/print-edition';
import { sampleEdition } from '@/lib/render/sample-edition';

import type { ArtKit } from './print-art-kit';
import { CardArt } from './print-card-art';

const edition = allPartsOn(sampleEdition('nl'));
const kit: ArtKit = {
    ctx: { edition, resolved: resolveEdition(edition), set: 'printer' },
    photo: () => undefined,
    icon: () => undefined,
    layers: () => [],
};

const draw = (elementKey: string, side: 'front' | 'back') =>
    render(
        <CardArt kit={kit} elementKey={elementKey} side={side} bleedMm={3} />,
    ).container;

describe('CardArt', () => {
    it('draws a deed, a deck card and the house rules card', () => {
        expect(draw('deed.01', 'front').innerHTML).not.toBe('');
        expect(draw('card.chance.01', 'back').innerHTML).not.toBe('');
        expect(draw('house_rules', 'front').innerHTML).not.toBe('');
    });

    it('gives the house rules card a plain back of paper', () => {
        const back = draw('house_rules', 'back').firstElementChild;

        expect(back?.tagName).toBe('DIV');
        expect(back?.children).toHaveLength(0);
    });

    it('draws nothing for a key that is no card', () => {
        expect(draw('space.1', 'front').innerHTML).toBe('');
    });
});
