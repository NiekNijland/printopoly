import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { FriendBox } from '@/features/edition/boxes/types';
import BoxShow from '@/pages/boxes/show';
import { defined } from '@/testing/defined';
import { formOf, requestOf, stubFetch } from '@/testing/fetch';
import { renderWithI18n } from '@/testing/render';

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
        window.localStorage.clear();
    });

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

    it('names the places after the colour they have, never by key (bugs 27 and 28)', async () => {
        const user = userEvent.setup();
        renderWithI18n(
            <BoxShow
                box={box({
                    snapshot: { ...box().snapshot, theme: 'riso' },
                })}
            />,
        );

        await user.click(screen.getByRole('tab', { name: 'Plaatsen' }));

        // Riso prints the brown group purple, so it is called purple here too.
        expect(
            screen.getByRole('button', { name: 'Paars', pressed: true }),
        ).toBeInTheDocument();
        expect(screen.queryByText(/group\./)).not.toBeInTheDocument();
        expect(screen.getByText('Nu: nog geen naam')).toBeInTheDocument();
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
        const fetchMock = stubFetch((url: string) =>
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
        const { url, init } = requestOf(fetchMock);
        expect(url).toBe(`/api/box/${'t'.repeat(40)}/contributions`);
        expect(formOf(init).get('value')).toBe('Kerkstraat');
        expect(screen.getByText('Wat jij hebt gestuurd')).toBeInTheDocument();
    });

    it('lets a friend add to the extra cards of the edition too (B135)', async () => {
        const user = userEvent.setup();
        const fetchMock = stubFetch(() =>
            Promise.resolve(
                new Response(JSON.stringify({ id: 'c1', receipt: 'r1' }), {
                    status: 201,
                }),
            ),
        );
        renderWithI18n(
            <BoxShow
                box={box({
                    snapshot: {
                        theme: 'classic',
                        currency: 'eur',
                        parts: { cards: true, pawns: false },
                        elements: {
                            'card.chance.17': {
                                added: true,
                                text: 'Je wint de pubquiz.',
                            },
                            'card.chest.18': { added: true },
                        },
                    },
                })}
            />,
        );

        await user.click(screen.getByRole('tab', { name: 'Kaarten' }));

        // 16 standard cards and the extra ones, marked as extra.
        expect(
            screen.getByRole('button', { name: /Je wint de pubquiz\. Extra/ }),
        ).toBeInTheDocument();
        expect(screen.getAllByText('Extra')).toHaveLength(2);
        // 33 cards and a "Nieuwe kaart voorstellen" per deck (B175).
        expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(
            35,
        );

        await user.click(
            screen.getByRole('button', {
                name: 'Nieuwe kaart, nog zonder tekst Extra',
            }),
        );
        expect(
            screen.getByText('Nu: Nieuwe kaart, nog zonder tekst'),
        ).toBeInTheDocument();
        await user.type(screen.getByLabelText('Je voornaam'), 'Sanne');
        await user.type(
            screen.getByPlaceholderText(/Een nieuwe kaarttekst/),
            'Oma trakteert.',
        );
        await user.click(screen.getByRole('button', { name: 'Versturen' }));

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalled();
        });
        expect(formOf(requestOf(fetchMock).init).get('elementKey')).toBe(
            'card.chest.18',
        );
    });

    it('says an old link was replaced and offers no form (bug 19)', () => {
        renderWithI18n(
            <BoxShow
                box={box({
                    token: '',
                    status: 'replaced',
                    snapshot: {
                        theme: 'classic',
                        currency: null,
                        parts: { cards: false, pawns: false },
                        elements: {},
                    },
                })}
            />,
        );

        expect(screen.getByText('Deze link is vervangen')).toBeInTheDocument();
        expect(
            screen.getByText(/Vraag in de groep om de nieuwe/),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Versturen' }),
        ).not.toBeInTheDocument();
    });

    it('greys out the spaces without a photo or own name and never picks them (bug 18)', async () => {
        const user = userEvent.setup();
        renderWithI18n(<BoxShow box={box()} />);

        const chest = defined(
            screen.getAllByRole('option', {
                name: /Algemeen Fonds/,
            })[0],
        );
        expect(chest).toHaveAttribute('aria-disabled', 'true');
        await user.click(chest);
        expect(chest).toHaveAttribute('aria-selected', 'false');
        expect(
            screen.getByRole('option', { name: /Molenweg/ }),
        ).toHaveAttribute('aria-selected', 'true');

        // The arrows step over them: from Molenweg (1) past Algemeen Fonds (2) to Veldweg (3).
        screen.getByRole('option', { name: /Molenweg/ }).focus();
        await user.keyboard('{ArrowRight}');
        expect(screen.getByRole('option', { name: /Veldweg/ })).toHaveAttribute(
            'aria-selected',
            'true',
        );
    });

    it('names a town that has no name yet in words, never its key (bug 28)', async () => {
        const user = userEvent.setup();
        renderWithI18n(<BoxShow box={box()} />);

        await user.click(screen.getByRole('tab', { name: 'Plaatsen' }));

        expect(screen.getByText('Nu: nog geen naam')).toBeInTheDocument();
        expect(screen.queryByText(/group\./)).not.toBeInTheDocument();
    });

    it('sends an amount for a card and proposes a new card (B175)', async () => {
        const user = userEvent.setup();
        const fetchMock = stubFetch(() =>
            Promise.resolve(
                new Response(JSON.stringify({ id: 'c1', receipt: 'r1' }), {
                    status: 201,
                }),
            ),
        );
        renderWithI18n(<BoxShow box={box()} />);
        await user.type(screen.getByLabelText('Je voornaam'), 'Pim');
        await user.click(screen.getByRole('tab', { name: 'Kaarten' }));

        // Algemeen Fonds 2 pays out 200: an amount from 160 to 240, received.
        await user.click(
            defined(
                screen.getAllByRole('button', {
                    name: /De bank heeft zich vergist/,
                })[0],
            ),
        );
        const amount = screen.getByRole('spinbutton', {
            name: 'Bedrag voorstellen',
        });
        await user.type(amount, '900');
        await user.click(screen.getByRole('button', { name: 'Versturen' }));
        expect(
            screen.getByText('Dit bedrag past niet bij deze kaart.'),
        ).toBeInTheDocument();
        expect(fetchMock).not.toHaveBeenCalled();

        await user.clear(amount);
        await user.type(amount, '220');
        await user.click(screen.getByRole('button', { name: 'Versturen' }));
        await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
        const first = formOf(requestOf(fetchMock).init);
        expect(first.get('amount')).toBe('220');

        // A new card: free amount, paid or received.
        await user.click(
            defined(
                screen.getAllByRole('button', {
                    name: /Nieuwe kaart voorstellen/,
                })[0],
            ),
        );
        expect(
            screen.getByRole('heading', { name: /Nieuwe kaart voor Kans/ }),
        ).toBeInTheDocument();
        await user.type(
            screen.getByPlaceholderText(/Een nieuwe kaarttekst/),
            'Je wint de loterij.',
        );
        await user.click(screen.getByRole('radio', { name: 'Ontvang' }));
        await user.type(
            screen.getByRole('spinbutton', { name: 'Bedrag voorstellen' }),
            '100',
        );
        await user.click(screen.getByRole('button', { name: 'Versturen' }));
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
        const second = formOf(requestOf(fetchMock, 1).init);
        expect(second.get('elementKey')).toBe('newcard.chance');
        expect(second.get('amount')).toBe('100');
    });

    it('tells the friend what became of what they sent (B175)', async () => {
        window.localStorage.setItem(
            'printopoly.boxes.friend',
            JSON.stringify({
                sent: {
                    ['t'.repeat(40)]: [
                        {
                            receipt: 'r1',
                            elementKey: 'space.01',
                            label: 'Molenweg',
                            value: 'Kerkstraat',
                            hasPhoto: false,
                            sentAt: 1,
                        },
                        {
                            receipt: 'r2',
                            elementKey: 'space.03',
                            label: 'Brink',
                            value: 'Dorpsplein',
                            hasPhoto: false,
                            sentAt: 2,
                        },
                    ],
                },
            }),
        );
        stubFetch(() =>
            Promise.resolve(
                new Response(
                    JSON.stringify({
                        contributions: { r1: 'applied', r2: 'passed' },
                    }),
                    { status: 200 },
                ),
            ),
        );
        renderWithI18n(<BoxShow box={box()} />);

        expect(await screen.findByText('Staat erin')).toBeInTheDocument();
        expect(screen.getByText('Niet gebruikt')).toBeInTheDocument();
    });

    it('shows the server message when sending is refused', async () => {
        const user = userEvent.setup();
        stubFetch(() =>
            Promise.resolve(
                new Response(
                    JSON.stringify({
                        errors: { value: ['Links kunnen hier niet.'] },
                    }),
                    { status: 422 },
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
