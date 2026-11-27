import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { isOwnable, spaceAt } from '@/lib/render/standard-edition';
import { css, mmSize, root } from '@/testing/render-dom';
import type { OwnableSpace } from '@/types/game';
import { Banknote } from './banknote';
import { BoardCenter } from './board';
import { BoardSpace } from './board-space';
import { BoxLid } from './box-lid';
import { GameCard } from './game-card';
import { HouseRulesCard, houseRuleLines } from './house-rules';
import { TitleDeed } from './title-deed';

const base = { theme: 'classic', locale: 'nl' } as const;

const ownableAt = (position: number): OwnableSpace => {
    const space = spaceAt(position);

    if (!isOwnable(space)) {
        throw new Error(`Space ${String(position)} has no deed`);
    }

    return space;
};

describe('free layers, amounts and house rules', () => {
    const layers = [
        {
            id: 'a',
            kind: 'text',
            text: 'Hoi allemaal',
            x: 10,
            y: 20,
            w: 60,
            h: 12,
            rotation: -45,
        },
        { id: 'b', kind: 'photo', x: 80, y: 90, w: 30, h: 30 },
    ] as const;

    it('draws free layers on the centre, the lid and a card back, turned as asked', () => {
        const centre = render(
            <BoardCenter {...base} editionName="Club" layers={layers} />,
        );
        const layerA =
            centre.container.querySelector<HTMLElement>('[data-layer="a"]');
        expect(layerA?.style.left).toBe('10mm');
        expect(layerA?.style.transform).toBe('rotate(-45deg)');
        expect(
            centre.container.querySelector('[data-layer="b"]'),
        ).not.toBeNull();
        expect(screen.getAllByText('Hoi allemaal').length).toBeGreaterThan(0);

        const lid = render(
            <BoxLid {...base} editionName="Club" layers={layers} />,
        );
        expect(lid.container.querySelector('[data-layer="a"]')).not.toBeNull();

        const back = render(
            <GameCard {...base} deck="chance" side="back" layers={layers} />,
        );
        expect(back.container.querySelector('[data-layer="a"]')).not.toBeNull();
        const front = render(
            <GameCard {...base} deck="chance" side="front" layers={layers} />,
        );
        expect(front.container.querySelector('[data-layer]')).toBeNull();
    });

    it('runs the name along the diagonal of the board centre', () => {
        const { container } = render(
            <BoardCenter {...base} editionName="Club" />,
        );
        const diagonal = container.querySelector<HTMLElement>(
            '[data-slot="edition-name-diagonal"]',
        );
        expect(diagonal?.style.transform).toBe('rotate(-45deg)');
        expect(
            diagonal?.querySelector('[data-slot="edition-name"]'),
        ).not.toBeNull();
    });

    it('shows the amount of a card as receive or pay, and nothing for 0 or none', () => {
        const pay = render(
            <GameCard
                {...base}
                deck="chance"
                side="front"
                text="Boete"
                amount={-50}
            />,
        );
        expect(
            pay.container.querySelector('[data-slot="amount"]')?.textContent,
        ).toBe('Betaal €\u00A050');
        const get = render(
            <GameCard
                {...base}
                deck="chest"
                side="front"
                text="Taart"
                amount={20}
            />,
        );
        expect(
            get.container.querySelector('[data-slot="amount"]')?.textContent,
        ).toBe('Ontvang €\u00A020');
        const en = render(
            <GameCard
                theme="classic"
                locale="en"
                deck="chest"
                side="front"
                text="Cake"
                amount={20}
            />,
        );
        expect(
            en.container.querySelector('[data-slot="amount"]')?.textContent,
        ).toBe('Collect £20');
        for (const amount of [0, undefined]) {
            const none = render(
                <GameCard
                    {...base}
                    deck="chance"
                    side="front"
                    text="Niks"
                    amount={amount}
                />,
            );
            expect(
                none.container.querySelector('[data-slot="amount"]'),
            ).toBeNull();
        }
    });

    it('prints the house rules as one numbered card of 63 x 88 mm', () => {
        const { container } = render(
            <HouseRulesCard
                {...base}
                editionName="Club"
                text={'Geld onder Vrij parkeren\n\n  Geen handel in de cel '}
            />,
        );
        const sheet = root(container);
        expect(mmSize(sheet)).toEqual(['63mm', '88mm']);
        expect(sheet.dataset['element']).toBe('house-rules');
        expect(container.querySelector('[data-slot="text"]')?.textContent).toBe(
            '1. Geld onder Vrij parkeren\n2. Geen handel in de cel',
        );
        expect(
            container.querySelector('[data-slot="title"]')?.textContent,
        ).toBe('Huisregels');
        expect(houseRuleLines('a\n\n b ')).toEqual(['a', 'b']);
    });

    it('prints the bank name and the colour of a note', () => {
        const { container } = render(
            <Banknote
                {...base}
                value={20}
                color="#112233"
                bankName="Bank van de club"
            />,
        );
        expect(
            container.querySelector('[data-slot="bank-name"]')?.textContent,
        ).toBe('Bank van de club');
        expect(root(container).style.background).toBe(css('#112233'));
    });
});

describe('style of an edition (B130)', () => {
    const colors = { groupColors: { brown: '#123456', darkblue: '#654321' } };

    it('colours a street bar and a deed band with the group colour of the edition', () => {
        const space = render(
            <BoardSpace {...base} style={colors} space={spaceAt(1)} />,
        );
        const deed = render(
            <TitleDeed
                {...base}
                style={colors}
                space={ownableAt(1)}
                side="front"
            />,
        );

        expect(
            space.container.querySelector<HTMLElement>(
                '[data-slot="color-bar"]',
            )?.style.background,
        ).toBe(css('#123456'));
        expect(
            deed.container.querySelector<HTMLElement>('[data-slot="band"]')
                ?.style.background,
        ).toBe(css('#123456'));
    });

    it('looks exactly like the theme without a style', () => {
        const plain = render(<BoardSpace {...base} space={spaceAt(1)} />);
        const styled = render(
            <BoardSpace {...base} style={{}} space={spaceAt(1)} />,
        );

        expect(styled.container.innerHTML).toBe(plain.container.innerHTML);
    });

    it('draws the arrows of the Start corner in the accent colour of the theme (B203)', () => {
        const { container } = render(
            <BoardSpace {...base} theme="riso" space={spaceAt(0)} />,
        );

        // The second accent of Riso; an accent stored on an older edition no longer counts.
        expect(container.innerHTML).toContain('stroke="#00A3E0"');
    });

    it('fills a card back with a pattern or a photo over the whole card with bleed (B56)', () => {
        const pattern = render(
            <GameCard
                {...base}
                bleedMm={3}
                deck="chance"
                side="back"
                pattern="waves"
                edition="Club"
            />,
        );
        const photo = render(
            <GameCard
                {...base}
                bleedMm={3}
                deck="chest"
                side="back"
                photo={{ src: 'x.jpg' }}
                edition="Club"
            />,
        );

        expect(
            pattern.container.querySelector('[data-pattern="waves"]'),
        ).not.toBeNull();
        const slot = photo.container.querySelector('[data-photo="filled"]');

        expect(slot?.getAttribute('data-w')).toBe('69');
        expect(slot?.getAttribute('data-h')).toBe('94');
        // The deck is still named, on a plate, so the two backs stay apart.
        expect(
            photo.container.querySelector('[data-slot="title"]')?.textContent,
        ).toContain('Algemeen Fonds');
    });
});
