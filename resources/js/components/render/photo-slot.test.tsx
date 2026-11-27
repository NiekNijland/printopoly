import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PhotoSlot, isFullPhoto } from './photo-slot';

describe('PhotoSlot', () => {
    it('draws nothing without a photo', () => {
        const { container } = render(<PhotoSlot x={0} y={0} w={10} h={10} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('crops the photo to the slot in mm', () => {
        const { container, getByRole } = render(
            <PhotoSlot
                x={2}
                y={3}
                w={40}
                h={20}
                photo={{ src: 'street.jpg' }}
                alt="Onze straat"
            />,
        );
        const slot = container.querySelector<HTMLElement>('[data-photo]');
        const image = getByRole('img', { name: 'Onze straat' });

        expect(slot?.dataset.photo).toBe('filled');
        expect(slot?.dataset.w).toBe('40');
        expect(slot?.style.left).toBe('2mm');
        expect(slot?.style.top).toBe('3mm');
        expect(slot?.style.overflow).toBe('hidden');
        expect(image).toHaveAttribute('src', 'street.jpg');
        expect(image).toHaveAttribute('draggable', 'false');
        expect(image.style.width).toBe('40mm');
    });

    it('turns and greys the photo as placed', () => {
        const { getByRole } = render(
            <PhotoSlot
                x={0}
                y={0}
                w={20}
                h={20}
                alt="Foto"
                photo={{
                    src: 'a.jpg',
                    width: 1000,
                    height: 1000,
                    transform: {
                        x: 0.5,
                        y: 0.5,
                        scale: 1,
                        rotation: 90,
                        grayscale: true,
                    },
                }}
            />,
        );
        const image = getByRole('img', { name: 'Foto' });

        expect(image.style.transform).toContain('rotate(90deg)');
        expect(image.style.filter).toBe('grayscale(1)');
    });
});

describe('isFullPhoto', () => {
    it('is true only for a photo over the whole element', () => {
        expect(isFullPhoto({ src: 'a.jpg', style: 'full' })).toBe(true);
        expect(isFullPhoto({ src: 'a.jpg' })).toBe(false);
        expect(isFullPhoto(undefined)).toBe(false);
    });
});
