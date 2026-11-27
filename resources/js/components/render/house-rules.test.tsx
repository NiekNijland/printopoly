import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HouseRulesCard, houseRuleLines } from './house-rules';

const slot = (container: HTMLElement, name: string) =>
    container.querySelector<HTMLElement>(`[data-slot="${name}"]`);

describe('houseRuleLines', () => {
    it('keeps one trimmed rule per line and drops empty lines', () => {
        expect(
            houseRuleLines('  Vrij parkeren pakt de pot \n\n\nGeen lenen  '),
        ).toEqual(['Vrij parkeren pakt de pot', 'Geen lenen']);
        expect(houseRuleLines('')).toEqual([]);
    });
});

describe('HouseRulesCard', () => {
    it('draws a rounded card with the title, the edition and the numbered rules', () => {
        const { container } = render(
            <HouseRulesCard
                text={'Vrij parkeren pakt de pot\n\nGeen lenen'}
                editionName="Zaterdagclub"
                theme="classic"
                locale="nl"
            />,
        );
        const card = container.querySelector<HTMLElement>(
            '[data-element="house-rules"]',
        );

        expect(card?.style.width).toBe('63mm');
        expect(card?.style.borderRadius).toBe('3mm');
        expect(slot(container, 'title')).toHaveTextContent('Huisregels');
        expect(slot(container, 'edition')).toHaveTextContent('Zaterdagclub');
        expect(slot(container, 'text')?.textContent).toBe(
            '1. Vrij parkeren pakt de pot\n2. Geen lenen',
        );
        expect(slot(container, 'text')?.style.top).toBe('24mm');
        expect(container.querySelector('[data-photo]')).toBeNull();
    });

    it('puts a photo under the title and moves the rules down', () => {
        const { container } = render(
            <HouseRulesCard
                text="Geen lenen"
                editionName="Club"
                photo={{ src: 'rules.jpg' }}
                theme="gala"
                locale="en"
                bleedMm={3}
            />,
        );

        expect(slot(container, 'title')).toHaveTextContent('House rules');
        expect(container.querySelector('[data-photo] img')).toHaveAttribute(
            'src',
            'rules.jpg',
        );
        expect(slot(container, 'text')?.style.top).toBe('49mm');
        expect(container.querySelector('[data-ornament]')).not.toBeNull();
    });
});
