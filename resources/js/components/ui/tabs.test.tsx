import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    tabsListVariants,
    tabsTriggerVariants,
} from '@/components/ui/tabs';

type Look = 'default' | 'line' | 'segmented';

const Example = ({
    variant,
    onValueChange,
}: {
    variant?: Look | null;
    onValueChange?: (value: string) => void;
}) => (
    <Tabs defaultValue="space" onValueChange={onValueChange}>
        <TabsList aria-label="Kant" variant={variant}>
            <TabsTrigger value="space">Vak</TabsTrigger>
            <TabsTrigger value="deed">Eigendomsbewijs</TabsTrigger>
            <TabsTrigger value="off" disabled>
                Uit
            </TabsTrigger>
        </TabsList>
        <TabsContent value="space">Het vak</TabsContent>
        <TabsContent value="deed">Het bewijs</TabsContent>
    </Tabs>
);

describe('Tabs', () => {
    it('shows the panel of the chosen tab and switches with a click', async () => {
        const user = userEvent.setup();
        const onValueChange = vi.fn<(value: string) => void>();
        render(<Example onValueChange={onValueChange} />);

        expect(screen.getByRole('tab', { name: 'Vak' })).toHaveAttribute(
            'aria-selected',
            'true',
        );
        expect(screen.getByRole('tabpanel')).toHaveTextContent('Het vak');

        await user.click(screen.getByRole('tab', { name: 'Eigendomsbewijs' }));

        expect(screen.getByRole('tabpanel')).toHaveTextContent('Het bewijs');
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith('deed');
    });

    it('moves with the arrow keys and skips a disabled tab', async () => {
        const user = userEvent.setup();
        render(<Example />);

        await user.click(screen.getByRole('tab', { name: 'Vak' }));
        await user.keyboard('{ArrowRight}');

        expect(
            screen.getByRole('tab', { name: 'Eigendomsbewijs' }),
        ).toHaveFocus();

        await user.keyboard('{ArrowRight}');

        expect(screen.getByRole('tab', { name: 'Vak' })).toHaveFocus();
    });

    it('is horizontal by default and takes a vertical orientation', () => {
        const { container, rerender } = render(<Tabs />);

        expect(container.querySelector('[data-slot="tabs"]')).toHaveAttribute(
            'data-orientation',
            'horizontal',
        );

        rerender(<Tabs orientation="vertical" />);

        expect(container.querySelector('[data-slot="tabs"]')).toHaveAttribute(
            'data-orientation',
            'vertical',
        );
    });

    it.each<[Look | null | undefined, Look, string, string]>([
        [undefined, 'default', 'bg-table', 'h-10'],
        [null, 'default', 'bg-table', 'h-10'],
        ['line', 'line', 'border-b', 'h-12'],
        ['segmented', 'segmented', 'border-ink', 'h-11'],
    ])(
        'gives the %s look to the list and its triggers',
        (variant, look, listClass, triggerClass) => {
            render(<Example variant={variant} />);

            expect(screen.getByRole('tablist')).toHaveAttribute(
                'data-variant',
                look,
            );
            expect(screen.getByRole('tablist')).toHaveClass(listClass);
            expect(screen.getByRole('tab', { name: 'Vak' })).toHaveClass(
                triggerClass,
            );
        },
    );
});

describe('tab variants', () => {
    it('inks the chosen segmented trigger', () => {
        expect(tabsTriggerVariants({ variant: 'segmented' })).toContain(
            'data-[state=active]:bg-ink',
        );
        expect(tabsListVariants()).toContain('bg-table');
    });
});
