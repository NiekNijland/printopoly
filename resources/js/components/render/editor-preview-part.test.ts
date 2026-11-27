import type { FreeLayer } from '@/lib/render/edition-types';

import { partSource, toRenderLayers } from './editor-preview-part';

describe('the editor preview of a part', () => {
    it('has no photo source for a placement it has no photo for', () => {
        expect(partSource(new Map())(undefined)).toBeUndefined();
    });

    it('turns free text layers into render layers with their box', () => {
        const layers: FreeLayer[] = [
            {
                id: 'l1',
                kind: 'text',
                text: 'Hallo',
                x: 1,
                y: 2,
                w: 30,
                h: 10,
                rotation: 15,
            },
        ];
        const [layer] = toRenderLayers(layers, new Map());

        expect(layer).toMatchObject({
            id: 'l1',
            kind: 'text',
            text: 'Hallo',
            x: 1,
            y: 2,
            w: 30,
            h: 10,
            rotation: 15,
        });
    });
});
