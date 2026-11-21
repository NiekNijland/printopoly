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
        const notice = screen.getByText(
            /sturen we je editie en foto's naar onze server/,
        );

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
            screen.getByText('306 biljetten · 22 vellen SRA3 · met snijtekens'),
        ).toBeVisible();
        expect(
            screen.getByText(
                '4 stuks · elk 248 × 248 mm · 3 mm afloop en snijtekens',
            ),
        ).toBeVisible();
    });

    it('puts the test sheet first, then the groups, and names what the edition leaves out (B149)', () => {
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
        expect(
            screen.getByText(
                /Niet in deze editie: spelregelboekje, huisjes en hotels, dobbelstenen, uitnodiging\./,
            ),
        ).toBeVisible();
        for (const link of screen.getAllByRole('link', {
            name: 'Aanzetten in de editor.',
        })) {
            expect(link).toHaveAttribute(
                'href',
                expect.stringContaining('/editor/abcdefgh12'),
            );
        }
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
        expect(
            screen.getByRole('link', { name: 'Instructies van Bord' }),
        ).toHaveAttribute('href', '/ins/board');
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
        expect(screen.getByText(/Bewaar deze link/)).toBeVisible();
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
            screen.getByRole('checkbox', { name: 'Meenemen: Speelgeld' }),
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
        expect(JSON.parse(choicesInit.body as string)).toEqual({
            set: 'printer',
            skipped: ['money'],
        });
        const [, init] = calls().find(
            ([url]) => url === '/api/print/t/generate',
        )!;
        expect(JSON.parse(init.body as string)).toEqual({
            set: 'printer',
            parts: ['board', 'cards', 'tokens', 'box_lid'],
            choices: { skipped: ['money'], moneyAmount: null, copies: 1 },
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
            choices: { skipped: [], moneyAmount: null, copies: 1 },
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
                screen.getByRole('button', { name: 'Maken: Speelgeld' }),
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
                        choices: { skipped: [], moneyAmount: null, copies: 1 },
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
                screen.getByRole('button', { name: 'Maken: Pionnen' }),
            );
            await user.click(
                screen.getByRole('button', { name: 'Toch niet: Pionnen' }),
            );

            expect(
                screen.getByRole('button', { name: 'Maken: Pionnen' }),
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
                screen.getByRole('button', { name: 'Maken: Bord' }),
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
                        choices: { skipped: [], moneyAmount: null, copies: 1 },
                    },
                    {
                        set: 'printer',
                        parts: ['board'],
                        choices: { skipped: [], moneyAmount: null, copies: 1 },
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
                '7 vellen A4 · dubbelzijdig, 9 kaarten per vel · plus uitlijntest',
            ),
        ).toBeVisible();
        expect(
            within(screen.getByRole('tablist')).getByRole('tab', {
                name: 'Thuisprint-set',
            }),
        ).toHaveAttribute('aria-selected', 'true');
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
            screen.getByRole('checkbox', { name: 'Meenemen: Speelgeld' }),
        ).not.toBeChecked();
        expect(screen.getByText('overgeslagen')).toBeVisible();
        expect(screen.getByText(/4 van 4 klaar/)).toBeVisible();
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
        // players), pawns 1 sheet of A4; the box lid on A3.
        const bar = () => document.querySelector('[data-estimate]')!;
        expect(bar()).toHaveTextContent(
            'Samen 40 vellen A4 en 1 vel A3, waarvan 24 speelgeld',
        );

        await user.click(screen.getByRole('button', { name: 'Een set meer' }));
        await user.click(screen.getByRole('button', { name: 'Een set meer' }));

        expect(screen.getByText('3 sets')).toBeVisible();
        expect(bar()).toHaveTextContent(
            'Voor 3 sets samen 120 vellen A4 en 3 vellen A3, waarvan 72 speelgeld',
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

        expect(
            screen.getByRole('radio', { name: 'Volledige bank' }),
        ).toBeChecked();
        await user.click(
            screen.getByRole('radio', { name: '5 tot 8 spelers' }),
        );

        expect(
            screen.getByText('258 biljetten · 19 vellen SRA3 · met snijtekens'),
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
