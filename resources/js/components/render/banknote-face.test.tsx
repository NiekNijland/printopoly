import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NoteFace } from './banknote-face';

const slotText = (container: HTMLElement, name: string) =>
    [...container.querySelectorAll(`[data-slot="${name}"]`)].map(
        (node) => node.textContent,
    );

describe('NoteFace', () => {
    it('draws the guilloche, the oval, the corners, the icons and the words of the theme note', () => {
        const { container } = render(
            <NoteFace
                value={500}
                paper="#F3F0A8"
                bankName="Bank van de club"
                editionName="Zaterdagclub"
            />,
        );

        expect(
            container.querySelector('[data-pattern="rings"]'),
        ).not.toBeNull();
        expect(container.querySelector('[data-oval]')).not.toBeNull();
        expect(container.querySelectorAll('[data-corner]')).toHaveLength(4);
        expect(container.querySelectorAll('[data-note-icon]')).toHaveLength(2);
        expect(slotText(container, 'value')).toEqual(['€\u00A0500']);
        expect(slotText(container, 'corner-value')).toEqual(['500', '500']);
        expect(slotText(container, 'bank-name')).toEqual(['Bank van de club']);
        expect(slotText(container, 'edition-name')).toEqual(['Zaterdagclub']);
        expect(slotText(container, 'play-money')).toEqual(['speelgeld']);
    });

    it('puts a framed photo in the oval and the amount on a plate below it', () => {
        const { container } = render(
            <NoteFace value={20} paper="#F3F0A8" photo={{ src: 'a.jpg' }} />,
        );

        expect(
            container.querySelector('[data-slot="oval-photo"]'),
        ).not.toBeNull();
        expect(slotText(container, 'value')).toEqual(['€\u00A020']);
        expect(slotText(container, 'value-words')).toEqual(['Twintig']);
        expect(slotText(container, 'play-money')).toEqual([]);
    });
});
