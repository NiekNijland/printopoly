import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { FreeLayer } from '@/lib/render/edition-types';
import { photo } from '@/testing/edition-test-utils';
import { renderWithI18n } from '@/testing/render';

import { LayerList } from './layer-list';

const text: FreeLayer = {
    id: 'layer-1',
    kind: 'text',
    text: 'Hoi',
    font: 'mono',
    color: '#FF0000',
    x: 10,
    y: 10,
    w: 60,
    h: 12,
};
const picture: FreeLayer = {
    id: 'layer-2',
    kind: 'photo',
    photo: { ...photo('p9'), grayscale: true },
    x: 10,
    y: 40,
    w: 40,
    h: 30,
};

const setup = (title?: string, selectedId: string | null = 'layer-1') => {
    const onSelect = vi.fn();
    const onRemove = vi.fn();
    const onTitle = vi.fn();
    renderWithI18n(
        <LayerList
            layers={[text, picture]}
            selectedId={selectedId}
            photos={
                new Map([
                    [
                        'p9',
                        { id: 'p9', url: 'blob:p9', width: 400, height: 300 },
                    ],
                ])
            }
            title={title}
            onSelect={onSelect}
            onRemove={onRemove}
            onTitle={onTitle}
        />,
    );

    return { onSelect, onRemove, onTitle };
};

describe('LayerList', () => {
    it('shows the top layer first with its preview, and marks the chosen one', () => {
        setup();
        const [top, second] = screen.getAllByRole('listitem');

        expect(top).toHaveAttribute('data-layer-row', 'photo');
        expect(top?.querySelector('img')).toHaveStyle({
            filter: 'grayscale(1)',
        });
        expect(second).toHaveTextContent('AaHoi');
        expect(screen.getByText('Aa')).toHaveClass('font-mono');
        expect(screen.getByText('Aa')).toHaveStyle({ color: '#FF0000' });
        expect(screen.getByRole('button', { name: /Hoi/ })).toHaveAttribute(
            'aria-current',
            'true',
        );
        expect(screen.queryByText(/Titel/)).not.toBeInTheDocument();
    });

    it('chooses and removes a layer', async () => {
        const { onSelect, onRemove } = setup();

        await userEvent.click(screen.getByRole('button', { name: 'Foto' }));
        await userEvent.click(
            screen.getAllByRole('button', { name: 'Laag weghalen' })[0] ??
                document.body,
        );

        expect(onSelect).toHaveBeenCalledWith('layer-2');
        expect(onRemove).toHaveBeenCalledWith('layer-2');
    });

    it('offers the title as a row that opens its controls', async () => {
        const { onSelect, onTitle } = setup('Zaterdagclub', 'title');
        const row = screen.getByRole('button', {
            name: 'Titel: Zaterdagclub',
        });

        expect(row).toHaveAttribute('aria-current', 'true');

        await userEvent.click(row);

        expect(onSelect).toHaveBeenCalledWith('title');
        expect(onTitle).toHaveBeenCalledTimes(1);
    });
});
