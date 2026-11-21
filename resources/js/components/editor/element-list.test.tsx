import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditionBus } from '@/lib/edition/bus';
import { EditionSession } from '@/lib/edition/session';
import { MemoryEditionStorage } from '@/lib/edition/storage';
import type { Edition } from '@/lib/edition/types';
import { installMemoryServices, sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { ElementList, firstWords } from './element-list';

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
    async function open(elements: Edition['elements'] = {}) {
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
    }

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
        await user.click(chance as HTMLElement);

        expect(session.edition.elements['card.chance.17']).toEqual({
            added: true,
        });
        expect(onSelect).toHaveBeenCalledWith('card.chance.17');
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
