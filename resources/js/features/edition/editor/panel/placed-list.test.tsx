import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithI18n } from '@/testing/render';

import { PlacedList } from './placed-list';

type Props = Parameters<typeof PlacedList>[0];

const named = {
    key: 'space.39',
    label: 'Kroonplein',
    file: 'Kroonplein.jpg',
    placement: {},
    how: 'name',
    replaced: false,
} as unknown as Props['placed']['items'][number];

const batch = (missed: Props['placed']['missed']): Props['placed'] => {
    return {
        kind: 'batch',
        items: [named],
        missed,
        note: '',
        undone: false,
        pool: [{ key: 'space.39', label: 'Kroonplein' }],
    };
};

const renderList = (placed: Props['placed']) => {
    Element.prototype.scrollIntoView = vi.fn();
    renderWithI18n(
        <PlacedList
            placed={placed}
            onUndo={vi.fn()}
            onClose={vi.fn()}
            onMove={vi.fn()}
            onPlaceMissed={vi.fn()}
        />,
    );
};

describe('PlacedList', () => {
    it('says every photo was found by name only when none is left without a place (round 7)', () => {
        renderList(batch([]));
        expect(screen.getByText('Allemaal op naam gevonden')).toBeVisible();
    });

    it('counts the photos found by name when one found no place', () => {
        renderList(
            batch([
                {
                    file: new File(['x'], 'IMG_4021.jpg'),
                    name: 'IMG_4021.jpg',
                    url: '',
                },
            ]),
        );
        expect(
            screen.queryByText('Allemaal op naam gevonden'),
        ).not.toBeInTheDocument();
        expect(screen.getByText('1 op naam gevonden')).toBeVisible();
    });
});
