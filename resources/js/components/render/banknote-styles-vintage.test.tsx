import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { VintageNoteFace } from './banknote-styles-vintage';

const slotText = (container: HTMLElement, name: string) =>
    [...container.querySelectorAll(`[data-slot="${name}"]`)].map(
        (node) => node.textContent,
    );

describe('VintageNoteFace', () => {
    it('engraves the oval, four cartouches, the banner and the plaque', () => {
        const { container } = render(
            <VintageNoteFace
                value={500}
                paper="#F3F0A8"
                editionName="Zaterdagclub"
            />,
        );

        expect(container.querySelector('[data-oval]')).not.toBeNull();
        expect(container.querySelectorAll('[data-corner]')).toHaveLength(4);
        expect(container.querySelector('[data-slot="banner"]')).not.toBeNull();
        expect(container.querySelectorAll('[data-frame]')).toHaveLength(2);
        expect(slotText(container, 'corner-value')).toEqual([
            '500',
            '500',
            '500',
            '500',
        ]);
        expect(slotText(container, 'value')).toEqual(['€\u00A0500']);
        expect(slotText(container, 'edition-name')).toEqual(['Zaterdagclub']);
        expect(slotText(container, 'play-money')).toEqual(['speelgeld']);
    });

    it('puts a framed photo in the oval and the amount on a plate', () => {
        const { container } = render(
            <VintageNoteFace
                value={500}
                paper="#F3F0A8"
                photo={{ src: 'a.jpg' }}
            />,
        );

        expect(
            container.querySelector('[data-slot="oval-photo"]'),
        ).not.toBeNull();
        expect(
            container.querySelector('[data-slot="value-plate"]'),
        ).not.toBeNull();
        expect(slotText(container, 'play-money')).toEqual([]);
    });
});
