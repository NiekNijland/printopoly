import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { spaceAt } from '@/lib/game/standard-edition';
import type { OwnableSpace } from '@/lib/game/types';

import { Banknote } from './banknote';
import { BoardCenter } from './board';
import { BoardSpace } from './board-space';
import { GameCard } from './game-card';
import { TitleDeed } from './title-deed';

const base = { theme: 'classic', locale: 'nl' } as const;

const words = {
    house: { singular: 'Schuurtje', plural: 'Schuurtjes' },
    hotel: { singular: 'Boerderij', plural: 'Boerderijen' },
    decks: { chance: 'Roddel', chest: 'Dorpskas' },
    currencySymbol: 'RP',
    currencyName: 'Raalter pegels',
};

describe('the words of an edition in the renderers', () => {
    it('prints its own currency symbol on spaces, notes, deeds and cards', () => {
        const space = render(
            <BoardSpace {...base} space={spaceAt(1)} words={words} />,
        );
        const tax = render(
            <BoardSpace {...base} space={spaceAt(4)} words={words} />,
        );
        const note = render(<Banknote {...base} value={50} words={words} />);
        const deed = render(
            <TitleDeed
                {...base}
                space={spaceAt(1) as OwnableSpace}
                side="front"
                words={words}
            />,
        );
        const card = render(
            <GameCard
                {...base}
                deck="chance"
                side="front"
                text="Betaal de bank."
                amount={-20}
                words={words}
            />,
        );

        expect(within(space.container).getByText('RP 60')).toBeInTheDocument();
        expect(
            within(tax.container).getByText('Betaal RP 200'),
        ).toBeInTheDocument();
        expect(within(note.container).getByText('RP 50')).toBeInTheDocument();
        expect(
            within(deed.container).getByText('Prijs RP 60'),
        ).toBeInTheDocument();
        expect(
            card.container.querySelector('[data-slot="amount"]')?.textContent,
        ).toBe('Betaal RP 20');
    });

    it('sets a symbol of letters off with a space in English too', () => {
        render(
            <BoardSpace
                theme="classic"
                locale="en"
                space={spaceAt(1)}
                words={{ currencySymbol: 'RP' }}
            />,
        );

        expect(screen.getByText('RP 60')).toBeInTheDocument();
    });

    it('keeps the speelgeld words on a note', () => {
        const { container } = render(
            <Banknote {...base} value={50} words={words} />,
        );

        expect(within(container).getByText('speelgeld')).toBeInTheDocument();
    });

    it('names the buildings on the deed', () => {
        const { container } = render(
            <TitleDeed
                {...base}
                space={spaceAt(1) as OwnableSpace}
                side="front"
                words={words}
            />,
        );
        const text = container.textContent ?? '';

        expect(text).toContain('Met 3 Schuurtjes');
        expect(text).toContain('Met Boerderij');
        expect(text).toContain('Schuurtje RP 50');
        expect(text).not.toContain('huizen');
    });

    it('prints the names of the decks on the board spaces, the centre and the cards', () => {
        const chance = render(
            <BoardSpace {...base} space={spaceAt(7)} words={words} />,
        );
        const chest = render(
            <BoardSpace {...base} space={spaceAt(2)} words={words} />,
        );
        const centre = render(
            <BoardCenter {...base} editionName="Raalte" words={words} />,
        );
        const front = render(
            <GameCard
                {...base}
                deck="chest"
                side="front"
                text="Tekst"
                words={words}
            />,
        );
        const back = render(
            <GameCard {...base} deck="chance" side="back" words={words} />,
        );

        expect(
            within(chance.container).getByText('Roddel'),
        ).toBeInTheDocument();
        expect(
            within(chest.container).getByText('Dorpskas'),
        ).toBeInTheDocument();
        expect(
            centre.container.querySelector('[data-slot="spot-name-chance"]')
                ?.textContent,
        ).toBe('Roddel');
        expect(
            centre.container.querySelector('[data-slot="spot-name-chest"]')
                ?.textContent,
        ).toBe('Dorpskas');
        expect(
            within(front.container).getByText('Dorpskas'),
        ).toBeInTheDocument();
        expect(within(back.container).getByText('Roddel')).toBeInTheDocument();
    });

    it('lets the name of a space win over the name of the deck', () => {
        render(
            <BoardSpace
                {...base}
                space={spaceAt(7)}
                name="Eigen naam"
                words={words}
            />,
        );

        expect(screen.getByText('Eigen naam')).toBeInTheDocument();
        expect(screen.queryByText('Roddel')).toBeNull();
    });

    it('shows the short text of every corner', () => {
        const start = render(
            <BoardSpace {...base} space={spaceAt(0)} text="Pak 200 pegels" />,
        );
        const jail = render(
            <BoardSpace {...base} space={spaceAt(10)} text="Strafbank" />,
        );
        const parking = render(
            <BoardSpace {...base} space={spaceAt(20)} text="Even uitrusten" />,
        );
        const goTo = render(
            <BoardSpace {...base} space={spaceAt(30)} text="Rechtstreeks" />,
        );

        expect(
            within(start.container).getByText('Pak 200 pegels'),
        ).toBeInTheDocument();
        expect(
            within(start.container).queryByText(/als je langs Start komt/),
        ).toBeNull();
        expect(
            within(jail.container).getByText('Strafbank'),
        ).toBeInTheDocument();
        expect(within(jail.container).queryByText('In de cel')).toBeNull();
        expect(
            within(parking.container).getByText('Even uitrusten'),
        ).toBeInTheDocument();
        expect(
            within(goTo.container).getByText('Rechtstreeks'),
        ).toBeInTheDocument();
    });

    it('draws the photo of the jail corner in the cell', () => {
        const { container } = render(
            <BoardSpace
                {...base}
                space={spaceAt(10)}
                photo={{ src: 'a.jpg' }}
            />,
        );

        expect(container.querySelector('[data-photo]')).not.toBeNull();
        expect(container.querySelector('[data-slot="in-jail"]')).not.toBeNull();
    });

    it('prints nothing extra on parking and go-to-jail without a text', () => {
        const parking = render(<BoardSpace {...base} space={spaceAt(20)} />);
        const goTo = render(<BoardSpace {...base} space={spaceAt(30)} />);

        expect(
            parking.container.querySelector('[data-slot="text"]'),
        ).toBeNull();
        expect(goTo.container.querySelector('[data-slot="text"]')).toBeNull();
    });
});
