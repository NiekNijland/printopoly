import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { BoxContributionData } from '@/features/edition/boxes/types';
import { setup } from '@/features/edition/editor/testing/element-panel-setup';
import type { Edition } from '@/lib/render/edition-types';
import { renderWithI18n } from '@/testing/render';

import { ElementPanel, type ElementPanelProps } from '../element-panel';

const proposal = {
    id: 'c1',
    elementKey: 'space.01',
    firstName: 'Joost',
    field: 'name' as const,
    value: 'Jumbostraat',
    amount: null,
    open: ['name' as const],
    hasPhoto: false,
    width: null,
    height: null,
    photoUrl: null,
    createdAt: 1,
};

const friendsProps = (
    edition: Edition,
    contributions: BoxContributionData[],
    decision: Partial<
        NonNullable<ElementPanelProps['friends']>['decision']
    > = {},
): NonNullable<ElementPanelProps['friends']> => {
    return {
        contributions,
        edition,
        locale: 'nl',
        decision: {
            decide: vi.fn(() => Promise.resolve()),
            working: null,
            note: null,
            problem: null,
            clear: vi.fn(),
            ...decision,
        },
        secret: null,
        busy: false,
        photos: new Map(),
    };
};

describe('ProposalGroup', () => {
    it('lists what friends sent for this element and applies it (B128)', async () => {
        const user = userEvent.setup();
        const decide = vi.fn(() => Promise.resolve());
        const { props } = await setup('space.01');

        renderWithI18n(
            <ElementPanel
                {...props}
                friends={friendsProps(
                    props.edition,
                    [
                        proposal,
                        { ...proposal, id: 'c2', elementKey: 'space.03' },
                    ],
                    { decide },
                )}
            />,
        );

        const section = screen.getByRole('region', { name: /Van vrienden/ });
        expect(within(section).getAllByRole('listitem')).toHaveLength(1);
        expect(section).toHaveTextContent('“Jumbostraat”van Joost');
        await user.click(
            within(section).getByRole('button', { name: 'Toepassen' }),
        );

        expect(decide).toHaveBeenCalledWith(proposal, 'accept', ['name']);
    });

    it('puts two names for one space side by side and photos and amounts apart (B175)', async () => {
        const user = userEvent.setup();
        const decide = vi.fn(() => Promise.resolve());
        const { props } = await setup('space.01');
        const maya = {
            ...proposal,
            id: 'c2',
            firstName: 'Maya',
            value: 'Dorpsstraat',
            open: ['name' as const, 'photo' as const],
            hasPhoto: true,
            photoUrl: '/api/boxes/b1/contributions/c2/photo',
        };

        renderWithI18n(
            <ElementPanel
                {...props}
                friends={friendsProps(props.edition, [proposal, maya], {
                    decide,
                })}
            />,
        );

        const section = screen.getByRole('region', { name: /Van vrienden/ });
        expect(section).toHaveTextContent('2 voorstellen, kies er één');
        expect(within(section).getAllByRole('listitem')).toHaveLength(3);
        const photo = within(section)
            .getAllByRole('listitem')
            .find((item) => item.dataset.proposal === 'c2:photo');
        if (photo === undefined) {
            throw new Error('no photo proposal');
        }
        await user.click(
            within(photo).getByRole('button', {
                name: 'Niet gebruiken',
            }),
        );

        expect(decide).toHaveBeenCalledWith(maya, 'reject', ['photo']);
    });

    it('keeps "Toegepast op" with the proposal and only at its own element (bug 30)', async () => {
        const { props } = await setup('space.01');
        const note = { element: 'space.01', text: 'Toegepast op Molenweg.' };
        const { rerender } = renderWithI18n(
            <ElementPanel
                {...props}
                friends={friendsProps(props.edition, [], { note })}
            />,
        );

        const section = screen.getByRole('region', { name: /Van vrienden/ });
        expect(within(section).getByRole('status')).toHaveTextContent(
            'Toegepast op Molenweg.',
        );

        rerender(
            <ElementPanel
                {...props}
                friends={friendsProps(props.edition, [], {
                    note: { ...note, element: 'space.03' },
                })}
            />,
        );
        expect(screen.queryByText('Toegepast op Molenweg.')).toBeNull();
        expect(
            screen.queryByRole('region', { name: /Van vrienden/ }),
        ).toBeNull();
    });

    it('shows no Van vrienden without contributions', async () => {
        const { props } = await setup('space.01');

        renderWithI18n(<ElementPanel {...props} />);

        expect(screen.queryByText('Van vrienden')).toBeNull();
    });
});
