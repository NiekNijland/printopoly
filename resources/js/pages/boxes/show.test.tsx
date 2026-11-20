import type * as InertiaReact from '@inertiajs/react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { FriendBox } from '@/lib/boxes/types';
import BoxShow from '@/pages/boxes/show';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

const page = vi.hoisted(() => ({ current: {} }));

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof InertiaReact>()),
    usePage: () => page.current,
    Head: () => null,
    Link: ({
        href,
        children,
        ...rest
    }: {
        href: string;
        children: React.ReactNode;
    }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

const box = (overrides: Partial<FriendBox> = {}): FriendBox => ({
    token: 't'.repeat(40),
    editionName: 'Zaterdagclub',
    language: 'nl',
    status: 'open',
    snapshot: {
        theme: 'classic',
        currency: 'eur',
        parts: { cards: true, pawns: false },
        elements: { 'space.01': { name: 'Molenweg' } },
    },
    limits: { name: 40, text: 200, firstName: 30, photoMegabytes: 15 },
    ...overrides,
});

describe('the friends page of Samen maken', () => {
    beforeEach(() => {
        page.current = fakePage();
        window.localStorage.clear();
    });
    afterEach(() => vi.unstubAllGlobals());

    it('shows the board and the form without any login', () => {
        renderWithI18n(<BoxShow box={box()} />);

        expect(
            screen.getByRole('heading', { name: /Help mee met Zaterdagclub/ }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Je voornaam')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Versturen' }),
        ).toBeInTheDocument();
        expect(screen.queryByText('Pionnen')).not.toBeInTheDocument();
    });

    it('says the link is closed and offers no form', () => {
        renderWithI18n(<BoxShow box={box({ status: 'closed' })} />);

        expect(screen.getByText('Deze link is gesloten')).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Versturen' }),
        ).not.toBeInTheDocument();
    });

    it('asks for the first name before sending', async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        renderWithI18n(<BoxShow box={box()} />);

        await user.type(
            screen.getByPlaceholderText(/Een naam uit jullie dorp/),
            'Kerkstraat',
        );
        await user.click(screen.getByRole('button', { name: 'Versturen' }));

        expect(screen.getByText('Vul je voornaam in.')).toBeInTheDocument();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('sends a suggestion and remembers it as the friends own', async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn((url: string) =>
            Promise.resolve(
                new Response(
                    JSON.stringify(
                        url.includes('/mine')
                            ? { contributions: { r1: 'waiting' } }
                            : { id: 'c1', receipt: 'r1' },
                    ),
                    { status: url.includes('/mine') ? 200 : 201 },
                ),
            ),
        );
        vi.stubGlobal('fetch', fetchMock);
        renderWithI18n(<BoxShow box={box()} />);

        await user.type(screen.getByLabelText('Je voornaam'), 'Sanne');
        await user.type(
            screen.getByPlaceholderText(/Een naam uit jullie dorp/),
            'Kerkstraat',
        );
        await user.click(screen.getByRole('button', { name: 'Versturen' }));

        await waitFor(() =>
            expect(
                screen.getByText(/Verstuurd. Bedankt, Sanne/),
            ).toBeInTheDocument(),
        );
        const [url, init] = fetchMock.mock.calls[0] as unknown as [
            string,
            RequestInit,
        ];
        expect(url).toBe(`/api/box/${'t'.repeat(40)}/contributions`);
        expect((init.body as FormData).get('value')).toBe('Kerkstraat');
        expect(screen.getByText('Wat jij hebt gestuurd')).toBeInTheDocument();
    });

    it('shows the server message when sending is refused', async () => {
        const user = userEvent.setup();
        vi.stubGlobal(
            'fetch',
            vi.fn(() =>
                Promise.resolve(
                    new Response(
                        JSON.stringify({
                            errors: { value: ['Links kunnen hier niet.'] },
                        }),
                        { status: 422 },
                    ),
                ),
            ),
        );
        renderWithI18n(<BoxShow box={box()} />);

        await user.type(screen.getByLabelText('Je voornaam'), 'Sanne');
        await user.type(
            screen.getByPlaceholderText(/Een naam uit jullie dorp/),
            'www.spam.nl',
        );
        await user.click(screen.getByRole('button', { name: 'Versturen' }));

        expect(
            await screen.findByText('Links kunnen hier niet.'),
        ).toBeInTheDocument();
    });
});
