import { fireEvent, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';

import { pawnKey } from '@/lib/render/edition-keys';
import { resolveEdition } from '@/lib/render/edition-resolve';
import { makeEdition } from '@/testing/edition-test-utils';
import { renderWithI18n } from '@/testing/render';

import { PickTab } from './friend-pick-lists';

const edition = {
    ...makeEdition({ id: 'e1' }),
    elements: {
        'group.red': { town: 'Ons dorp' },
        'card.chance.17': { added: true, text: 'Je wint de pubquiz.' },
    },
};
const resolved = resolveEdition({
    ...edition,
    parts: { ...edition.parts, cards: true, pawns: true },
});
const props: Omit<ComponentProps<typeof PickTab>, 'tab' | 'onSelect'> = {
    edition,
    resolved,
    locale: 'nl',
    selected: 'space.01',
    cardsHidden: false,
};

describe('PickTab', () => {
    it('lists the towns by their name, or the name of their colour (bug 28)', () => {
        const onSelect = vi.fn();
        renderWithI18n(<PickTab {...props} tab="towns" onSelect={onSelect} />);

        fireEvent.click(screen.getByRole('button', { name: 'Ons dorp' }));
        expect(onSelect).toHaveBeenCalledWith('group.red');
        expect(screen.getAllByRole('button')).toHaveLength(8);
    });

    it('lists the cards with the extra ones marked, and a new card per deck (B135, B175)', () => {
        const onSelect = vi.fn();
        renderWithI18n(<PickTab {...props} tab="cards" onSelect={onSelect} />);

        expect(
            screen.getByRole('button', { name: /Je wint de pubquiz\. Extra/ }),
        ).toHaveAttribute('aria-pressed', 'false');
        const [newCard] = screen.getAllByRole('button', {
            name: /Nieuwe kaart voorstellen/,
        });
        fireEvent.click(newCard ?? document.body);
        expect(onSelect).toHaveBeenCalledWith('newcard.chance');
    });

    it('names the cards, not their text, when the cards are hidden', () => {
        renderWithI18n(
            <PickTab {...props} tab="cards" cardsHidden onSelect={vi.fn()} />,
        );

        expect(screen.queryByText('Je wint de pubquiz.')).toBeNull();
    });

    it('lists the pawns, and the board with its hint', () => {
        const onSelect = vi.fn();
        const { unmount } = renderWithI18n(
            <PickTab
                {...props}
                tab="pawns"
                selected={pawnKey(1)}
                onSelect={onSelect}
            />,
        );
        const buttons = screen.getAllByRole('button');
        expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(buttons[1] ?? document.body);
        expect(onSelect).toHaveBeenCalledWith(pawnKey(2));
        unmount();

        renderWithI18n(<PickTab {...props} tab="board" onSelect={onSelect} />);
        expect(screen.getAllByRole('option').length).toBeGreaterThan(30);
    });
});
