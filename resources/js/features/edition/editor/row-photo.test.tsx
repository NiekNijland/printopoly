import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';

import { sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { RowPhoto, photoDrop, type PhotoDrag } from './row-photo';

const placement = {
    photoId: 'p1',
    cx: 0.5,
    cy: 0.5,
    scale: 1,
    rotation: 0,
    grayscale: false,
};
const photos = new Map([
    ['p1', { id: 'p1', url: 'blob:p1', width: 8, height: 6 }],
]);
const withPhoto = (key: string) => ({
    ...sampleEdition(),
    elements: { [key]: { photo: placement } },
});

describe('RowPhoto', () => {
    it('shows the photo of a space small, to drag when it can swap', () => {
        const onDragStart = vi.fn<() => void>();
        renderWithI18n(
            <RowPhoto
                elementKey="space.01"
                edition={withPhoto('space.01')}
                photos={photos}
                label="Molenweg"
                draggable
                dragged={false}
                onDragStart={onDragStart}
                onDragEnd={() => undefined}
            />,
        );
        const thumb = screen.getByRole('img', { name: /Foto van Molenweg/ });

        fireEvent.dragStart(thumb, {
            dataTransfer: { setData: () => undefined, effectAllowed: 'all' },
        });

        expect(onDragStart).toHaveBeenCalledOnce();
        expect(thumb).toHaveClass('cursor-grab');
    });

    it('names a photo that cannot be dragged, and shows none without one', () => {
        const { unmount } = renderWithI18n(
            <RowPhoto
                elementKey="space.01"
                edition={withPhoto('space.01')}
                photos={photos}
                label="Molenweg"
                draggable={false}
                dragged
                onDragStart={() => undefined}
                onDragEnd={() => undefined}
            />,
        );

        expect(screen.getByRole('img', { name: 'Foto' })).toHaveClass(
            'opacity-40',
        );
        unmount();

        const { container } = renderWithI18n(
            <RowPhoto
                elementKey="space.01"
                edition={sampleEdition()}
                photos={photos}
                label="Molenweg"
                draggable
                dragged={false}
                onDragStart={() => undefined}
                onDragEnd={() => undefined}
            />,
        );
        expect(container).toBeEmptyDOMElement();
    });
});

describe('photoDrop', () => {
    const transfer = (from: string) => ({
        types: ['application/x-printopoly-photo'],
        getData: () => from,
        dropEffect: 'none',
    });

    const Row = ({
        rowKey,
        start,
        onSwapPhoto,
    }: {
        rowKey: string;
        start: PhotoDrag | null;
        onSwapPhoto: ((from: string, to: string) => void) | undefined;
    }) => {
        const [drag, setDrag] = useState(start);

        return (
            <div
                data-testid="row"
                data-over={drag?.over ?? ''}
                {...photoDrop(rowKey, drag, setDrag, onSwapPhoto)}
            />
        );
    };

    it('takes a photo dragged from another row and trades it', () => {
        const onSwapPhoto = vi.fn<(from: string, to: string) => void>();
        render(
            <Row
                rowKey="space.03"
                start={{ from: 'space.01', over: null }}
                onSwapPhoto={onSwapPhoto}
            />,
        );
        const row = screen.getByTestId('row');

        fireEvent.dragOver(row, { dataTransfer: transfer('space.01') });
        expect(row).toHaveAttribute('data-over', 'space.03');
        fireEvent.dragLeave(row);
        expect(row).toHaveAttribute('data-over', '');
        fireEvent.drop(row, { dataTransfer: transfer('space.01') });

        expect(onSwapPhoto).toHaveBeenCalledWith('space.01', 'space.03');
    });

    it('ignores a drop from the same row, and is no drop place without a swap or for a corner', () => {
        const onSwapPhoto = vi.fn<(from: string, to: string) => void>();
        const { unmount } = render(
            <Row
                rowKey="space.03"
                start={{ from: 'space.03', over: null }}
                onSwapPhoto={onSwapPhoto}
            />,
        );
        fireEvent.dragOver(screen.getByTestId('row'), {
            dataTransfer: transfer('space.03'),
        });
        fireEvent.drop(screen.getByTestId('row'), {
            dataTransfer: transfer('space.03'),
        });
        expect(onSwapPhoto).not.toHaveBeenCalled();
        unmount();

        expect(
            photoDrop('space.03', null, () => undefined, undefined),
        ).toBeUndefined();
        expect(
            photoDrop('space.00', null, () => undefined, onSwapPhoto),
        ).toBeUndefined();
    });
});
