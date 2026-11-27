import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Slider } from '@/components/ui/slider';

describe('Slider', () => {
    it('has one thumb for one value that moves with the arrow keys', () => {
        const onValueChange = vi.fn<(value: number[]) => void>();
        render(
            <Slider
                defaultValue={[40]}
                max={50}
                onValueChange={onValueChange}
                thumbProps={{ 'aria-label': 'Grootte', 'data-field': 'size' }}
            />,
        );
        const thumb = screen.getByRole('slider', { name: 'Grootte' });

        expect(screen.getAllByRole('slider')).toHaveLength(1);
        expect(thumb).toHaveAttribute('aria-valuenow', '40');
        expect(thumb).toHaveAttribute('aria-valuemax', '50');
        expect(thumb).toHaveAttribute('data-field', 'size');

        fireEvent.keyDown(thumb, { key: 'ArrowRight' });

        expect(thumb).toHaveAttribute('aria-valuenow', '41');
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith([41]);
    });

    it('draws a thumb per value of a controlled range', () => {
        render(<Slider value={[10, 20, 30]} />);

        expect(
            screen
                .getAllByRole('slider')
                .map((thumb) => thumb.getAttribute('aria-valuenow')),
        ).toEqual(['10', '20', '30']);
    });

    it('draws a second, hidden thumb without a value and starts at min', () => {
        render(<Slider min={5} max={15} />);
        const [first, second] = screen.getAllByRole('slider', { hidden: true });

        expect(screen.getAllByRole('slider')).toHaveLength(1);
        expect(first).toHaveAttribute('aria-valuenow', '5');
        expect(first).toHaveAttribute('aria-valuemin', '5');
        expect(first).toHaveAttribute('aria-valuemax', '15');
        expect(second).not.toHaveAttribute('aria-valuenow');
        expect(second).not.toBeVisible();
    });

    it('runs from 0 to 100 by default and keeps its own classes', () => {
        const { container } = render(
            <Slider defaultValue={[3]} className="mine" />,
        );

        expect(screen.getByRole('slider')).toHaveAttribute(
            'aria-valuemax',
            '100',
        );
        expect(screen.getByRole('slider')).toHaveAttribute(
            'aria-valuemin',
            '0',
        );
        expect(container.querySelector('[data-slot="slider"]')).toHaveClass(
            'touch-none',
            'mine',
        );
    });
});
