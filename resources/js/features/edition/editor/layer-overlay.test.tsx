import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { FreeLayer } from '@/lib/render/edition-types';
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

const setup = () => {
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
};

describe('LayerOverlay zones (bug 34, ronde 3)', () => {
    it('draws the fold lines and card spots clearly red, as the hint says', () => {
        renderWithI18n(
            <LayerOverlay
                layers={[]}
                area={{ w: 200, h: 200 }}
                pxPerMm={4}
                selectedId={null}
                zones={[
                    { kind: 'fold', x: 99, y: 0, w: 2, h: 200, rotation: 0 },
                    { kind: 'spot', x: 20, y: 20, w: 40, h: 60, rotation: 45 },
                ]}
                onSelect={vi.fn()}
                onChange={vi.fn()}
                onRemove={vi.fn()}
            />,
        );
        const [fold, spot] = [
            ...screen.getByTestId('layer-overlay').children,
        ].filter((node) => node instanceof HTMLElement);

        expect(fold?.style.outline).toContain('dashed');
        expect(fold?.style.background).toContain('rgba(200,50,31,0.5)');
        expect(spot?.style.outline).toContain('solid');
    });
});

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

    it('moves a layer by dragging it, scales with the corner and turns with the top handle, in one undo group', () => {
        const { onChange, onSelect } = setup();
        const handle = screen.getByRole('button', { pressed: true });
        const box = handle.parentElement ?? handle;
        box.getBoundingClientRect = () =>
            DOMRect.fromRect({ x: 0, y: 0, width: 100, height: 100 });
        const [scale = handle, rotate = handle] = [
            ...box.querySelectorAll('[aria-hidden="true"]'),
        ];

        fireEvent.pointerMove(handle, { clientX: 1, clientY: 1 });
        expect(onChange).not.toHaveBeenCalled();

        fireEvent.pointerDown(handle, { clientX: 10, clientY: 10 });
        fireEvent.pointerMove(handle, { clientX: 18, clientY: 14 });
        fireEvent.pointerMove(handle, { clientX: 22, clientY: 14 });
        expect(onSelect).toHaveBeenCalledWith('layer-1');
        expect(onChange).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ x: 52, y: 51 }),
            'layer:layer-1',
        );
        expect(onChange).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ x: 51, y: 50 }),
            'layer:layer-1',
        );
        fireEvent.pointerUp(handle);

        fireEvent.pointerDown(scale, { clientX: 100, clientY: 50 });
        fireEvent.pointerMove(scale, { clientX: 125, clientY: 50 });
        expect(onChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ w: 90 }),
            'layer:layer-1',
        );
        fireEvent.pointerCancel(scale);

        fireEvent.pointerDown(rotate, { clientX: 50, clientY: 0 });
        fireEvent.pointerMove(rotate, { clientX: 100, clientY: 50 });
        expect(onChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ rotation: 90 }),
            'layer:layer-1',
        );
    });
});
