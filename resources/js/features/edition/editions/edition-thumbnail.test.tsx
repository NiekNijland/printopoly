import { render, screen, waitFor } from '@testing-library/react';

import { installMemoryServices, sampleEdition } from '@/testing/editions';

import { EditionThumbnail } from './edition-thumbnail';

describe('EditionThumbnail', () => {
    it('shows an empty board of the given size until the edition is read', () => {
        installMemoryServices();

        render(<EditionThumbnail editionId="nope" size={100} label="Club" />);

        const image = screen.getByRole('img', { name: 'Club' });
        expect(image.style.width).toBe('100px');
        expect(image).toBeEmptyDOMElement();
    });

    it('draws the board of the edition, scaled into the square', async () => {
        const { storage } = installMemoryServices();
        const edition = sampleEdition({ id: 'e1' });
        edition.elements['space.01'] = { name: 'Beukenlaan' };
        await storage.createEdition(edition);

        render(<EditionThumbnail editionId="e1" label="Zaterdagclub" />);

        const image = screen.getByRole('img', { name: 'Zaterdagclub' });
        await waitFor(() => expect(image).toHaveTextContent('Beukenlaan'));
        const board = image.firstElementChild;
        const outer = edition.boardProfile.outer;
        expect(image.style.width).toBe('168px');
        expect(board instanceof HTMLElement ? board.style.transform : '').toBe(
            `scale(${String(168 / ((outer * 96) / 25.4))})`,
        );
    });

    it('draws again after a save', async () => {
        const { storage } = installMemoryServices();
        await storage.createEdition(sampleEdition({ id: 'e1' }));
        const { rerender } = render(
            <EditionThumbnail editionId="e1" version={0} label="Club" />,
        );
        await waitFor(() =>
            expect(
                screen.getByRole('img', { name: 'Club' }),
            ).not.toBeEmptyDOMElement(),
        );

        await storage.applyPatch(
            'e1',
            { baseRevision: 0, elements: { 'space.01': { name: 'Kerkpad' } } },
            2_000,
        );
        rerender(<EditionThumbnail editionId="e1" version={1} label="Club" />);

        await waitFor(() =>
            expect(screen.getByRole('img', { name: 'Club' })).toHaveTextContent(
                'Kerkpad',
            ),
        );
    });
});
