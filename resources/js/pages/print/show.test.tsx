import type * as InertiaReact from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { makeEdition } from '@/lib/edition/test-utils';
import { getServices, setServices } from '@/lib/editor/services';
import PrintShow from '@/pages/print/show';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';
import type {
    PartStatus,
    PrintJobData,
    PrintPart,
    PrintPartStatusData,
    PrintSet,
} from '@/types/generated';

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
        href: string | { url: string };
        children: React.ReactNode;
    }) => (
        <a href={typeof href === 'string' ? href : href.url} {...rest}>
            {children}
        </a>
    ),
    router: { visit: vi.fn() },
}));

vi.mock('@/lib/echo', () => ({ getEcho: () => null }));

const row = (
    set: PrintSet,
    part: PrintPart,
    status: PartStatus,
    extra: Partial<PrintPartStatusData> = {},
): PrintPartStatusData => ({
    set,
    part,
    status,
    waitingFor: null,
    pages: null,
    bytes: null,
    downloadUrl: null,
    instructionsUrl: null,
    reason: null,
    imageUrl: null,
    ...extra,
});

const job = (
    parts: PrintPartStatusData[],
    overrides: Partial<PrintJobData['status']> = {},
): PrintJobData => ({
    token: 't',
    statusUrl: '/api/print/t/status',
    generateUrl: '/api/print/t/generate',
    channel: { name: 'print-anon.t', private: false },
    status: {
        busy: false,
        printerZipUrl: '/zip/printer',
        homeZipUrl: '/zip/home',
        printerZipReady: false,
        homeZipReady: false,
        zipPreparing: false,
        parts,
        ...overrides,
    },
    anonymous: true,
    retentionDays: 7,
    choices: {
        printer: { skipped: [], moneyAmount: null, copies: 1 },
        home: { skipped: [], moneyAmount: null, copies: 1 },
    },
});

const edition = {
    name: 'Zaterdagclub',
    cards: 60,
    parts: ['board', 'cards', 'money', 'tokens', 'box_lid'] as PrintPart[],
};

