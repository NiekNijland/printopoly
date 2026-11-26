import type { FreeLayer } from '@/lib/render/edition-types';
import { scaleLayer } from '@/lib/render/editor-layers';

import { dragged, keyed, startDrag } from './layer-gestures';

const layer: FreeLayer = {
    id: 'layer-1',
    kind: 'text',
    text: 'Hoi',
    x: 50,
    y: 50,
    w: 60,
    h: 12,
};
const area = { w: 200, h: 200 };

const box = (): HTMLElement => {
    const node = document.createElement('div');
    node.getBoundingClientRect = () =>
        DOMRect.fromRect({ x: 0, y: 0, width: 100, height: 100 });

    return node;
};

describe('startDrag', () => {
    it('starts a move at the pointer, a scale and a turn around the centre of the box', () => {
        expect(startDrag(layer, 'move', box(), 3, 4)).toEqual({
            mode: 'move',
            x: 3,
            y: 4,
        });
        expect(startDrag(layer, 'scale', box(), 50, 50)).toEqual({
            mode: 'scale',
            cx: 50,
            cy: 50,
            layer,
            distance: 1,
        });
        expect(startDrag(layer, 'rotate', box(), 0, 0)).toEqual({
            mode: 'rotate',
            cx: 50,
            cy: 50,
        });
    });
});

describe('dragged', () => {
    it('moves by the pointer in mm, scales by the distance and turns to the pointer', () => {
        expect(
            dragged(
                { mode: 'move', x: 0, y: 0 },
                layer,
                { clientX: 8, clientY: -4 },
                4,
                area,
            ),
        ).toMatchObject({ x: 52, y: 49 });
        expect(
            dragged(
                { mode: 'scale', cx: 0, cy: 0, distance: 10, layer },
                layer,
                { clientX: 0, clientY: 20 },
                4,
                area,
            ),
        ).toMatchObject({ w: 120 });
        expect(
            dragged(
                { mode: 'rotate', cx: 0, cy: 0 },
                layer,
                { clientX: 0, clientY: 10 },
                4,
                area,
            ).rotation,
        ).toBeCloseTo(180);
    });
});

describe('keyed', () => {
    it('answers the keys of a layer and nothing else', () => {
        expect(
            keyed(layer, { key: 'ArrowDown', shiftKey: false }, area),
        ).toMatchObject({ y: 51 });
        expect(
            keyed(layer, { key: 'ArrowLeft', shiftKey: true }, area),
        ).toMatchObject({ x: 45 });
        expect(keyed(layer, { key: '=', shiftKey: false }, area)).toMatchObject(
            { w: 66 },
        );
        expect(keyed(layer, { key: '_', shiftKey: false }, area)).toEqual(
            scaleLayer(layer, 1 / 1.1, area),
        );
        expect(keyed(layer, { key: '[', shiftKey: false }, area)).toMatchObject(
            { rotation: -5 },
        );
        expect(keyed(layer, { key: 'Backspace', shiftKey: false }, area)).toBe(
            'remove',
        );
        expect(
            keyed(layer, { key: 'a', shiftKey: false }, area),
        ).toBeUndefined();
    });
});
