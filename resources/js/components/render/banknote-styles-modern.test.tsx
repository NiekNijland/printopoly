import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ModernNoteFace } from './banknote-styles-modern';

const slotText = (container: HTMLElement, name: string) =>
    [...container.querySelectorAll(`[data-slot="${name}"]`)].map(
        (node) => node.textContent,
    );

describe('ModernNoteFace', () => {
    it('draws a quarter disc, a panel with a bar and the value twice', () => {
        const { container } = render(
            <ModernNoteFace value={50} paper="#F3F0A8" bankName="De bank" />,
        );

        expect(container.querySelector('[data-slot="quarter"]')).not.toBeNull();
        expect(container.querySelector('[data-slot="panel"]')).not.toBeNull();
        expect(container.querySelector('[data-slot="bar"]')).not.toBeNull();
        expect(slotText(container, 'corner-value')).toEqual(['50', '50']);
        expect(slotText(container, 'value')).toEqual(['€\u00A050']);
        expect(slotText(container, 'bank-name')).toEqual(['De bank']);
        expect(slotText(container, 'edition-name')).toEqual(['Speelgeld']);
    });

    it('puts a full photo in place of the quarter disc', () => {
        const { container } = render(
            <ModernNoteFace
                value={50}
                paper="#F3F0A8"
                photo={{ src: 'a.jpg', style: 'full' }}
            />,
        );

        expect(container.querySelector('[data-slot="quarter"]')).toBeNull();
        expect(
            container.querySelector('[data-slot="photo-wash"]'),
        ).not.toBeNull();
    });
});
