import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import PrintShow from '@/pages/print/show';
import { stubFetch } from '@/testing/fetch';
import { setPage } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';
import { partRow, printJob, printPageEdition } from '@/testing/print-job';
import { renderWithI18n } from '@/testing/render';

vi.mock('@/lib/echo', () => ({ getEcho: () => null }));

const row = partRow;
const job = printJob;
const edition = printPageEdition;

describe('the sets of the print page', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        window.localStorage.clear();
        window.history.replaceState(null, '', '/nl/print?set=printer');
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

    it('works in English', () => {
        setPage(fakePage({ locale: 'en' }));
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

    it('shares the files of the set one by one where the phone can, with the ZIP small beside it (R5-30)', async () => {
        const user = userEvent.setup();
        const share = vi.fn<(data: ShareData) => Promise<void>>(() =>
            Promise.resolve(),
        );
        vi.stubGlobal('navigator', {
            ...window.navigator,
            canShare: () => true,
            share,
        });
        stubFetch((url: string) =>
            Promise.resolve(
                new Response(new Blob(['%PDF'], { type: 'application/pdf' }), {
                    status: 200,
                    headers: {
                        'Content-Disposition': `attachment; filename="zaterdagclub-${url.split('/').pop() ?? ''}.pdf"`,
                    },
                }),
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
        const shared = share.mock.calls[0]?.[0];
        expect(shared?.files?.map((file) => file.name)).toEqual([
            'zaterdagclub-board.pdf',
            'zaterdagclub-cards.pdf',
            'zaterdagclub-money.pdf',
            'zaterdagclub-tokens.pdf',
            'zaterdagclub-box_lid.pdf',
        ]);
        expect(shared?.title).toBe('Zaterdagclub');
        expect(
            screen.getByRole('link', {
                name: 'Drukkerij-set downloaden (ZIP)',
            }),
        ).toHaveAttribute('href', '/zip/printer');
    });

    it('shares the picture of the invitation, from its row and with Alles delen (R6 Sara)', async () => {
        const user = userEvent.setup();
        const share = vi.fn<(data: ShareData) => Promise<void>>(() =>
            Promise.resolve(),
        );
        vi.stubGlobal('navigator', {
            ...window.navigator,
            canShare: () => true,
            share,
        });
        stubFetch((url: string) =>
            Promise.resolve(
                url.startsWith('/img/')
                    ? new Response(new Blob(['PNG'], { type: 'image/png' }), {
                          status: 200,
                          headers: {
                              'Content-Disposition':
                                  'attachment; filename="zaterdagclub-uitnodiging.png"',
                          },
                      })
                    : new Response(
                          new Blob(['%PDF'], { type: 'application/pdf' }),
                          { status: 200 },
                      ),
            ),
        );
        const withInvitation: typeof edition = {
            ...edition,
            parts: [...edition.parts, 'invitation'],
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
        const one = share.mock.calls[0]?.[0];
        expect(one?.files?.map((file) => [file.name, file.type])).toEqual([
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
        const both = share.mock.calls[1]?.[0];
        expect(both?.files?.map((file) => file.name)).toContain(
            'zaterdagclub-uitnodiging.png',
        );
        expect(both?.files?.map((file) => file.name)).toContain(
            'invitation.pdf',
        );
    });
});
