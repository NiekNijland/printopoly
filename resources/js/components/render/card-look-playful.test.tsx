import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
    ConfettiField,
    ScallopBadge,
    Squiggle,
    WobblyTile,
    scallopDepth,
} from './card-look-playful';

describe('the look of Speels', () => {
    it('scallops about every 4.2 mm', () => {
        expect(scallopDepth(42)).toBeCloseTo(2.1);
    });

    it('draws a tile, a badge and a squiggle', () => {
        const { container } = render(
            <>
                <WobblyTile
                    x={0}
                    y={0}
                    w={30}
                    h={20}
                    radius={3}
                    seed={1}
                    fill="#FFF"
                    ink="#000"
                />
                <ScallopBadge cx={10} cy={10} r={5} fill="#FF0" ink="#000" />
                <Squiggle x={0} y={5} w={20} color="#000" />
            </>,
        );

        expect(container.querySelector('[data-slot="tile"]')).not.toBeNull();
        expect(
            container.querySelector('[data-slot="squiggle"]'),
        ).not.toBeNull();
    });

    it('throws the same confetti for the same seed', () => {
        const draw = () =>
            render(
                <ConfettiField
                    w={40}
                    h={30}
                    colors={['#F00', '#00F']}
                    seed={3}
                    count={8}
                />,
            ).container.innerHTML;

        expect(draw()).toBe(draw());
        expect(draw()).not.toBe('');
    });
});
