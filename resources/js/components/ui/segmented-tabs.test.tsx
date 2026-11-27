import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs as TabsPrimitive } from 'radix-ui';

import {
    SegmentedTabs,
    SegmentedTabsList,
    SegmentedTabsTrigger,
} from '@/components/ui/segmented-tabs';

const Example = () => {
    return (
        <SegmentedTabs defaultValue="printer">
            <SegmentedTabsList aria-label="Set">
                <SegmentedTabsTrigger value="printer">
                    Drukkerij-set
                </SegmentedTabsTrigger>
                <SegmentedTabsTrigger value="home">
                    Thuisprint-set
                </SegmentedTabsTrigger>
            </SegmentedTabsList>
            <TabsPrimitive.Content value="printer">
                Drukkerij
            </TabsPrimitive.Content>
            <TabsPrimitive.Content value="home">Thuis</TabsPrimitive.Content>
        </SegmentedTabs>
    );
};

describe('SegmentedTabs', () => {
    it('marks the chosen tab and shows its panel', () => {
        render(<Example />);

        expect(screen.getByRole('tablist', { name: 'Set' })).toBeVisible();
        expect(
            screen.getByRole('tab', { name: 'Drukkerij-set' }),
        ).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tabpanel')).toHaveTextContent('Drukkerij');
    });

    it('switches with the arrow keys', async () => {
        render(<Example />);

        await userEvent.click(
            screen.getByRole('tab', { name: 'Drukkerij-set' }),
        );
        await userEvent.keyboard('{ArrowRight}');

        expect(
            screen.getByRole('tab', { name: 'Thuisprint-set' }),
        ).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tabpanel')).toHaveTextContent('Thuis');
    });
});
