import { render } from '@testing-library/react';

import { StepArt } from '@/features/landing/step-art';

const itemsOf = (container: HTMLElement): HTMLElement[] => [
    ...container.querySelectorAll<HTMLElement>('[data-settle]'),
];

describe('StepArt', () => {
    it.each([
        [1, 4],
        [2, 3],
        [3, 2],
        [4, 4],
    ] as const)(
        'lays the pieces of step %i on the table: %i of them',
        (step, count) => {
            const { container } = render(<StepArt step={step} />);

            expect(container.firstElementChild).toHaveClass(
                'overflow-hidden',
                'rounded-control',
                'border-2',
                'border-ink',
                'bg-paper',
            );
            expect(itemsOf(container)).toHaveLength(count);
        },
    );

    it('turns and places each piece as drawn', () => {
        const { container } = render(<StepArt step={1} />);

        expect(
            itemsOf(container).map((item) => [
                item.style.left,
                item.style.top,
                item.style.getPropertyValue('--rot'),
            ]),
        ).toEqual([
            ['22px', '26px', '-4deg'],
            ['140px', '14px', '7deg'],
            ['190px', '30px', '-5deg'],
            ['134px', '112px', '3deg'],
        ]);
    });

    it('puts the warning sign above the space in step 3', () => {
        const { container, getByText } = render(<StepArt step={3} />);

        const sign = getByText('!');
        expect(sign).toHaveClass('bg-warning', 'font-display');
        expect(itemsOf(container)[1]?.style.zIndex).toBe('2');
    });
});
