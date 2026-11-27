import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getServices } from '@/features/edition/editor/services';
import { setServices } from '@/features/edition/editor/testing/services';
import PrintShow from '@/pages/print/show';
import { store as storePrintJob } from '@/routes/print-jobs';
import { makeEdition, settle } from '@/testing/edition-test-utils';
import { jsonOf, requestsOf, stubFetch } from '@/testing/fetch';
import { partRow, printJob, printPageEdition } from '@/testing/print-job';
import { renderWithI18n } from '@/testing/render';

const generated = (fetchMock: ReturnType<typeof stubFetch>) =>
    requestsOf(fetchMock)
        .filter(({ url }) => url.endsWith('/generate'))
        .map(({ init }) => jsonOf(init));

describe('what the print page does by itself', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        window.localStorage.clear();
        window.history.replaceState(null, '', '/nl/print?set=printer');
    });

    it('makes a part that changed since again by itself (Niek, 22 nov)', async () => {
        const fetchMock = stubFetch(() =>
            Promise.resolve(
                new Response(
                    JSON.stringify(
                        printJob([partRow('printer', 'box_lid', 'waiting')], {
                            busy: true,
                        }).status,
                    ),
                    { status: 200 },
                ),
            ),
        );

        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={printJob([
                    partRow('printer', 'board', 'done'),
                    partRow('printer', 'box_lid', 'outdated'),
                ])}
                edition={printPageEdition}
            />,
        );

        await waitFor(() => {
            expect(generated(fetchMock)).toHaveLength(1);
        });
        expect(generated(fetchMock)[0]).toMatchObject({
            set: 'printer',
            parts: ['box_lid'],
        });
        await act(settle);
        expect(generated(fetchMock)).toHaveLength(1);
    });

    it('makes the set of an edition this browser printed before again at once (Niek, 22 nov)', async () => {
        window.history.replaceState(null, '', '/nl/print');
        const { storage } = getServices('nl');
        await storage.createEdition({
            ...makeEdition({ id: 'printededition1' }),
            revision: 4,
        });
        await storage.addPrintJob({
            token: 'b'.repeat(40),
            editionId: 'printededition1',
            revision: 2,
            createdAt: 1,
        });
        const fetchMock = stubFetch(
            () => new Promise<Response>(() => undefined),
        );

        renderWithI18n(
            <PrintShow
                localEditionId="printededition1"
                editionData={null}
                job={null}
                edition={{ name: '', cards: 0, parts: [] }}
            />,
        );

        await waitFor(() => {
            expect(
                requestsOf(fetchMock).filter(
                    ({ url }) => url === storePrintJob().url,
                ),
            ).toHaveLength(1);
        });
        setServices(null);
    });

    it('sends a request that lost the connection again once the browser is online (bug 12)', async () => {
        const user = userEvent.setup();
        let online = false;
        const onLine = vi
            .spyOn(navigator, 'onLine', 'get')
            .mockImplementation(() => online);
        const fetchMock = stubFetch((url: string) =>
            online || !url.endsWith('/generate')
                ? Promise.resolve(
                      new Response(JSON.stringify(printJob([]).status), {
                          status: 200,
                      }),
                  )
                : Promise.reject(new TypeError('Failed to fetch')),
        );

        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={printJob([])}
                edition={printPageEdition}
            />,
        );
        await user.click(
            screen.getByRole('button', { name: 'Alleen dit maken: Bord' }),
        );
        await waitFor(() => {
            expect(generated(fetchMock)).toHaveLength(1);
        });
        expect(screen.getByRole('alert')).toHaveTextContent('Geen verbinding');

        online = true;
        act(() => {
            window.dispatchEvent(new Event('online'));
        });

        await waitFor(() => {
            expect(generated(fetchMock)).toHaveLength(2);
        });
        expect(generated(fetchMock)[1]).toMatchObject({ parts: ['board'] });
        await waitFor(() => {
            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        });
        onLine.mockRestore();
    });

    it('can hand the files of a finished set to another app where the phone can (R5-30)', () => {
        vi.stubGlobal('navigator', {
            ...window.navigator,
            canShare: () => true,
        });
        const done = printPageEdition.parts.map((part) =>
            partRow('printer', part, 'done', { downloadUrl: `/dl/${part}` }),
        );

        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={printJob(done, { printerZipReady: true })}
                edition={printPageEdition}
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Alles delen' }),
        ).toBeInTheDocument();
        vi.unstubAllGlobals();
    });
});
