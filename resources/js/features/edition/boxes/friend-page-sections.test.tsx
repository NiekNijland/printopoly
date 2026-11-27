import { fireEvent, screen } from '@testing-library/react';

import { resolveEdition } from '@/lib/render/edition-resolve';
import { makeEdition } from '@/testing/edition-test-utils';
import { renderWithI18n } from '@/testing/render';

import {
    ClosedNotice,
    FirstNameField,
    FriendFooter,
    FriendHeader,
    FriendHero,
    SendPanel,
    SentList,
} from './friend-page-sections';

describe('the sections of the friends page', () => {
    it('shows the name, the lead and the first name field (B128)', () => {
        const onChange = vi.fn();
        renderWithI18n(
            <>
                <FriendHeader name="Zaterdagclub" homeHref="/nl" />
                <FriendHero
                    title="Help mee"
                    resolved={resolveEdition(makeEdition({ id: 'e1' }))}
                    nameField={
                        <FirstNameField
                            value=""
                            maxLength={30}
                            onChange={onChange}
                        />
                    }
                />
                <FriendFooter homeHref="/nl" />
            </>,
        );

        expect(
            screen.getByRole('heading', { name: 'Help mee' }),
        ).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Je voornaam'), {
            target: { value: 'Pim' },
        });
        expect(onChange).toHaveBeenCalledWith('Pim');
        expect(screen.getByLabelText('Je voornaam')).toHaveAttribute(
            'maxlength',
            '30',
        );
        expect(
            screen.getByRole('link', { name: 'Printopoly' }),
        ).toHaveAttribute('href', '/nl');
    });

    it('says a link is closed or replaced (bug 19)', () => {
        const { unmount } = renderWithI18n(<ClosedNotice replaced={false} />);
        expect(screen.getByText('Deze link is gesloten')).toBeInTheDocument();
        unmount();

        renderWithI18n(<ClosedNotice replaced />);
        expect(screen.getByText('Deze link is vervangen')).toBeInTheDocument();
    });

    it('thanks the friend above the form', () => {
        renderWithI18n(
            <SendPanel title="Help mee" thanks="Dank je, Pim!">
                <p>formulier</p>
            </SendPanel>,
        );

        expect(screen.getByRole('status')).toHaveTextContent('Dank je, Pim!');
        expect(
            screen.getByRole('region', { name: 'Help mee' }),
        ).toHaveTextContent('formulier');
    });

    it('tells the friend what became of what they sent, with the photo while it waits (B175)', () => {
        renderWithI18n(
            <SentList
                token="tok"
                sent={[
                    {
                        receipt: 'r1',
                        elementKey: 'space.01',
                        label: 'Molenweg',
                        value: 'Kerkstraat',
                        hasPhoto: true,
                        sentAt: 1,
                    },
                    {
                        receipt: 'r2',
                        elementKey: 'space.03',
                        label: 'Brink',
                        value: '',
                        hasPhoto: true,
                        sentAt: 2,
                    },
                ]}
                states={{ r1: 'waiting', r2: 'applied' }}
            />,
        );

        expect(screen.getByText('Molenweg: Kerkstraat')).toBeInTheDocument();
        expect(screen.getByText('Staat erin')).toBeInTheDocument();
        expect(document.querySelectorAll('img')).toHaveLength(1);
        expect(document.querySelector('img')).toHaveAttribute(
            'src',
            '/api/box/tok/mine/r1/photo',
        );
    });
});
