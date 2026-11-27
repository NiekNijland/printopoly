import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { MoneyStyle } from '@/lib/render/edition-part-styles';

import { StyledNoteFace } from './banknote-styles';

const face = (style: MoneyStyle) =>
    render(
        <StyledNoteFace
            style={style}
            value={50}
            paper="#F3F0A8"
            bankName="De bank"
            editionName="Zaterdagclub"
        />,
    ).container;

const has = (container: HTMLElement, selector: string) =>
    container.querySelector(selector) !== null;

describe('StyledNoteFace', () => {
    it('draws the engraved Vintage face with an oval and four cartouches', () => {
        const container = face('vintage');

        expect(has(container, '[data-oval]')).toBe(true);
        expect(container.querySelectorAll('[data-corner]')).toHaveLength(4);
        expect(has(container, '[data-slot="quarter"]')).toBe(false);
        expect(has(container, '[data-slot="badge"]')).toBe(false);
    });

    it('draws the flat Modern face with a quarter disc and a panel', () => {
        const container = face('modern');

        expect(has(container, '[data-slot="quarter"]')).toBe(true);
        expect(has(container, '[data-slot="panel"]')).toBe(true);
        expect(has(container, '[data-oval]')).toBe(false);
        expect(has(container, '[data-slot="badge"]')).toBe(false);
    });

    it('draws the playful face with a badge and the value in two bubbles', () => {
        const container = face('playful');

        expect(has(container, '[data-slot="badge"]')).toBe(true);
        expect(
            container.querySelectorAll('[data-slot="corner-value"]'),
        ).toHaveLength(2);
        expect(has(container, '[data-slot="quarter"]')).toBe(false);
    });

    it.each<MoneyStyle>(['vintage', 'modern', 'playful'])(
        'passes the value and the edition name on in %s',
        (style) => {
            const container = face(style);

            expect(
                container.querySelector('[data-slot="value"]')?.textContent,
            ).toBe('€ 50');
            expect(
                container.querySelector('[data-slot="edition-name"]')
                    ?.textContent,
            ).toBe('Zaterdagclub');
        },
    );
});
