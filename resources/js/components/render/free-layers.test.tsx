import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FreeLayers, layerLook, type RenderLayer } from './free-layers';

const layerBox = (container: HTMLElement, id: string) =>
    container.querySelector<HTMLElement>(`[data-layer="${id}"]`);

describe('layerLook', () => {
    it('keeps only what is set', () => {
        expect(layerLook({})).toEqual({});
        expect(
            layerLook({ color: '#112233', font: 'mono', align: 'right' }),
        ).toEqual({ color: '#112233', font: 'mono', align: 'right' });
        expect(layerLook({ font: 'body' })).toEqual({ font: 'body' });
    });
});

describe('FreeLayers', () => {
    const layers: RenderLayer[] = [
        {
            id: 'a',
            kind: 'text',
            text: 'Welkom thuis',
            x: 5,
            y: 6,
            w: 40,
            h: 8,
        },
        {
            id: 'b',
            kind: 'text',
            text: 'Klein',
            x: 0,
            y: 0,
            w: 20,
            h: 2,
            rotation: 15,
            color: '#C8321F',
            font: 'mono',
            align: 'left',
        },
        {
            id: 'c',
            kind: 'photo',
            photo: { src: 'layer.jpg' },
            x: 10,
            y: 20,
            w: 30,
            h: 20,
            rotation: 0,
        },
        { id: 'd', kind: 'photo', x: 0, y: 0, w: 5, h: 5 },
    ];

    it('places each layer in mm and turns it around its middle', () => {
        const { container } = render(<FreeLayers layers={layers} />);

        expect(layerBox(container, 'a')?.style.left).toBe('5mm');
        expect(layerBox(container, 'a')?.style.top).toBe('6mm');
        expect(layerBox(container, 'a')?.style.width).toBe('40mm');
        expect(layerBox(container, 'a')?.style.transform).toBe('');
        expect(layerBox(container, 'b')?.style.transform).toBe('rotate(15deg)');
        expect(layerBox(container, 'c')?.style.transform).toBe('');
    });

    it('draws text layers as fitted text, centred in the heading font by default', () => {
        const { container, getByText } = render(<FreeLayers layers={layers} />);
        const text = container.querySelector<HTMLElement>(
            '[data-slot="layer-a"]',
        );

        expect(getByText('Welkom thuis')).toBeInTheDocument();
        expect(text?.style.justifyContent).toBe('center');
        expect(getByText('Welkom thuis').style.fontWeight).toBe('800');
    });

    it('uses the own colour, letter and alignment of a text layer', () => {
        const { getByText, container } = render(<FreeLayers layers={layers} />);
        const box = container.querySelector<HTMLElement>(
            '[data-slot="layer-b"]',
        );

        expect(getByText('Klein').style.color).toBe('#C8321F');
        expect(getByText('Klein').style.fontFamily).toContain('IBM Plex Mono');
        expect(box?.style.justifyContent).toBe('flex-start');
    });

    it('draws a photo layer with its photo, and nothing for an empty one', () => {
        const { container } = render(<FreeLayers layers={layers} />);

        expect(
            layerBox(container, 'c')?.querySelector('img')?.getAttribute('src'),
        ).toBe('layer.jpg');
        expect(layerBox(container, 'd')?.childElementCount).toBe(0);
    });
});
