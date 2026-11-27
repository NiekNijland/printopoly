import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import PrintShow from '@/pages/print/show';
import { stubFetch } from '@/testing/fetch';
import { partRow, printJob, printPageEdition } from '@/testing/print-job';
import { renderWithI18n } from '@/testing/render';

const row = partRow;
const job = printJob;
const edition = printPageEdition;

describe('the rows of the print page', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        window.localStorage.clear();
        window.history.replaceState(null, '', '/nl/print?set=printer');
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
        // A part made before a change goes in line by itself, with no button and no word "verouderd" (Niek, 22 nov).
        expect(screen.getByText('wacht op de vorige')).toBeVisible();
        expect(screen.queryByText(/verouderd/)).toBeNull();

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
            screen.queryByRole('button', { name: /Opnieuw maken: Doosdeksel/ }),
        ).toBeNull();
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
        expect(screen.getByText(/via de contactpagina/)).toBeVisible();
    });

    it('ticks a part in or out with a tap on its name or picture (R5-27)', async () => {
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
    });

    it('opens at the row the editor asked for with "niet in je set" (R6 Kees)', () => {
        window.history.replaceState(
            null,
            '',
            '/nl/print?set=printer&part=tokens',
        );
        const scrolled = vi.fn();
        const spy = vi
            .spyOn(Element.prototype, 'scrollIntoView')
            .mockImplementation(scrolled);

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
        spy.mockRestore();
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

    it('gives every kind of action one look: make is a button, the guide a link (R6 Tom, B262)', () => {
        renderWithI18n(
            <PrintShow
                localEditionId={null}
                editionData={null}
                job={job([])}
                edition={edition}
            />,
        );

        const makes = [
            screen.getByRole('button', { name: 'Proefvel maken: Proefvel' }),
            screen.getByRole('button', { name: 'Alleen dit maken: Speelgeld' }),
        ];
        for (const make of makes) {
            expect(make).toHaveAttribute('data-variant', 'secondary');
        }
        for (const guide of screen.getAllByRole('link', {
            name: /^Hoe het werkt/,
        })) {
            expect(guide).toHaveAttribute('data-variant', 'link');
        }
    });
});
