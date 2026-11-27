import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Banknote, noteColor } from './banknote';

const note = (container: HTMLElement) =>
    container.querySelector<HTMLElement>('[data-element="banknote"]');

const slotText = (container: HTMLElement, name: string) =>
    [...container.querySelectorAll(`[data-slot="${name}"]`)].map(
        (node) => node.textContent,
    );

describe('noteColor', () => {
    it('gives the colour of a value from the game data', () => {
        expect(noteColor(500)).toBe('#F3F0A8');
        expect(noteColor(1)).toBe('#F5EBCB');
    });

    it('gives plain paper for an unknown value', () => {
        expect(noteColor(3)).toBe('#FFFDF7');
    });
});

describe('Banknote', () => {
    it('draws the theme note on the colour of its value at 130 by 60 mm', () => {
        const { container } = render(
            <Banknote value={500} theme="classic" locale="nl" />,
        );

        expect(note(container)?.style.width).toBe('130mm');
        expect(note(container)?.style.height).toBe('60mm');
        expect(note(container)?.style.background).toBe('#F3F0A8');
        expect(container.querySelector('[data-oval]')).not.toBeNull();
        expect(slotText(container, 'value')).toEqual(['€\u00A0500']);
        expect(slotText(container, 'value-words')).toEqual(['Vijfhonderd']);
    });

    it('uses its own paper colour and names', () => {
        const { container } = render(
            <Banknote
                value={20}
                color="#FFFFFF"
                bankName="Bank van de club"
                editionName="Zaterdagclub"
                theme="riso"
                locale="en"
            />,
        );

        expect(note(container)?.style.background).toBe('#FFFFFF');
        expect(slotText(container, 'bank-name')).toEqual(['Bank van de club']);
        expect(slotText(container, 'edition-name')).toEqual(['Zaterdagclub']);
        expect(slotText(container, 'value')).toEqual(['£20']);
    });

    it('prints flat in Strak: white paper with the colour as one block', () => {
        const { container } = render(
            <Banknote value={100} theme="strak" locale="nl" />,
        );

        expect(note(container)?.style.background).toBe('#FFFFFF');
        expect(
            container.querySelector('[data-slot="value-block"]'),
        ).not.toBeNull();
        expect(container.querySelector('[data-oval]')).toBeNull();
    });

    it('draws the own style of the money on the colour of its value in every theme', () => {
        const { container } = render(
            <Banknote
                value={100}
                theme="strak"
                locale="nl"
                style={{ parts: { money: 'modern' } }}
            />,
        );

        expect(note(container)?.style.background).toBe('#D3E4F5');
        expect(container.querySelector('[data-slot="quarter"]')).not.toBeNull();
        expect(container.querySelector('[data-slot="value-block"]')).toBeNull();
    });
});
