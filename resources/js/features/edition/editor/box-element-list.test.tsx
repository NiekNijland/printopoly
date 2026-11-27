import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditionBus } from '@/features/edition/bus';
import { EditionSession } from '@/features/edition/session';
import { MemoryEditionStorage } from '@/lib/render/edition-storage';
import { photo } from '@/testing/edition-test-utils';
import { installMemoryServices, sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { ElementList } from './element-list';

describe('ElementList box (R6)', () => {
    it('shows the photo of a pawn in its round token, and the grey token without one (Sara, Kees)', () => {
        const edition = {
            ...sampleEdition({ parts: { pawns: true } }),
            elements: { 'pawn.01': { photo: photo('face') } },
        };

        renderWithI18n(
            <ElementList
                tab="box"
                edition={edition}
                interfaceLanguage="nl"
                selected="box_lid"
                onSelect={() => undefined}
                warned={new Set()}
                photos={
                    new Map([
                        [
                            'face',
                            {
                                id: 'face',
                                url: 'blob:face',
                                width: 800,
                                height: 1000,
                            },
                        ],
                    ])
                }
            />,
        );

        expect(
            document
                .querySelector('[data-pawn-token="pawn.01"] img')
                ?.getAttribute('src'),
        ).toBe('blob:face');
        expect(
            document.querySelector('[data-pawn-token="pawn.02"] img'),
        ).toBeNull();
    });

    it('brings a hidden pawn back', async () => {
        installMemoryServices();
        const storage = new MemoryEditionStorage();
        const edition = {
            ...sampleEdition({ parts: { pawns: true } }),
            elements: { 'pawn.06': { hidden: true } },
        };
        await storage.createEdition(edition);
        const session = new EditionSession(edition, {
            storage,
            bus: new EditionBus(null, 'w'),
            now: () => 5,
            debounceMs: 1000,
        });
        const onSelect = vi.fn();
        renderWithI18n(
            <ElementList
                tab="box"
                edition={edition}
                interfaceLanguage="nl"
                selected="box_lid"
                onSelect={onSelect}
                warned={new Set()}
                session={session}
            />,
        );

        expect(screen.getByText(/Pionnen · 7 van 8/)).toBeInTheDocument();

        await userEvent.click(
            screen.getByRole('button', { name: 'Pion toevoegen' }),
        );

        expect(session.edition.elements['pawn.06']?.hidden).toBeUndefined();
        expect(onSelect).toHaveBeenCalledWith('pawn.06');
    });
});
