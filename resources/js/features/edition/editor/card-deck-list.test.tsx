import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditionBus } from '@/features/edition/bus';
import { EditionSession } from '@/features/edition/session';
import { MemoryEditionStorage } from '@/lib/render/edition-storage';
import type { Edition } from '@/lib/render/edition-types';
import { installMemoryServices, sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { firstWords } from './card-deck-list';
import { ElementList } from './element-list';

describe('firstWords', () => {
    it('keeps a short text and cuts a long one after six words', () => {
        expect(firstWords('Ga naar Start')).toBe('Ga naar Start');
        expect(
            firstWords('Draai om en loop recht naar Start. Je krijgt 200'),
        ).toBe('Draai om en loop recht naar…');
        expect(firstWords('  ')).toBe('');
    });
});

describe('ElementList cards', () => {
    it('shows the start of the card text on every tile, also of a card the person changed', () => {
        const edition = sampleEdition();

        renderWithI18n(
            <ElementList
                tab="cards"
                edition={{
                    ...edition,
                    elements: {
                        'card.chance.02': {
                            text: 'De Bathmense dorpsquiz levert je iets op',
                        },
                    },
                }}
                interfaceLanguage="nl"
                selected="card.chance.01"
                onSelect={() => undefined}
                warned={new Set()}
            />,
        );

        expect(screen.getByText(/Draai om en loop recht/)).toBeVisible();
        expect(screen.getByText(/De Bathmense dorpsquiz levert/)).toBeVisible();
    });
});

describe('ElementList extra cards (B135)', () => {
    const open = async (elements: Edition['elements'] = {}) => {
        installMemoryServices();
        const storage = new MemoryEditionStorage();
        const edition = { ...sampleEdition(), elements };
        await storage.createEdition(edition);

        return new EditionSession(edition, {
            storage,
            bus: new EditionBus(null, 'w'),
            now: () => 5,
            debounceMs: 1000,
        });
    };

    it('adds a card at the end of a deck and opens it', async () => {
        const user = userEvent.setup();
        const session = await open();
        const onSelect = vi.fn();

        renderWithI18n(
            <ElementList
                tab="cards"
                edition={session.edition}
                interfaceLanguage="nl"
                selected="card.chance.01"
                onSelect={onSelect}
                warned={new Set()}
                session={session}
            />,
        );
        const [chance] = screen.getAllByRole('button', {
            name: 'Kaart toevoegen',
        });
        await user.click(chance ?? document.body);

        expect(session.edition.elements['card.chance.17']).toEqual({
            added: true,
        });
        expect(onSelect).toHaveBeenCalledWith('card.chance.17');
    });

    it('keeps whole words on the tiles: four per row only in a wide list, and hyphens (bug 24)', async () => {
        const session = await open();

        const { container } = renderWithI18n(
            <ElementList
                tab="cards"
                edition={session.edition}
                interfaceLanguage="nl"
                selected="card.chance.01"
                onSelect={vi.fn()}
                warned={new Set()}
                session={session}
            />,
        );
        const grid = container.querySelector('[data-card-grid]');
        expect(grid).toHaveClass('grid-cols-3', '@[24rem]:grid-cols-4');
        expect(grid).not.toHaveClass('min-[480px]:grid-cols-4');
        expect(
            container.querySelector('[data-card-tile] span[lang]'),
        ).toHaveClass('hyphens-auto', 'pb-3');
    });

    it('shows the extra cards as tiles and says when a deck is full', async () => {
        const elements: Edition['elements'] = {};
        for (let i = 17; i <= 32; i++) {
            elements[`card.chest.${String(i)}`] = { added: true };
        }
        elements['card.chance.17'] = {
            added: true,
            text: 'Je wint de dorpsquiz van Bathmen',
        };
        const session = await open(elements);

        renderWithI18n(
            <ElementList
                tab="cards"
                edition={session.edition}
                interfaceLanguage="nl"
                selected="card.chance.01"
                onSelect={() => undefined}
                warned={new Set()}
                session={session}
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Kans 17' }),
        ).toBeInTheDocument();
        expect(screen.getByText(/Je wint de dorpsquiz/)).toBeVisible();
        expect(
            screen.getByRole('button', { name: 'Algemeen Fonds 32' }),
        ).toBeInTheDocument();
        // Only Kans can still grow.
        expect(
            screen.getAllByRole('button', { name: 'Kaart toevoegen' }),
        ).toHaveLength(1);
        expect(
            screen.getByText('Deze stapel heeft 32 kaarten. Meer kan niet.'),
        ).toBeInTheDocument();
    });
});

describe('ElementList card search', () => {
    it('shows only the cards that hold the search, and says when none does', () => {
        const edition = sampleEdition();
        const { unmount } = renderWithI18n(
            <ElementList
                tab="cards"
                edition={edition}
                interfaceLanguage="nl"
                selected="card.chance.01"
                onSelect={() => undefined}
                warned={new Set(['card.chance.01'])}
                query="achterkant"
            />,
        );

        expect(document.querySelector('[data-card-tile]')).toBeNull();
        expect(
            screen.getAllByRole('button', { name: /achterkant/i }).length,
        ).toBeGreaterThan(0);
        expect(document.querySelector('[data-add-card]')).toBeNull();

        unmount();
        renderWithI18n(
            <ElementList
                tab="cards"
                edition={edition}
                interfaceLanguage="nl"
                selected="card.chance.01"
                onSelect={() => undefined}
                warned={new Set(['card.chance.01'])}
                query="zzzqqq"
            />,
        );

        expect(screen.getByRole('status')).toHaveTextContent(
            'Niets gevonden voor "zzzqqq".',
        );
    });
});
