import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { EditionSession } from '@/features/edition/session';
import { resolveEdition } from '@/lib/render/edition-resolve';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import { photo } from '@/testing/edition-test-utils';
import { sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { BoardNavigator } from './board-navigator';
import { GroupColorField } from './style-controls';

describe('the colour of a street group (bug 32, ronde 4)', () => {
    it('shows the colour the board really prints, and its swatch as chosen, in Riso', () => {
        const edition = sampleEdition({ theme: 'riso' });
        const resolved = resolveEdition(edition);

        // Riso prints the brown group purple: no longer the brown of Klassiek.
        expect(
            resolved.groups.find((group) => group.id === 'brown')?.color,
        ).toBe('#9A4E8E');

        renderWithI18n(
            <GroupColorField
                session={{} as EditionSession}
                edition={edition}
                resolved={resolved}
                group="brown"
                label="Groepskleur"
            />,
        );

        expect(screen.getByLabelText('Groepskleur: hex')).toHaveValue(
            '#9A4E8E',
        );
        const pressed = screen
            .getAllByRole('button')
            .filter((button) => button.getAttribute('aria-pressed') === 'true');
        expect(pressed).toHaveLength(1);
    });

    it('offers the colours the Strak board uses, so a group in its own colour shows as chosen', () => {
        const edition = sampleEdition({ theme: 'strak' });

        renderWithI18n(
            <GroupColorField
                session={{} as EditionSession}
                edition={edition}
                resolved={resolveEdition(edition)}
                group="darkblue"
                label="Groepskleur"
            />,
        );

        expect(screen.getByLabelText('Groepskleur: hex')).toHaveValue(
            '#0072BB',
        );
        expect(
            screen
                .getAllByRole('button')
                .filter(
                    (button) => button.getAttribute('aria-pressed') === 'true',
                ),
        ).toHaveLength(1);
    });
});

describe('the mini board (ronde 4, Mila)', () => {
    it('shows the photos of the spaces as small blocks', () => {
        const base = sampleEdition();
        const edition = {
            ...base,
            elements: { ...base.elements, 'space.01': { photo: photo('kat') } },
        };
        const photos: PhotoInfos = new Map([
            [
                'kat',
                {
                    id: 'kat',
                    url: 'blob:kat',
                    width: 800,
                    height: 600,
                },
            ],
        ]);

        renderWithI18n(
            <BoardNavigator
                edition={edition}
                interfaceLanguage="nl"
                selected="board_center"
                onSelect={() => undefined}
                warned={new Set()}
                photos={photos}
            />,
        );

        const thumbs = screen.getAllByTestId('mini-space-photo');
        expect(thumbs).toHaveLength(1);
        expect(thumbs[0]).toHaveAttribute('src', 'blob:kat');
        // The centre keeps the colour of the board when it is chosen, instead of turning white.
        const centre = screen.getByTestId('mini-center').parentElement;
        expect(centre?.style.background).not.toBe('');
    });

    it('keeps a photo on a side row inside its own space (R5-06)', () => {
        const base = sampleEdition();
        const edition = {
            ...base,
            elements: {
                ...base.elements,
                'space.01': { photo: photo('kat') },
                'space.11': { photo: photo('kat') },
                'space.21': { photo: photo('kat') },
                'space.31': { photo: photo('kat') },
            },
        };
        const photos: PhotoInfos = new Map([
            ['kat', { id: 'kat', url: 'blob:kat', width: 600, height: 900 }],
        ]);

        renderWithI18n(
            <BoardNavigator
                edition={edition}
                interfaceLanguage="nl"
                selected="board_center"
                onSelect={() => undefined}
                warned={new Set()}
                photos={photos}
            />,
        );

        const thumbs = screen.getAllByTestId('mini-space-photo');
        expect(thumbs).toHaveLength(4);
        for (const thumb of thumbs) {
            // A size on both axes, within the cell: never the photo's own width.
            const left = parseFloat(thumb.style.left);
            const top = parseFloat(thumb.style.top);
            const width = parseFloat(thumb.style.width);
            const height = parseFloat(thumb.style.height);
            expect(thumb.style.width).toMatch(/%$/);
            expect(thumb.style.height).toMatch(/%$/);
            expect(left + width).toBeLessThanOrEqual(100);
            expect(top + height).toBeLessThanOrEqual(100);
        }
        // On the right column the photo stays clear of the colour band on its left.
        expect(thumbs[3]?.style.left).toBe('26%');
    });
});
