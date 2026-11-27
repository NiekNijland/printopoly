import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { alignmentTargets } from '@/lib/render/print-composition';

import { AlignmentArt } from './print-alignment-art';

describe('AlignmentArt', () => {
    it('draws the outlines of eight cards and a crosshair with a circle on five of them', () => {
        const { container } = render(<AlignmentArt side="front" locale="nl" />);
        const svg = container.querySelector('svg');
        const targets = container.querySelectorAll('[data-target]');

        expect(container.querySelector('[data-alignment]')).toHaveAttribute(
            'data-alignment',
            'front',
        );
        expect(svg?.getAttribute('viewBox')).toBe('0 0 210 297');
        expect(svg?.querySelectorAll(':scope > rect')).toHaveLength(8);
        expect(targets).toHaveLength(5);
        expect(targets[0]?.querySelectorAll('line')).toHaveLength(2);
        expect(targets[0]?.querySelector('circle')?.getAttribute('r')).toBe(
            '4',
        );
    });

    it('centres each crosshair on its target', () => {
        const { container } = render(<AlignmentArt side="front" locale="nl" />);
        const [point] = alignmentTargets('front');
        const arm = container.querySelector('[data-target] line');

        expect(Number(arm?.getAttribute('x1'))).toBeCloseTo(
            (point?.x ?? 0) - 12,
            6,
        );
        expect(Number(arm?.getAttribute('y1'))).toBeCloseTo(point?.y ?? 0, 6);
    });

    it('explains the front in Dutch in the slot without an outline', () => {
        render(<AlignmentArt side="front" locale="nl" />);

        expect(screen.getByText('Uitlijntest, voorkant')).toBeInTheDocument();
        expect(screen.getByText('Bovenkant')).toBeInTheDocument();
        expect(
            screen.getByText(/elk kruis op de voorkant valt op het kruis/),
        ).toBeInTheDocument();
    });

    it('puts millimetre scales on the crosshairs of the back, in English', () => {
        const { container } = render(<AlignmentArt side="back" locale="en" />);
        const target = container.querySelector('[data-target]');

        expect(screen.getByText('Alignment test, back')).toBeInTheDocument();
        expect(screen.getByText('Top')).toBeInTheDocument();
        expect(target?.querySelector('circle')).toBeNull();
        expect(target?.querySelectorAll('line')).toHaveLength(2 + 22);
        expect(
            [...(target?.querySelectorAll('text') ?? [])].map(
                (node) => node.textContent,
            ),
        ).toEqual(['5', '5', '5', '5']);
    });

    it('makes the ticks at 0 and 5 mm longer', () => {
        const { container } = render(<AlignmentArt side="back" locale="nl" />);
        const ticks = [...container.querySelectorAll('[data-target] g line')];
        const lengths = ticks
            .slice(0, 22)
            .filter((_, index) => index % 2 === 0)
            .map(
                (line) =>
                    Number(line.getAttribute('y2')) -
                    Number(line.getAttribute('y1')),
            );

        expect(lengths.map((length) => Number(length.toFixed(1)))).toEqual([
            4.8, 2.4, 2.4, 2.4, 2.4, 4.8, 2.4, 2.4, 2.4, 2.4, 4.8,
        ]);
    });
});
