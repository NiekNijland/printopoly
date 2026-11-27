import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import PrintShow from '@/pages/print/show';
import { stubFetch } from '@/testing/fetch';
import { partRow, printJob, printPageEdition } from '@/testing/print-job';
import { renderWithI18n } from '@/testing/render';

vi.mock('@/lib/echo', () => ({ getEcho: () => null }));

const row = partRow;
const job = printJob;
const edition = printPageEdition;

describe('print page', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        // The set this browser chose for an edition carries over (B199): start every test fresh.
        window.localStorage.clear();
        // Most tests are about the print-shop set; the default of the home set has tests of its own (B199).
        window.history.replaceState(null, '', '/nl/print?set=printer');
    });

    it('makes nothing yet: the server explanation sits in the bar directly above the make button (B95, B149)', () => {
        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={job([])}
                edition={edition}
            />,
        );

        const button = screen.getByRole('button', {
            name: 'Drukkerij-set maken',
        });
        // The full line on a wide screen; a phone folds it (below).
        const [notice] = screen.getAllByText(
            /je editie en foto's naar onze server/,
        );
        if (notice === undefined) {
            throw new Error('no notice');
        }

        // One bar holds the line and the buttons, the line first.
        expect(notice.closest('.sticky')).toContainElement(button);
        expect(
            notice.compareDocumentPosition(button) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
        expect(notice).toHaveTextContent('Na 7 dagen verwijderen we ze');
        expect(
            screen.getByRole('heading', { name: 'Zaterdagclub printen' }),
        ).toBeVisible();
        expect(
            screen.getByRole('link', { name: /Terug naar de editor/ }),
        ).toBeVisible();
    });

    it('gives the download a short label on a phone, so the bar fits (bug 8)', () => {
        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={job([], { printerZipReady: true })}
                edition={edition}
            />,
        );

        const link = screen.getByRole('link', {
            name: 'Drukkerij-set downloaden (ZIP)',
        });
        expect(within(link).getByText('ZIP downloaden')).toHaveClass(
            'md:hidden',
        );
    });

    it('says the connection is gone instead of a general error (bug 12)', () => {
        const online = vi
            .spyOn(navigator, 'onLine', 'get')
            .mockReturnValue(false);

        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={job([])}
                edition={edition}
            />,
        );

        expect(screen.getByRole('alert')).toHaveTextContent(
            'Geen verbinding. We gaan vanzelf verder zodra je weer online bent.',
        );
        online.mockRestore();
    });

    it('keeps the bar to one thin line on a phone on its side (bug 2)', () => {
        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={job([])}
                edition={edition}
            />,
        );

        const [notice] = screen.getAllByText(
            /je editie en foto's naar onze server/,
        );
        const bar = notice?.parentElement?.parentElement;

        expect(notice).toHaveClass('low:hidden');
        expect(bar).toHaveClass('low:flex-row', 'low:py-1');
        expect(bar?.parentElement).toHaveClass('sticky', 'max-w-full');
    });

    // Release ronde 3: on a phone the server line made the bar a quarter of the screen; at 320 x 640 it was still a
    // third, so the estimate is the one line now and the server line sits in its fold (B179).
    it('folds the estimate and the server line to one line on a phone and on a low screen', async () => {
        const user = userEvent.setup();
        const view = renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={job([])}
                edition={edition}
            />,
        );

        const folded = view.container.querySelector('[data-notice]');
        if (!(folded instanceof HTMLElement)) {
            throw new Error('no folded notice');
        }
        const trigger = folded.querySelector('button');
        if (trigger === null) {
            throw new Error('no fold button');
        }
        expect(folded).toHaveClass('md:hidden', 'low:block');
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(trigger.querySelector('span')).toHaveClass('truncate');
        // The download that cannot be used yet takes no row of its own on a phone.
        expect(
            screen.getByRole('button', {
                name: 'Drukkerij-set downloaden (ZIP)',
            }),
        ).toHaveClass('max-md:hidden');

        expect(trigger.querySelector('span')).toHaveTextContent(/^Samen /);
        expect(trigger).toHaveClass('min-h-11');

        await user.click(trigger);
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        expect(within(folded).getByText('Inklappen')).toBeInTheDocument();
        expect(within(folded).getByText(/naar onze server/)).toBeVisible();
    });

    it('puts the test sheet first, then the groups, with every part as a row to tick (B149, B198, B200)', () => {
        renderWithI18n(
            <PrintShow
                localEditionId="abcdefgh12"
                editionData={null}
                job={job([])}
                edition={edition}
            />,
        );

        // The test sheet is a card of its own: it has a title, not a group heading.
        const trial = screen.getByText('Eerst proberen: proefvel');
        expect(trial.tagName).toBe('STRONG');
        const game = screen.getByRole('heading', { name: 'Het spel' });
        const extra = screen.getByRole('heading', { name: 'Extra drukwerk' });
        const order = (a: Node, b: Node) =>
            a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING;

        expect(order(trial, game)).toBeTruthy();
        expect(order(game, extra)).toBeTruthy();
        expect(order(screen.getAllByText('Speelgeld')[0]!, extra)).toBeTruthy();
        // The extras the edition had off are rows that are not ticked, not a line with a way to the editor.
        expect(
            screen.getByRole('checkbox', {
                name: 'Uitnodiging in je set',
            }),
        ).not.toBeChecked();
        expect(
            screen.getByRole('checkbox', {
                name: 'Spelregelboekje in je set',
            }),
        ).not.toBeChecked();
        expect(screen.queryByText(/Niet in deze editie/)).toBeNull();
        expect(screen.queryByText(/Dobbelstenen|Huisjes en hotels/)).toBeNull();
        // The board is always in the set: its box is ticked and locked.
        const board = screen.getByRole('checkbox', { name: 'Bord in je set' });
        expect(board).toBeChecked();
        expect(board).toBeDisabled();
        expect(board).toHaveAccessibleDescription('altijd in de set');
        // No side box about the print shop: the guide explains it (B205).
        expect(screen.queryByText('Bij de drukkerij')).toBeNull();
    });

    it('enables the ZIP only when everything requested is done', () => {
        const parts = [
            row('printer', 'board', 'done', { downloadUrl: '/dl' }),
            row('printer', 'cards', 'failed'),
        ];
        const { unmount } = renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={job(parts)}
                edition={edition}
            />,
        );

        expect(
            screen.getByRole('button', {
                name: 'Drukkerij-set downloaden (ZIP)',
            }),
        ).toBeDisabled();
        expect(screen.getAllByText(/Bewaar deze link/)[0]).toBeVisible();
        unmount();

        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={job(
                    [row('printer', 'board', 'done', { downloadUrl: '/dl' })],
                    { printerZipReady: true },
                )}
                edition={edition}
            />,
        );
        expect(
            screen.getByRole('link', {
                name: 'Drukkerij-set downloaden (ZIP)',
            }),
        ).toHaveAttribute('href', '/zip/printer');
    });

    it('says the ZIP is being made when every part is done but the order sheet is not yet (R5-25)', () => {
        const done = edition.parts.map((part) =>
            row('printer', part, 'done', { downloadUrl: `/dl/${part}` }),
        );

        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={job(done)}
                edition={edition}
            />,
        );

        expect(
            screen.getByRole('button', { name: /ZIP klaarmaken/ }),
        ).toBeDisabled();
        expect(
            screen.queryByRole('link', {
                name: 'Drukkerij-set downloaden (ZIP)',
            }),
        ).not.toBeInTheDocument();
    });

    it('answers a click on the make button at once', async () => {
        const user = userEvent.setup();
        stubFetch(() => new Promise<Response>(() => undefined));

        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={job([])}
                edition={edition}
            />,
        );
        await user.click(
            screen.getByRole('button', { name: 'Drukkerij-set maken' }),
        );

        expect(await screen.findByRole('status')).toHaveTextContent(
            'Je editie wordt klaargezet',
        );
        expect(screen.getByRole('button', { name: 'Bezig…' })).toBeDisabled();
    });

    it('counts the sheets of the chosen parts in the bar, times the number of sets (UX 3)', async () => {
        const user = userEvent.setup();
        stubFetch(() =>
            Promise.resolve(
                new Response(JSON.stringify(job([]).status), {
                    status: 200,
                }),
            ),
        );

        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={job([])}
                edition={edition}
            />,
        );
        await user.click(screen.getByRole('tab', { name: 'Thuisprint-set' }));

        // The standard edition at home: board 7, cards 8 (alignment test and 7 sheets), money 24 (2 to 4
        // players), pawns 1 sheet of A4; the box lid on 2 sheets of A4 (R5-29).
        const bar = () => document.querySelector('[data-estimate]')!;
        expect(bar()).toHaveTextContent(
            'Samen 42 vellen A4, waarvan 24 speelgeld',
        );

        await user.click(screen.getByRole('button', { name: 'Een set meer' }));
        await user.click(screen.getByRole('button', { name: 'Een set meer' }));

        expect(screen.getByText('3 sets')).toBeVisible();
        expect(bar()).toHaveTextContent(
            'Voor 3 sets samen 126 vellen A4, waarvan 72 speelgeld',
        );
    });

    it('says "too many requests" next to the button and tries again by itself (bug 4 of test round 3)', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const user = userEvent.setup({
            advanceTimers: (ms) => vi.advanceTimersByTime(ms),
        });
        let answers = 0;
        stubFetch((url: string) => {
            if (url.endsWith('/generate')) {
                answers += 1;
            }

            return Promise.resolve(
                url.endsWith('/generate') && answers === 1
                    ? new Response('{}', {
                          status: 429,
                          headers: { 'Retry-After': '30' },
                      })
                    : new Response(JSON.stringify(job([]).status), {
                          status: 200,
                      }),
            );
        });

        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={job([])}
                edition={edition}
            />,
        );
        await user.click(
            screen.getByRole('button', { name: 'Drukkerij-set maken' }),
        );

        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent(
            'Over 30 s proberen we het zelf opnieuw',
        );
        // The message sits in the fixed bar with the button, not under the list.
        expect(alert.closest('.sticky')).toContainElement(
            screen.getByRole('button', { name: 'Drukkerij-set maken' }),
        );

        await act(() => vi.advanceTimersByTimeAsync(10_000));
        expect(alert).toHaveTextContent('Over 20 s');

        await act(() => vi.advanceTimersByTimeAsync(21_000));
        await waitFor(() => {
            expect(answers).toBe(2);
        });
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        vi.useRealTimers();
    });
});
