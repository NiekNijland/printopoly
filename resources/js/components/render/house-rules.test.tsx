import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HouseRulesCard } from './house-rules';

const slot = (container: HTMLElement, name: string) =>
    container.querySelector<HTMLElement>(`[data-slot="${name}"]`);

const rulesOf = (text: string) =>
    slot(
        render(
            <HouseRulesCard
                text={text}
                editionName="Club"
                theme="classic"
                locale="nl"
            />,
        ).container,
        'text',
    )?.textContent;

describe('the rules on the card', () => {
    it('keeps one trimmed rule per line and drops empty lines', () => {
        expect(rulesOf('  Vrij parkeren pakt de pot \n\n\nGeen lenen  ')).toBe(
            '1. Vrij parkeren pakt de pot\n2. Geen lenen',
        );
        expect(rulesOf('')).toBe('');
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
