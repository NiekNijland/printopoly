import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getServices } from '@/features/edition/editor/services';
import { setServices } from '@/features/edition/editor/testing/services';
import PrintShow from '@/pages/print/show';
import { makeEdition } from '@/testing/edition-test-utils';
import { stubFetch } from '@/testing/fetch';
import { visit } from '@/testing/inertia';
import { printJob, printPageEdition } from '@/testing/print-job';
import { renderWithI18n } from '@/testing/render';

vi.mock('@/lib/echo', () => ({ getEcho: () => null }));

const job = printJob;
const edition = printPageEdition;

describe('the edition on the print page', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        window.localStorage.clear();
        window.history.replaceState(null, '', '/nl/print?set=printer');
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
        stubFetch(() =>
            Promise.resolve(
                new Response(JSON.stringify(job([]).status), {
                    status: 200,
                }),
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
        setServices(null);
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

        // The checks run on the whole edition; with coverage on a busy runner they take several seconds.
        const review = await screen.findByRole(
            'region',
            { name: 'Nog even nakijken' },
            { timeout: 25000 },
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
        const { storage } = getServices('nl');
        const stored = { ...makeEdition({ id: 'ownedition1' }), revision: 3 };
        await storage.createEdition(stored);
        await storage.addPrintJob({
            token: 'a'.repeat(40),
            editionId: 'ownedition1',
            revision: 3,
            createdAt: 1,
        });
        stubFetch(() => Promise.resolve(new Response('{}', { status: 200 })));

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
