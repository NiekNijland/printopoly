import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { BoxContributionData } from '@/features/edition/boxes/types';
import { fakeCollect, openBox } from '@/features/edition/testing/collect';
import { sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { TogetherOverview } from './together-overview';

const town: BoxContributionData = {
    id: 'c1',
    elementKey: 'group.brown',
    firstName: 'Anna',
    field: 'town',
    value: 'Heeten',
    amount: null,
    open: ['town'],
    hasPhoto: false,
    width: null,
    height: null,
    photoUrl: null,
    createdAt: null,
};

describe('TogetherOverview', () => {
    it('lists what waits and opens the element it is for', async () => {
        const user = userEvent.setup();
        const onOpenElement = vi.fn<(key: string) => void>();
        renderWithI18n(
            <TogetherOverview
                collect={fakeCollect(openBox({ contributions: [town] }))}
                friends={undefined}
                edition={sampleEdition()}
                locale="nl"
                onOpenElement={onOpenElement}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Wacht op jou (1)' }),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Naar Molenweg' }));
        expect(onOpenElement).toHaveBeenCalledWith('space.01');
    });

    it('says a closed link brings nothing new instead of "nog niets binnen", with the counts', () => {
        renderWithI18n(
            <TogetherOverview
                collect={fakeCollect(
                    openBox({ status: 'closed', accepted: 2, rejected: 1 }),
                )}
                friends={undefined}
                edition={sampleEdition()}
                locale="nl"
                onOpenElement={() => undefined}
            />,
        );

        expect(
            screen.getByText(
                /De link is gesloten, dus er komt ook niets meer bij/,
            ),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Toegepast: 2. Geweigerd: 1.'),
        ).toBeInTheDocument();
    });

    it('shows nothing without a box', () => {
        const { container } = renderWithI18n(
            <TogetherOverview
                collect={fakeCollect()}
                friends={undefined}
                edition={sampleEdition()}
                locale="nl"
                onOpenElement={() => undefined}
            />,
        );

        expect(container).toBeEmptyDOMElement();
    });
});
