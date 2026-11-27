import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
    EngravedBorder,
    Flourish,
    borderItems,
    discItem,
    ovalItems,
    rosetteItem,
} from './card-look-engraving';

describe('the engraving of Vintage', () => {
    it('builds a border of rules, a rope and four corner squares', () => {
        const items = borderItems({
            w: 63,
            h: 88,
            inset: 2.4,
            band: 2,
            color: '#333',
            paper: '#FFF',
        });

        expect(items.length).toBeGreaterThan(3);
        expect(items.every((item) => item.d.startsWith('M'))).toBe(true);
    });

    it('draws a rosette, a disc and an oval in the given colours', () => {
        const rosette = rosetteItem({ cx: 10, cy: 10, r: 5, color: '#333' });
        const disc = discItem({
            cx: 10,
            cy: 10,
            r: 3,
            color: '#333',
            fill: '#FFF',
        });
        const oval = ovalItems({
            x: 0,
            y: 0,
            w: 20,
            h: 30,
            color: '#333',
            fill: '#FFF',
        });

        expect(rosette.stroke).toBe('#333');
        expect(disc.fill).toBe('#FFF');
        expect(oval.length).toBeGreaterThan(1);
    });

    it('lays an engraved border and a flourish', () => {
        const { container } = render(
            <>
                <EngravedBorder
                    w={63}
                    h={88}
                    inset={2.4}
                    band={2}
                    color="#333"
                    paper="#FFF"
                />
                <Flourish x={10} y={10} w={20} color="#333" />
            </>,
        );

        expect(
            container.querySelector('[data-slot="engraved-border"]'),
        ).not.toBeNull();
        expect(container.querySelectorAll('svg').length).toBe(2);
    });
});
