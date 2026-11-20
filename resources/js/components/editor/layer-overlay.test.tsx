import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { FreeLayer } from '@/lib/edition/types';
import { renderWithI18n } from '@/testing/render';

import { LayerOverlay } from './layer-overlay';

const layer: FreeLayer = {
    id: 'layer-1',
    kind: 'text',
    text: 'Hoi',
    x: 50,
    y: 50,
    w: 60,
    h: 12,
};

function setup() {
    const onChange = vi.fn();
    const onRemove = vi.fn();
    const onSelect = vi.fn();
    renderWithI18n(
        <LayerOverlay
            layers={[layer]}
            area={{ w: 200, h: 200 }}
            pxPerMm={4}
            selectedId="layer-1"
            onSelect={onSelect}
            onChange={onChange}
            onRemove={onRemove}
        />,
    );

    return { onChange, onRemove, onSelect };
}

describe('LayerOverlay', () => {
    it('moves a layer with the arrow keys, by 5 mm with shift', () => {
        const { onChange } = setup();
        const handle = screen.getByRole('button', { pressed: true });
        fireEvent.keyDown(handle, { key: 'ArrowRight' });
        expect(onChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ x: 51, y: 50 }),
            'layer:layer-1',
        );
        fireEvent.keyDown(handle, { key: 'ArrowUp', shiftKey: true });
        expect(onChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ x: 50, y: 45 }),
            'layer:layer-1',
        );
    });

    it('scales with plus and minus, turns with the square brackets and removes with Delete', () => {
        const { onChange, onRemove } = setup();
        const handle = screen.getByRole('button', { pressed: true });
        fireEvent.keyDown(handle, { key: '+' });
        expect(onChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ w: 66 }),
            'layer:layer-1',
        );
        fireEvent.keyDown(handle, { key: ']' });
        expect(onChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ rotation: 5 }),
            'layer:layer-1',
        );
        fireEvent.keyDown(handle, { key: 'Delete' });
        expect(onRemove).toHaveBeenCalledWith('layer-1');
    });

    it('selects a layer on focus and shows handles only for the selected one', () => {
        const { onSelect } = setup();
        fireEvent.focus(screen.getByRole('button', { pressed: true }));
        expect(onSelect).toHaveBeenCalledWith('layer-1');
    });
});
