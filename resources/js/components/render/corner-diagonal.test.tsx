import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DiagonalStack, Turned, edgeMargin } from './corner-diagonal';

describe('the diagonal of a corner', () => {
    it('keeps at least 3 mm from the cut edge', () => {
        expect(edgeMargin(20)).toBe(3);
        expect(edgeMargin(100)).toBe(5);
    });

    it('turns its children around a point', () => {
        const { container } = render(
            <Turned x={10} y={10} angle={45}>
                <span>A</span>
            </Turned>,
        );

        expect(container.querySelector('[data-turned="45"]')?.textContent).toBe(
            'A',
        );
    });

    it('stacks bands on the diagonal, each in a box of its own height', () => {
        const boxes: { y: number; h: number }[] = [];
        render(
            <DiagonalStack
                bounds={{ left: 0, top: 0, right: 60, bottom: 60 }}
                gap={2}
                bands={[4, 6].map((height) => ({
                    height,
                    draw: (box) => {
                        boxes.push({ y: box.y, h: box.h });

                        return null;
                    },
                }))}
            />,
        );

        expect(boxes).toEqual([
            { y: -6, h: 4 },
            { y: 0, h: 6 },
        ]);
    });
});
