import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PATTERN_IDS, type PatternId } from '@/lib/render/patterns';

import { PatternFill } from './pattern-fill';

const fill = (
    id: PatternId,
    extra: { originX?: number; originY?: number } = {},
) =>
    render(<PatternFill id={id} w={60} h={40} color="#C8321F" {...extra} />)
        .container;

describe('PatternFill', () => {
    it('repeats one tile of 6 mm over the area through a pattern of its own', () => {
        const container = fill('dots', { originX: 2, originY: 3 });
        const svg = container.querySelector<SVGSVGElement>('svg');
        const pattern = container.querySelector('pattern');
        const area = container.querySelector('svg > rect');

        expect(svg?.dataset.pattern).toBe('dots');
        expect(svg?.getAttribute('viewBox')).toBe('0 0 60 40');
        expect(svg?.style.width).toBe('60mm');
        expect(pattern?.getAttribute('width')).toBe('6');
        expect(pattern?.getAttribute('x')).toBe('2');
        expect(pattern?.getAttribute('y')).toBe('3');
        expect(pattern?.getAttribute('patternUnits')).toBe('userSpaceOnUse');
        expect(area?.getAttribute('fill')).toBe(`url(#${pattern?.id ?? ''})`);
        expect(pattern?.id).toMatch(/^pt[a-zA-Z0-9]+$/);
    });

    it('starts the tiling at the origin without an offset', () => {
        expect(fill('grid').querySelector('pattern')?.getAttribute('x')).toBe(
            '0',
        );
    });

    it('gives every fill its own pattern id', () => {
        const { container } = render(
            <>
                <PatternFill id="dots" w={10} h={10} color="#000000" />
                <PatternFill id="dots" w={10} h={10} color="#000000" />
            </>,
        );
        const [first, second] = container.querySelectorAll('pattern');

        expect(first?.id).not.toBe(second?.id);
    });

    it('draws the shapes of each pattern in the colour', () => {
        const shapes = (id: PatternId) =>
            [...fill(id).querySelectorAll('pattern > *')].map(
                (node) => node.tagName,
            );

        expect(shapes('dots')).toEqual(['circle']);
        expect(shapes('stripes')).toEqual(['path']);
        expect(shapes('checks')).toEqual(['rect', 'rect']);
        expect(shapes('waves')).toEqual(['path']);
        expect(shapes('diamonds')).toEqual(['path']);
        expect(shapes('grid')).toEqual(['path']);
        expect(shapes('rings')).toEqual(['circle']);
        expect(shapes('confetti')).toEqual([
            'rect',
            'circle',
            'rect',
            'circle',
        ]);
    });

    it('colours the shapes with a fill or a stroke', () => {
        for (const id of PATTERN_IDS) {
            const shape = fill(id).querySelector('pattern > *');
            const paint = [
                shape?.getAttribute('fill'),
                shape?.getAttribute('stroke'),
            ];

            expect(paint).toContain('#C8321F');
        }
    });
});
