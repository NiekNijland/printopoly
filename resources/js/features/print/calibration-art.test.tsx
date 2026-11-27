import { render, screen } from '@testing-library/react';

import { resolveEdition } from '@/lib/render/edition-resolve';
import type { PhotoSource } from '@/lib/render/photo';
import type { PageItem } from '@/lib/render/print-composition';
import { makeEdition } from '@/testing/edition-test-utils';

import { CalibrationArt } from './calibration-art';

const item = (id: string): PageItem => ({
    id,
    kind: 'calibration',
    elementKey: null,
    label: id,
    bleed: { x: 0, y: 0, w: 100, h: 20 },
    trim: { x: 0, y: 0, w: 100, h: 20 },
});

const resolved = (() => {
    const edition = makeEdition();
    edition.elements['space.01'] = { name: 'Beukenlaan' };

    return resolveEdition(edition);
})();

describe('CalibrationArt', () => {
    it('draws a ruler of 100 mm with a tick per millimetre and a number per centimetre', () => {
        const { container } = render(
            <CalibrationArt
                item={item('ruler')}
                resolved={resolved}
                label="Liniaal: 10 cm"
            />,
        );

        const parts = container.firstElementChild?.children ?? [];
        expect(parts).toHaveLength(1 + 101 + 11 + 1);
        const styleOf = (index: number): CSSStyleDeclaration | undefined => {
            const part = parts[index];

            return part instanceof HTMLElement ? part.style : undefined;
        };
        expect(styleOf(0)?.width).toBe('100mm');
        expect(styleOf(1)?.left).toBe('-0.1mm');
        expect(styleOf(1)?.height).toBe('6mm');
        expect(styleOf(6)?.height).toBe('4mm');
        expect(styleOf(2)?.height).toBe('2.5mm');
        expect(parts[102]).toHaveTextContent('0');
        expect(parts[112]).toHaveTextContent('100');
        expect(screen.getByText('Liniaal: 10 cm')).toBeInTheDocument();
    });

    it('draws the outline of a bank card with its label under it', () => {
        const { container } = render(
            <CalibrationArt
                item={item('bank-card')}
                resolved={resolved}
                label="Bankpas"
            />,
        );

        expect(container.firstElementChild?.children).toHaveLength(1);
        expect(container.querySelector('svg')).toBeNull();
        expect(screen.getByText('Bankpas')).toHaveStyle({ top: '100%' });
    });

    it('draws a normal space of the edition at true size, with its own name and photo', () => {
        const photo = vi.fn<(key: string) => PhotoSource | undefined>((key) =>
            key === 'space.01' ? { src: 'blob:space-photo' } : undefined,
        );
        const { container } = render(
            <CalibrationArt
                item={item('space')}
                resolved={resolved}
                label="Vak"
                photo={photo}
            />,
        );

        expect(container).toHaveTextContent('Beukenlaan');
        expect(photo).toHaveBeenCalledWith('space.01');
        expect(container.querySelector('image, img')).not.toBeNull();
        expect(screen.getByText('Vak')).toBeInTheDocument();
    });

    it('draws the corner space, bigger than a normal one', () => {
        const corner = render(
            <CalibrationArt
                item={item('corner-space')}
                resolved={resolved}
                label="Hoek"
            />,
        );
        const normal = render(
            <CalibrationArt
                item={item('space')}
                resolved={resolved}
                label="Vak"
            />,
        );

        const widthOf = (box: Element | null | undefined): number =>
            box instanceof HTMLElement ? parseFloat(box.style.width) : 0;
        const cornerBox = corner.container.firstElementChild?.firstElementChild;
        const normalBox = normal.container.firstElementChild?.firstElementChild;
        expect(widthOf(cornerBox)).toBeGreaterThan(widthOf(normalBox));
        expect(corner.container).not.toHaveTextContent('Beukenlaan');
    });
});
