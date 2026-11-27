import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import PrintShow from '@/pages/print/show';
import { jsonOf, requestOf, requestsOf, stubFetch } from '@/testing/fetch';
import type { FetchFake } from '@/testing/fetch';
import { partRow, printJob, printPageEdition } from '@/testing/print-job';
import { renderWithI18n } from '@/testing/render';

const row = partRow;
const job = printJob;
const edition = printPageEdition;

describe('making parts on the print page', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        window.localStorage.clear();
        window.history.replaceState(null, '', '/nl/print?set=printer');
    });

    it('asks the server for the chosen parts only (B99)', async () => {
        const user = userEvent.setup();
        const fetchMock = stubFetch((url: string) =>
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

        const calls = () => requestsOf(fetchMock);

        await waitFor(() => {
            expect(
                calls().some(({ url }) => url === '/api/print/t/generate'),
            ).toBe(true);
        });
        // Skipping is kept on the job at once, and travels with the run (bug 6 of test round 3).
        const choices = requestOf(fetchMock);
        expect(choices.url).toBe('/api/print/t/choices');
        // One choice for the edition: both sets skip the same parts (B198).
        expect(jsonOf(choices.init)).toEqual({
            set: 'printer',
            skipped: ['money', 'invitation', 'rules_booklet'],
        });
        const generate = calls().find(
            ({ url }) => url === '/api/print/t/generate',
        );
        expect(jsonOf(generate?.init ?? {})).toEqual({
            set: 'printer',
            parts: ['board', 'cards', 'tokens', 'box_lid'],
            choices: {
                skipped: ['money', 'invitation', 'rules_booklet'],
                moneyAmount: null,
                copies: 1,
                boardForm: 'panels',
                invitations: 4,
            },
            locale: 'nl',
        });
    });

    it('starts a single part from its own button', async () => {
        const user = userEvent.setup();
        const fetchMock = stubFetch(() =>
            Promise.resolve(
                new Response(JSON.stringify(job([]).status), { status: 200 }),
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
        await user.click(
            screen.getByRole('button', { name: 'Proefvel maken: Proefvel' }),
        );

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalled();
        });
        const { init } = requestOf(fetchMock);
        expect(jsonOf(init)).toEqual({
            set: 'printer',
            parts: ['calibration'],
            choices: {
                skipped: ['invitation', 'rules_booklet'],
                moneyAmount: null,
                copies: 1,
                boardForm: 'panels',
                invitations: 4,
            },
            locale: 'nl',
        });
    });

    describe('one run at a time', () => {
        beforeEach(() => {
            vi.useFakeTimers({ shouldAdvanceTime: true });
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        const posts = (fetchMock: FetchFake) =>
            requestsOf(fetchMock)
                .filter(({ init }) => init.method === 'POST')
                .map(({ init }) => jsonOf(init));

        it('puts a part in line while a run is busy and starts it when that run is done', async () => {
            const user = userEvent.setup({
                advanceTimers: (ms) => vi.advanceTimersByTime(ms),
            });
            const fetchMock = stubFetch((_url: string, init?: RequestInit) =>
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
                            boardForm: 'panels',
                            invitations: 4,
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
            stubFetch(() => new Promise<Response>(() => undefined));

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
            stubFetch(() => new Promise<Response>(() => undefined));

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
            const fetchMock = stubFetch(() => {
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
                            boardForm: 'panels',
                            invitations: 4,
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
                            boardForm: 'panels',
                            invitations: 4,
                        },
                        locale: 'nl',
                    },
                ]);
            });
            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        });
    });
});
