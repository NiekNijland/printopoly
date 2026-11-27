import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import PrintShow from '@/pages/print/show';
import { jsonOf, requestsOf, stubFetch } from '@/testing/fetch';
import { partRow, printJob, printPageEdition } from '@/testing/print-job';
import { renderWithI18n } from '@/testing/render';
import type { PrintPart } from '@/types/generated';

vi.mock('@/lib/echo', () => ({ getEcho: () => null }));

const row = partRow;
const job = printJob;
const edition = printPageEdition;

describe('the choices of the print page', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        window.localStorage.clear();
        window.history.replaceState(null, '', '/nl/print?set=printer');
    });

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
                            boardForm: 'panels',
                            invitations: 4,
                        },
                        home: {
                            skipped: [],
                            moneyAmount: null,
                            copies: 1,
                            boardForm: 'panels',
                            invitations: 4,
                        },
                    },
                }}
                edition={edition}
            />,
        );

        expect(
            screen.getByText(
                '3060 biljetten voor 10 sets (306 per set), elke set met een setteken · 22 vellen SRA3 per set, iets groter dan A3',
            ),
        ).toBeInTheDocument();
        expect(
            screen.getAllByText(/met 3060 biljetten/).length,
        ).toBeGreaterThan(0);
    });

    it('chooses the form of the board and the number of invitations in their rows (B243, B244)', async () => {
        const made = job([]);
        const saved = vi
            .spyOn(window, 'fetch')
            .mockResolvedValue(
                new Response(JSON.stringify(made.status), { status: 200 }),
            );

        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={{
                    ...made,
                    choices: {
                        ...made.choices,
                        printer: {
                            ...made.choices.printer,
                            boardForm: 'whole',
                            invitations: 80,
                        },
                    },
                }}
                edition={{
                    ...edition,
                    parts: [...edition.parts, 'invitation'],
                }}
            />,
        );

        expect(
            screen.getByRole('radio', { name: 'Een heel bord' }),
        ).toHaveAttribute('aria-checked', 'true');
        expect(
            screen.getByText(
                '1 stuk · 500 × 500 mm · 3 mm afloop en snijtekens',
            ),
        ).toBeInTheDocument();
        expect(screen.getByText(/Eén stuk van 50 × 50 cm/)).toBeInTheDocument();
        expect(
            screen.getByText(/^80 kaarten A6 van één ontwerp/),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('textbox', { name: 'Hoeveel uitnodigingen?' }),
        ).toHaveValue('80');

        fireEvent.click(
            screen.getByRole('button', { name: 'Een uitnodiging meer' }),
        );
        // Saved after the choices before it (integration r7): on the next tick.
        await waitFor(() => {
            expect(saved).toHaveBeenCalledWith(
                expect.stringContaining('/choices'),
                expect.objectContaining({
                    body: JSON.stringify({
                        set: 'printer',
                        invitations: 81,
                    }),
                }),
            );
        });
        saved.mockRestore();
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
                            boardForm: 'panels',
                            invitations: 4,
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

    it('chooses how much money to print in the money row (B156)', async () => {
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
    });

    it('saves three sets in order before the run, so the cards and money never come out as two (B242, integration r7)', async () => {
        const user = userEvent.setup();
        const answer = () =>
            new Response(JSON.stringify(job([]).status), { status: 200 });
        let release: () => void = () => undefined;
        const first = new Promise<Response>((resolve) => {
            release = () => {
                resolve(answer());
            };
        });
        let choiceCalls = 0;
        const fetchMock = stubFetch((url: string) => {
            if (url === '/api/print/t/choices') {
                choiceCalls += 1;

                // The first save is slow on the way: "2 sets" may not land after "3 sets".
                return choiceCalls === 1 ? first : Promise.resolve(answer());
            }

            return Promise.resolve(answer());
        });

        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={job([])}
                edition={edition}
            />,
        );
        await user.click(screen.getByRole('button', { name: 'Een set meer' }));
        await user.click(screen.getByRole('button', { name: 'Een set meer' }));
        await user.click(
            screen.getByRole('button', { name: 'Drukkerij-set maken' }),
        );

        const bodies = () =>
            requestsOf(fetchMock).map(({ url, init }) => ({
                url,
                body: jsonOf(init),
            }));
        // Nothing else goes out while the first choice is on its way.
        expect(bodies()).toEqual([
            {
                url: '/api/print/t/choices',
                body: { set: 'printer', copies: 2 },
            },
        ]);

        await act(async () => {
            release();
            await first;
        });
        await waitFor(() => {
            expect(bodies().map(({ url }) => url)).toEqual([
                '/api/print/t/choices',
                '/api/print/t/choices',
                '/api/print/t/generate',
            ]);
        });
        expect(bodies()[1]?.body).toEqual({ set: 'printer', copies: 3 });
        expect(bodies()[2]?.body).toMatchObject({ choices: { copies: 3 } });
    });
});