describe('print page', () => {
    beforeEach(() => {
        page.current = fakePage();
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
            /sturen we je editie en foto's naar onze server/,
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
        expect(notice).toHaveTextContent('na 7 dagen verwijderen we ze');
        expect(
            screen.getByRole('heading', { name: 'Zaterdagclub printen' }),
        ).toBeVisible();
        expect(
            screen.getByRole('link', { name: /Terug naar de editor/ }),
        ).toBeVisible();
    });

    describe('round 4', () => {
        it('says above the switch which set suits which shop (B185)', () => {
            renderWithI18n(
                <PrintShow
                    localEditionId="edition-a"
                    editionData={null}
                    job={job([])}
                    edition={edition}
                />,
            );

            const tabs = screen.getByRole('tablist', { name: 'Kies een set' });
            expect(tabs).toHaveAccessibleDescription(
                'Eigen printer of kopieerwinkel: Thuisprint-set. Drukkerij of stickerdrukker: Drukkerij-set.',
            );
        });

        it('counts the notes of every set for a club (UX 3)', () => {
            renderWithI18n(
                <PrintShow
                    localEditionId={null}
                    editionData={null}
                    job={{
                        ...job([]),
                        choices: {
                            printer: {
                                skipped: [],
                                moneyAmount: null,
                                copies: 10,
                            },
                            home: {
                                skipped: [],
                                moneyAmount: null,
                                copies: 1,
                            },
                        },
                    }}
                    edition={edition}
                />,
            );

            expect(
                screen.getByText(
                    '3060 biljetten voor 10 sets (306 per set) · 22 vellen SRA3 per set, iets groter dan A3',
                ),
            ).toBeInTheDocument();
            expect(
                screen.getAllByText(/met 3060 biljetten/).length,
            ).toBeGreaterThan(0);
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
            /sturen we je editie en foto's naar onze server/,
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

    it('lists the test sheet and every part with what to order and the spec', () => {
        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={job([])}
                edition={edition}
            />,
        );

        for (const name of [
            'Eerst proberen: proefvel',
            'Bord',
            'Kaarten en eigendomsbewijzen',
            'Speelgeld',
            'Pionnen',
            'Doosdeksel',
        ]) {
            // The thumbnail of the money also says Speelgeld on its notes.
            expect(screen.getAllByText(name)[0]).toBeVisible();
        }
        expect(
            screen.getByText(
                '60 kaarten · 63 × 88 mm · 3 mm afloop en snijtekens',
            ),
        ).toBeVisible();
        // The full bank at the print shop (B156), and the panels of the standard board (bug 22).
        expect(
            screen.getByText(
                '306 biljetten · 22 vellen SRA3, iets groter dan A3 · met snijtekens',
            ),
        ).toBeVisible();
        expect(
            screen.getByText(
                '4 stuks · elk 248 × 248 mm · 3 mm afloop en snijtekens',
            ),
        ).toBeVisible();
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

    it('shows the status of every kind as text, with the fitting button', () => {
        const parts = [
            row('printer', 'board', 'done', {
                downloadUrl: '/dl/board',
                instructionsUrl: '/ins/board',
            }),
            row('printer', 'cards', 'running'),
            row('printer', 'money', 'waiting', { waitingFor: 'cards' }),
            row('printer', 'tokens', 'failed'),
            row('printer', 'box_lid', 'outdated'),
        ];
        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={job(parts, { busy: true })}
                edition={edition}
            />,
        );

        expect(screen.getByText('klaar')).toBeVisible();
        expect(screen.getByText('wordt gemaakt')).toBeVisible();
        expect(
            screen.getByText('wacht op Kaarten en eigendomsbewijzen'),
        ).toBeVisible();
        expect(screen.getByText('mislukt, opnieuw proberen')).toBeVisible();
        expect(screen.getByText('verouderd, opnieuw maken')).toBeVisible();

        expect(
            screen.getByRole('link', { name: 'PDF van Bord' }),
        ).toHaveAttribute('href', '/dl/board');
        // The explanation is in the print guide, at the section of the part (B205).
        expect(
            screen.getByRole('link', {
                name: 'Hoe het werkt: Bord, in de printgids',
            }),
        ).toHaveAttribute('href', '/nl/printgids#part-board');
        // While a run is busy a part can still be asked for: it waits for that run.
        expect(
            screen.getByRole('button', { name: 'Opnieuw proberen: Pionnen' }),
        ).toBeEnabled();
        expect(
            screen.getByRole('button', { name: 'Opnieuw maken: Doosdeksel' }),
        ).toBeEnabled();
    });

    it('says why a part failed, and falls back to a general line for an unknown reason', () => {
        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={job([
                    row('printer', 'money', 'failed', { reason: 'timeout' }),
                    row('printer', 'tokens', 'failed', { reason: null }),
                ])}
                edition={edition}
            />,
        );

        expect(
            screen.getByText(/Het duurde te lang om dit onderdeel te maken/),
        ).toBeVisible();
        expect(screen.getByText(/Onbekende fout/)).toBeVisible();
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

    it('shares the files of the set one by one where the phone can, with the ZIP small beside it (R5-30)', async () => {
        const user = userEvent.setup();
        const share = vi.fn(() => Promise.resolve());
        vi.stubGlobal('navigator', {
            ...window.navigator,
            canShare: () => true,
            share,
        });
        vi.stubGlobal(
            'fetch',
            vi.fn((url: string) =>
                Promise.resolve(
                    new Response(
                        new Blob(['%PDF'], { type: 'application/pdf' }),
                        {
                            status: 200,
                            headers: {
                                'Content-Disposition': `attachment; filename="zaterdagclub-${url.split('/').pop() ?? ''}.pdf"`,
                            },
                        },
                    ),
                ),
            ),
        );
        const done = edition.parts.map((part) =>
            row('printer', part, 'done', { downloadUrl: `/dl/${part}` }),
        );

        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={job(done, { printerZipReady: true })}
                edition={edition}
            />,
        );

        await user.click(
            await screen.findByRole('button', { name: 'Alles delen' }),
        );

        await waitFor(() => {
            expect(share).toHaveBeenCalledTimes(1);
        });
        const [shared] = share.mock.calls[0] as unknown as [
            { files: File[]; title: string },
        ];
        expect(shared.files.map((file) => file.name)).toEqual([
            'zaterdagclub-board.pdf',
            'zaterdagclub-cards.pdf',
            'zaterdagclub-money.pdf',
            'zaterdagclub-tokens.pdf',
            'zaterdagclub-box_lid.pdf',
        ]);
        expect(shared.title).toBe('Zaterdagclub');
        expect(
            screen.getByRole('link', {
                name: 'Drukkerij-set downloaden (ZIP)',
            }),
        ).toHaveAttribute('href', '/zip/printer');
        vi.unstubAllGlobals();
    });

    it('shares the picture of the invitation, from its row and with Alles delen (R6 Sara)', async () => {
        const user = userEvent.setup();
        const share = vi.fn(() => Promise.resolve());
        vi.stubGlobal('navigator', {
            ...window.navigator,
            canShare: () => true,
            share,
        });
        vi.stubGlobal(
            'fetch',
            vi.fn((url: string) =>
                Promise.resolve(
                    url.startsWith('/img/')
                        ? new Response(
                              new Blob(['PNG'], { type: 'image/png' }),
                              {
                                  status: 200,
                                  headers: {
                                      'Content-Disposition':
                                          'attachment; filename="zaterdagclub-uitnodiging.png"',
                                  },
                              },
                          )
                        : new Response(
                              new Blob(['%PDF'], { type: 'application/pdf' }),
                              { status: 200 },
                          ),
                ),
            ),
        );
        const withInvitation = {
            ...edition,
            parts: [...edition.parts, 'invitation'] as PrintPart[],
        };
        const done = withInvitation.parts.map((part) =>
            row('printer', part, 'done', {
                downloadUrl: `/dl/${part}`,
                ...(part === 'invitation'
                    ? { imageUrl: '/img/invitation' }
                    : {}),
            }),
        );

        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={job(done, { printerZipReady: true })}
                edition={withInvitation}
            />,
        );

        // The row shares the picture, not a link to the PDF.
        expect(
            screen.queryByRole('button', { name: 'PDF delen: Uitnodiging' }),
        ).toBeNull();
        await user.click(
            await screen.findByRole('button', {
                name: 'Plaatje delen: Uitnodiging',
            }),
        );
        await waitFor(() => {
            expect(share).toHaveBeenCalledTimes(1);
        });
        const [one] = share.mock.calls[0] as unknown as [{ files: File[] }];
        expect(one.files.map((file) => [file.name, file.type])).toEqual([
            ['zaterdagclub-uitnodiging.png', 'image/png'],
        ]);

        // Alles delen has the picture next to the PDFs.
        const all = screen
            .getAllByRole('button', { name: 'Alles delen' })
            .at(0);
        if (all === undefined) {
            throw new Error('no share button');
        }
        await user.click(all);
        await waitFor(() => {
            expect(share).toHaveBeenCalledTimes(2);
        });
        const [both] = share.mock.calls[1] as unknown as [{ files: File[] }];
        expect(both.files.map((file) => file.name)).toContain(
            'zaterdagclub-uitnodiging.png',
        );
        expect(both.files.map((file) => file.name)).toContain('invitation.pdf');
        vi.unstubAllGlobals();
    });

    it('ticks a part in or out with a tap on its name or picture (R5-27)', async () => {
        const user = userEvent.setup();
        vi.stubGlobal(
            'fetch',
            vi.fn(() =>
                Promise.resolve(
                    new Response(JSON.stringify(job([]).status), {
                        status: 200,
                    }),
                ),
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
        const box = screen.getByRole('checkbox', {
            name: 'Speelgeld in je set',
        });
        expect(box).toBeChecked();

        await user.click(screen.getByText('Speelgeld', { selector: 'strong' }));
        expect(box).not.toBeChecked();

        // The board is always in the set: its name does nothing.
        const board = screen.getByRole('checkbox', { name: 'Bord in je set' });
        await user.click(screen.getByText('Bord', { selector: 'strong' }));
        expect(board).toBeChecked();
        vi.unstubAllGlobals();
    });

    it('opens at the row the editor asked for with "niet in je set" (R6 Kees)', () => {
        window.history.replaceState(
            null,
            '',
            '/nl/print?set=printer&part=tokens',
        );
        const scrolled = vi.fn();
        const original = Element.prototype.scrollIntoView;
        Element.prototype.scrollIntoView = scrolled;

        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={job([])}
                edition={edition}
            />,
        );

        const row = document.getElementById('part-tokens');
        expect(row).toHaveAttribute('data-asked', 'true');
        expect(scrolled).toHaveBeenCalled();
        expect(scrolled.mock.contexts[0]).toBe(row);
        // The address loses the question, so a reload does not jump again.
        expect(window.location.search).not.toContain('part=');
        expect(document.getElementById('part-money')).not.toHaveAttribute(
            'data-asked',
        );
        Element.prototype.scrollIntoView = original;
    });

    it('lets the test sheet of the home set say print, not order (R5-26)', async () => {
        const user = userEvent.setup();
        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={job([])}
                edition={edition}
            />,
        );

        expect(screen.getByText(/Past het, bestel dan\./)).toBeVisible();
        await user.click(screen.getByRole('tab', { name: 'Thuisprint-set' }));
        expect(screen.getByText(/Past het, print dan de rest\./)).toBeVisible();
        expect(screen.queryByText(/bestel dan/)).not.toBeInTheDocument();
    });

    it('advises more money when the set has more pawns than the money is for (R5-29)', async () => {
        const user = userEvent.setup();
        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={job([])}
                edition={edition}
            />,
        );
        await user.click(screen.getByRole('tab', { name: 'Thuisprint-set' }));

        // The edition has all 8 pawns; the home set prints money for 2 to 4 players unless you choose more.
        expect(
            screen.getByText(
                /Je set heeft 8 pionnen en dit geld is genoeg voor 4 spelers/,
            ),
        ).toBeVisible();
    });

    it('asks the server for the chosen parts only (B99)', async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn((url: string) =>
            Promise.resolve(
                new Response(
                    JSON.stringify(
                        url.endsWith('/generate')
                            ? job([row('printer', 'board', 'waiting')], {
                                  busy: true,
                              }).status
                            : job([]).status,
                    ),
                    { status: 200 },
                ),
            ),
        );
        vi.stubGlobal('fetch', fetchMock);

        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={job([])}
                edition={edition}
            />,
        );
        await user.click(
            screen.getByRole('checkbox', { name: 'Speelgeld in je set' }),
        );
        await user.click(
            screen.getByRole('button', { name: 'Drukkerij-set maken' }),
        );

        const calls = () =>
            fetchMock.mock.calls.map(
                (call) => call as unknown as [string, RequestInit],
            );

        await waitFor(() => {
            expect(
                calls().some(([url]) => url === '/api/print/t/generate'),
            ).toBe(true);
        });
        // Skipping is kept on the job at once, and travels with the run (bug 6 of test round 3).
        const [choicesUrl, choicesInit] = calls()[0]!;
        expect(choicesUrl).toBe('/api/print/t/choices');
        // One choice for the edition: both sets skip the same parts (B198).
        expect(JSON.parse(choicesInit.body as string)).toEqual({
            set: 'printer',
            skipped: ['money', 'invitation', 'rules_booklet'],
        });
        const [, init] = calls().find(
            ([url]) => url === '/api/print/t/generate',
        )!;
        expect(JSON.parse(init.body as string)).toEqual({
            set: 'printer',
            parts: ['board', 'cards', 'tokens', 'box_lid'],
            choices: {
                skipped: ['money', 'invitation', 'rules_booklet'],
                moneyAmount: null,
                copies: 1,
            },
            locale: 'nl',
        });
        vi.unstubAllGlobals();
    });

    it('starts a single part from its own button', async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn(() =>
            Promise.resolve(
                new Response(JSON.stringify(job([]).status), { status: 200 }),
            ),
        );
        vi.stubGlobal('fetch', fetchMock);

        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={job([])}
                edition={edition}
            />,
        );
        await user.click(
            screen.getByRole('button', { name: 'Proefvel maken: Proefvel' }),
        );

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalled();
        });
        const [, init] = fetchMock.mock.calls[0] as unknown as [
            string,
            RequestInit,
        ];
        expect(JSON.parse(init.body as string)).toEqual({
            set: 'printer',
            parts: ['calibration'],
            choices: {
                skipped: ['invitation', 'rules_booklet'],
                moneyAmount: null,
                copies: 1,
            },
            locale: 'nl',
        });
        vi.unstubAllGlobals();
    });

    describe('one run at a time', () => {
        beforeEach(() => {
            vi.useFakeTimers({ shouldAdvanceTime: true });
        });

        afterEach(() => {
            vi.useRealTimers();
            vi.unstubAllGlobals();
        });

        const posts = (fetchMock: ReturnType<typeof vi.fn>) =>
            fetchMock.mock.calls
                .map((call) => call as unknown as [string, RequestInit?])
                .filter(([, init]) => init?.method === 'POST')
                .map(([, init]) => JSON.parse(init?.body as string) as unknown);

        it('puts a part in line while a run is busy and starts it when that run is done', async () => {
            const user = userEvent.setup({
                advanceTimers: (ms) => vi.advanceTimersByTime(ms),
            });
            const fetchMock = vi.fn((_url: string, init?: RequestInit) =>
                Promise.resolve(
                    new Response(
                        JSON.stringify(
                            init?.method === 'POST'
                                ? job([row('printer', 'money', 'waiting')], {
                                      busy: true,
                                  }).status
                                : job([row('printer', 'cards', 'done')]).status,
                        ),
                        { status: 200 },
                    ),
                ),
            );
            vi.stubGlobal('fetch', fetchMock);

            renderWithI18n(
                <PrintShow
                    localEditionId={null}
                    editionData={null}
                    job={job([row('printer', 'cards', 'running')], {
                        busy: true,
                    })}
                    edition={edition}
                />,
            );
            await user.click(
                screen.getByRole('button', {
                    name: 'Alleen dit maken: Speelgeld',
                }),
            );

            expect(screen.getByText('wacht op de vorige')).toBeVisible();
            expect(
                screen.getByRole('button', { name: 'Toch niet: Speelgeld' }),
            ).toBeVisible();
            expect(posts(fetchMock)).toEqual([]);
            expect(screen.queryByRole('alert')).not.toBeInTheDocument();

            // The status poll says the run is done: the part in line starts.
            await act(() => vi.advanceTimersByTimeAsync(4100));

            await waitFor(() => {
                expect(posts(fetchMock)).toEqual([
                    {
                        set: 'printer',
                        parts: ['money'],
                        choices: {
                            skipped: ['invitation', 'rules_booklet'],
                            moneyAmount: null,
                            copies: 1,
                        },
                        locale: 'nl',
                    },
                ]);
            });
        });

        it('takes a part out of the line again', async () => {
            const user = userEvent.setup({
                advanceTimers: (ms) => vi.advanceTimersByTime(ms),
            });
            vi.stubGlobal(
                'fetch',
                vi.fn(() => new Promise<Response>(() => undefined)),
            );

            renderWithI18n(
                <PrintShow
                    localEditionId={null}
                    editionData={null}
                    job={job([row('printer', 'cards', 'running')], {
                        busy: true,
                    })}
                    edition={edition}
                />,
            );
            await user.click(
                screen.getByRole('button', {
                    name: 'Alleen dit maken: Pionnen',
                }),
            );
            await user.click(
                screen.getByRole('button', { name: 'Toch niet: Pionnen' }),
            );

            expect(
                screen.getByRole('button', {
                    name: 'Alleen dit maken: Pionnen',
                }),
            ).toBeEnabled();
            expect(
                screen.queryByText('wacht op de vorige'),
            ).not.toBeInTheDocument();
        });

        it('puts the rest of the set in line, without the parts that are already going', async () => {
            const user = userEvent.setup({
                advanceTimers: (ms) => vi.advanceTimersByTime(ms),
            });
            vi.stubGlobal(
                'fetch',
                vi.fn(() => new Promise<Response>(() => undefined)),
            );

            renderWithI18n(
                <PrintShow
                    localEditionId={null}
                    editionData={null}
                    job={job(
                        [
                            row('printer', 'board', 'running'),
                            row('printer', 'cards', 'waiting', {
                                waitingFor: 'board',
                            }),
                        ],
                        { busy: true },
                    )}
                    edition={edition}
                />,
            );
            await user.click(
                screen.getByRole('button', { name: 'Drukkerij-set maken' }),
            );

            // Money, tokens and the box lid wait; board and cards are already going.
            expect(screen.getAllByText('wacht op de vorige')).toHaveLength(3);
            expect(
                screen.getByRole('button', { name: 'Bezig…' }),
            ).toBeDisabled();
        });

        it('asks again a little later when the server still has a run going (409), without an error', async () => {
            const user = userEvent.setup({
                advanceTimers: (ms) => vi.advanceTimersByTime(ms),
            });
            let answers = 0;
            const fetchMock = vi.fn(() => {
                answers += 1;

                return Promise.resolve(
                    answers === 1
                        ? new Response('{}', { status: 409 })
                        : new Response(
                              JSON.stringify(
                                  job([row('printer', 'board', 'waiting')], {
                                      busy: true,
                                  }).status,
                              ),
                              { status: 200 },
                          ),
                );
            });
            vi.stubGlobal('fetch', fetchMock);

            renderWithI18n(
                <PrintShow
                    localEditionId={null}
                    editionData={null}
                    job={job([])}
                    edition={edition}
                />,
            );
            await user.click(
                screen.getByRole('button', { name: 'Alleen dit maken: Bord' }),
            );

            expect(await screen.findByText('wacht op de vorige')).toBeVisible();
            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
            expect(posts(fetchMock)).toHaveLength(1);

            await act(() => vi.advanceTimersByTimeAsync(5100));

            await waitFor(() => {
                expect(posts(fetchMock)).toEqual([
                    {
                        set: 'printer',
                        parts: ['board'],
                        choices: {
                            skipped: ['invitation', 'rules_booklet'],
                            moneyAmount: null,
                            copies: 1,
                        },
                        locale: 'nl',
                    },
                    {
                        set: 'printer',
                        parts: ['board'],
                        choices: {
                            skipped: ['invitation', 'rules_booklet'],
                            moneyAmount: null,
                            copies: 1,
                        },
                        locale: 'nl',
                    },
                ]);
            });
            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        });
    });

    it('switches to the home set and its texts', async () => {
        const user = userEvent.setup();
        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={job([])}
                edition={edition}
            />,
        );

        await user.click(screen.getByRole('tab', { name: 'Thuisprint-set' }));

        expect(
            screen.getByRole('button', { name: 'Thuisprint-set maken' }),
        ).toBeVisible();
        expect(
            screen.getByText(
                "16 pagina's A4 · dubbelzijdig is dat 8 vellen, het eerste is een proef · 9 kaarten per vel",
            ),
        ).toBeVisible();
        expect(
            within(screen.getByRole('tablist')).getByRole('tab', {
                name: 'Thuisprint-set',
            }),
        ).toHaveAttribute('aria-selected', 'true');
    });

    it('opens on the home set unless this browser chose the print-shop set for the edition (B199)', async () => {
        const user = userEvent.setup();
        window.history.replaceState(null, '', '/nl/print');
        const page = (
            <PrintShow
                localEditionId="abcdefgh12"
                editionData={null}
                job={job([])}
                edition={edition}
            />
        );
        const { unmount } = renderWithI18n(page);
        expect(
            screen.getByRole('tab', { name: 'Thuisprint-set' }),
        ).toHaveAttribute('aria-selected', 'true');
        // The home set comes first.
        expect(screen.getAllByRole('tab')[0]).toHaveAccessibleName(
            'Thuisprint-set',
        );
        await user.click(screen.getByRole('tab', { name: 'Drukkerij-set' }));
        unmount();

        const again = renderWithI18n(page);
        expect(
            screen.getByRole('tab', { name: 'Drukkerij-set' }),
        ).toHaveAttribute('aria-selected', 'true');
        again.unmount();

        // Another edition, never printed in this browser: the home set.
        renderWithI18n(
            <PrintShow
                localEditionId="otheredition"
                editionData={null}
                job={job([])}
                edition={edition}
            />,
        );
        expect(
            screen.getByRole('tab', { name: 'Thuisprint-set' }),
        ).toHaveAttribute('aria-selected', 'true');
    });

    it('keeps what goes in the set on the edition, where the editor reads it (B198)', async () => {
        const user = userEvent.setup();
        window.history.replaceState(null, '', '/nl/print');
        const { storage } = getServices('nl');
        await storage.createEdition(makeEdition({ id: 'pickedition1' }));
        await storage.addPrintJob({
            token: 't',
            editionId: 'pickedition1',
            revision: 0,
            createdAt: 1,
        });
        vi.stubGlobal(
            'fetch',
            vi.fn(() =>
                Promise.resolve(
                    new Response(JSON.stringify(job([]).status), {
                        status: 200,
                    }),
                ),
            ),
        );

        renderWithI18n(
            <PrintShow
                localEditionId="pickedition1"
                editionData={null}
                job={job([])}
                edition={edition}
            />,
        );
        await user.click(
            screen.getByRole('checkbox', { name: 'Uitnodiging in je set' }),
        );
        await user.click(screen.getByRole('tab', { name: 'Drukkerij-set' }));

        await waitFor(async () => {
            expect(
                (await storage.getEdition('pickedition1'))?.printSelection,
            ).toEqual({
                set: 'printer',
                parts: [
                    'board',
                    'deeds',
                    'cards',
                    'houseRules',
                    'money',
                    'pawns',
                    'boxLid',
                    'invitation',
                ],
            });
        });
        // The job of this browser stays the job of the edition: only the choice of parts changed.
        const edition2 = await storage.getEdition('pickedition1');
        expect(
            (await storage.listPrintJobs()).find((entry) => entry.token === 't')
                ?.revision,
        ).toBe(edition2?.revision);
        vi.unstubAllGlobals();
        setServices(null);
    });

    it('works in English', () => {
        page.current = fakePage({ locale: 'en' });
        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={job([])}
                edition={edition}
            />,
            'en',
        );

        expect(
            screen.getByRole('heading', { name: 'Print Zaterdagclub' }),
        ).toBeVisible();
        expect(
            screen.getByRole('button', { name: 'Make print shop set' }),
        ).toBeVisible();
    });

    it('links back to the editor of the edition, and to the list when it is not known', () => {
        const { unmount } = renderWithI18n(
            <PrintShow
                localEditionId="abcdefgh12"
                editionData={null}
                job={job([])}
                edition={edition}
            />,
        );

        expect(
            screen.getByRole('link', { name: /Terug naar de editor/ }),
        ).toHaveAttribute(
            'href',
            expect.stringContaining('/editor/abcdefgh12'),
        );
        unmount();

        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={job([])}
                edition={edition}
            />,
        );
        expect(
            screen.getByRole('link', { name: /Terug naar de editor/ }),
        ).toHaveAttribute('href', expect.stringContaining('/editions'));
    });

    it('answers a click on the make button at once', async () => {
        const user = userEvent.setup();
        vi.stubGlobal(
            'fetch',
            vi.fn(() => new Promise<Response>(() => undefined)),
        );

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
        vi.unstubAllGlobals();
    });

    it('keeps the skipped parts of the job: the count reaches the total (bug 6 of test round 3)', () => {
        const done = (part: PrintPart) =>
            row('printer', part, 'done', { downloadUrl: `/dl/${part}` });
        const made = job([
            done('board'),
            done('cards'),
            done('tokens'),
            done('box_lid'),
        ]);

        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={{
                    ...made,
                    choices: {
                        ...made.choices,
                        printer: {
                            skipped: ['money'],
                            moneyAmount: null,
                            copies: 1,
                        },
                    },
                }}
                edition={edition}
            />,
        );

        expect(
            screen.getByRole('checkbox', { name: 'Speelgeld in je set' }),
        ).not.toBeChecked();
        // Money, the invitation and the booklet are out of the set.
        expect(screen.getAllByText('niet in je set')).toHaveLength(3);
        expect(document.querySelector('[data-estimate]')).toHaveTextContent(
            /4 van 4 klaar/,
        );
    });

    it('counts the sheets of the chosen parts in the bar, times the number of sets (UX 3)', async () => {
        const user = userEvent.setup();
        vi.stubGlobal(
            'fetch',
            vi.fn(() =>
                Promise.resolve(
                    new Response(JSON.stringify(job([]).status), {
                        status: 200,
                    }),
                ),
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
        vi.unstubAllGlobals();
    });

    it('chooses how much money to print in the money row (B156)', async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn(() =>
            Promise.resolve(
                new Response(JSON.stringify(job([]).status), { status: 200 }),
            ),
        );
        vi.stubGlobal('fetch', fetchMock);

        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={job([])}
                edition={edition}
            />,
        );

        // "Aanbevolen" stands for the default of the set: the full bank at the print shop.
        expect(screen.getByRole('radio', { name: 'Aanbevolen' })).toBeChecked();
        expect(
            screen.getByText(
                'Aanbevolen voor de Drukkerij-set: de volledige bank.',
            ),
        ).toBeVisible();
        expect(
            screen.getByText(
                '306 biljetten · 22 vellen SRA3, iets groter dan A3 · met snijtekens',
            ),
        ).toBeVisible();
        await user.click(
            screen.getByRole('radio', { name: '5 tot 8 spelers' }),
        );

        expect(
            screen.getByText(
                '258 biljetten · 19 vellen SRA3, iets groter dan A3 · met snijtekens',
            ),
        ).toBeVisible();
        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith(
                '/api/print/t/choices',
                expect.objectContaining({
                    body: JSON.stringify({
                        set: 'printer',
                        moneyAmount: 'eight',
                    }),
                }),
            );
        });
        vi.unstubAllGlobals();
    });

    it('says "too many requests" next to the button and tries again by itself (bug 4 of test round 3)', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const user = userEvent.setup({
            advanceTimers: (ms) => vi.advanceTimersByTime(ms),
        });
        let answers = 0;
        const fetchMock = vi.fn((url: string) => {
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
        vi.stubGlobal('fetch', fetchMock);

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
        vi.unstubAllGlobals();
    });

    it('lists what is still open as Nog even nakijken, each with a way to its field, and still lets you print (B197)', async () => {
        const { storage } = getServices('nl');
        const base = makeEdition({ id: 'checkedition1' });
        await storage.createEdition({
            ...base,
            elements: {
                'card.chance.01': { text: 'Ga naar {foo}.' },
                'card.chance.02': { text: 'En {bar}.' },
            },
        });

        renderWithI18n(
            <PrintShow
                localEditionId="checkedition1"
                editionData={null}
                job={job([])}
                edition={edition}
            />,
        );

        // The checks run on the whole edition; under a full parallel run they can take longer than a second.
        const review = await screen.findByRole(
            'region',
            { name: 'Nog even nakijken' },
            { timeout: 5000 },
        );
        expect(review).toHaveTextContent(
            'Deze 2 dingen vielen ons op. Printen kan gewoon',
        );
        const fixes = within(review).getAllByRole('link', {
            name: /^Aanpassen in de editor:/,
        });
        expect(fixes).toHaveLength(2);
        expect(fixes[0]).toHaveAttribute(
            'href',
            '/nl/editor/checkedition1?element=card.chance.01&field=text',
        );
        // The bar names them too and jumps to the list.
        const note = screen.getByRole('link', {
            name: '2 dingen om na te kijken. Naar Nog even nakijken.',
        });
        expect(note).toHaveAttribute('href', '#nakijken');
        expect(
            screen.getByRole('button', { name: 'Drukkerij-set maken' }),
        ).toBeEnabled();
        setServices(null);
    });

    it('says nothing about the Controle when it has nothing to say', async () => {
        const { storage } = getServices('nl');
        await storage.createEdition(makeEdition({ id: 'cleanedition1' }));

        renderWithI18n(
            <PrintShow
                localEditionId="cleanedition1"
                editionData={null}
                job={job([])}
                edition={edition}
            />,
        );

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 50));
        });
        expect(document.querySelector('[data-check-note]')).toBeNull();
        expect(
            screen.queryByRole('region', { name: 'Nog even nakijken' }),
        ).toBeNull();
        setServices(null);
    });

    it('opens the job this browser already made for this revision, instead of uploading again (bug 9 of test round 3)', async () => {
        const visit = vi
            .spyOn(router, 'visit')
            .mockImplementation(() => undefined);
        const { storage } = getServices('nl');
        const stored = { ...makeEdition({ id: 'ownedition1' }), revision: 3 };
        await storage.createEdition(stored);
        await storage.addPrintJob({
            token: 'a'.repeat(40),
            editionId: 'ownedition1',
            revision: 3,
            createdAt: 1,
        });
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.resolve(new Response('{}', { status: 200 }))),
        );

        renderWithI18n(
            <PrintShow
                localEditionId="ownedition1"
                editionData={null}
                job={null}
                edition={{ name: '', cards: 0, parts: [] }}
            />,
        );

        await waitFor(() => {
            expect(visit).toHaveBeenCalledWith(`/nl/print/${'a'.repeat(40)}`, {
                replace: true,
            });
        });
        vi.unstubAllGlobals();
        // A fresh store for the next test.
        setServices(null);
    });

    it('says there is no edition when the browser has none (job without an account yet)', async () => {
        const user = userEvent.setup();
        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={null}
                edition={{ name: '', cards: 0, parts: [] }}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Drukkerij-set maken' }),
        );

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'We vinden hier geen editie',
        );
    });
});
