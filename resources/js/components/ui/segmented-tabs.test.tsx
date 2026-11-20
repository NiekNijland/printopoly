import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
    SegmentedTabs,
    SegmentedTabsContent,
    SegmentedTabsList,
    SegmentedTabsTrigger,
} from '@/components/ui/segmented-tabs';

function Example() {
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
            <SegmentedTabsContent value="printer">
                Drukkerij
            </SegmentedTabsContent>
            <SegmentedTabsContent value="home">Thuis</SegmentedTabsContent>
        </SegmentedTabs>
    );
}

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
