import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PlainNoteFace } from './banknote-plain';

const slotText = (container: HTMLElement, name: string) =>
    [...container.querySelectorAll(`[data-slot="${name}"]`)].map(
        (node) => node.textContent,
    );

describe('PlainNoteFace', () => {
    it('draws the colour block with the number and the words like a ticket', () => {
        const { container } = render(
            <PlainNoteFace
                value={100}
                color="#F3F0A8"
                editionName="Zaterdagclub"
            />,
        );

        expect(
            container.querySelector<HTMLElement>('[data-slot="value-block"]')
                ?.style.background,
        ).toBeTruthy();
        expect(slotText(container, 'corner-value')).toEqual(['100']);
        expect(slotText(container, 'value')).toEqual(['€\u00A0100']);
        expect(slotText(container, 'value-words')).toEqual(['Honderd']);
        expect(slotText(container, 'edition-name')).toEqual(['Zaterdagclub']);
        expect(slotText(container, 'play-money')).toEqual(['speelgeld']);
    });

    it('fills the block with a full photo and keeps the number on a band', () => {
        const { container } = render(
            <PlainNoteFace
                value={5}
                color="#F3F0A8"
                photo={{ src: 'a.jpg', style: 'full' }}
            />,
        );

        expect(container.querySelector('[data-slot="value-block"]')).toBeNull();
        expect(slotText(container, 'corner-value')).toEqual(['5']);
        expect(slotText(container, 'edition-name')).toEqual(['Speelgeld']);
    });
});
