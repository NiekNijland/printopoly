import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PlayfulNoteFace } from './banknote-styles-playful';

const slotText = (container: HTMLElement, name: string) =>
    [...container.querySelectorAll(`[data-slot="${name}"]`)].map(
        (node) => node.textContent,
    );

describe('PlayfulNoteFace', () => {
    it('writes the amount on the badge, the value in two bubbles and the edition on the pill', () => {
        const { container } = render(
            <PlayfulNoteFace
                value={10}
                paper="#F3F0A8"
                editionName="Zaterdagclub"
            />,
        );

        expect(container.querySelector('[data-slot="badge"]')).not.toBeNull();
        expect(slotText(container, 'value')).toEqual(['€\u00A010']);
        expect(slotText(container, 'corner-value')).toEqual(['10', '10']);
        expect(slotText(container, 'value-words')).toEqual(['Tien']);
        expect(slotText(container, 'edition-name')).toEqual(['Zaterdagclub']);
        expect(slotText(container, 'play-money')).toEqual(['speelgeld']);
    });

    it('puts a framed photo in the badge', () => {
        const { container } = render(
            <PlayfulNoteFace
                value={10}
                paper="#F3F0A8"
                photo={{ src: 'a.jpg' }}
            />,
        );

        expect(
            container.querySelector('[data-slot="oval-photo"]'),
        ).not.toBeNull();
        expect(slotText(container, 'value')).toEqual(['€\u00A010']);
    });
});
