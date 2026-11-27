import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { CheckIssue } from '@/lib/render/checks-types';
import { makeEdition } from '@/testing/edition-test-utils';
import { renderWithI18n } from '@/testing/render';

import { OpenMessages } from './open-messages';

const issue = (
    code: CheckIssue['code'],
    elementKey: string,
    nl: string,
    extra: Partial<CheckIssue> = {},
): CheckIssue => ({
    id: `${code}|${elementKey}|name`,
    code,
    elementKey,
    field: 'name',
    severity: 'warning',
    icon: 'triangle-alert',
    severityLabel: { nl: 'Waarschuwing', en: 'Warning' },
    message: { nl, en: nl },
    ...extra,
});

type Open = (key: string, field: string) => void;

const mount = (issues: CheckIssue[], onOpen = vi.fn<Open>()) => {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    const edition = makeEdition();
    edition.elements['space.01'] = { name: 'Beukenlaan' };
    renderWithI18n(
        <OpenMessages
            open
            onOpenChange={onOpenChange}
            issues={issues}
            edition={edition}
            locale="nl"
            onOpen={onOpen}
        />,
    );

    return { onOpen, onOpenChange };
};

describe('OpenMessages', () => {
    it('says there is nothing to check, without a search', () => {
        mount([]);

        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveTextContent(
            'Niets om na te kijken. Alles kan zo naar de printer.',
        );
        expect(screen.queryByRole('combobox')).toBeNull();
        expect(dialog).not.toHaveTextContent('Kies een melding');
    });

    it('lists the messages under the place they are about', () => {
        mount([
            issue('text.too-long', 'space.01', 'De naam is te lang.'),
            issue('text.too-long', 'card.chance.03', 'De tekst is te lang.'),
            issue('board.center-missing', 'board', 'Het midden ontbreekt.', {
                about: { nl: 'Het bord', en: 'The board' },
            }),
        ]);

        expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
            '3 dingen om na te kijken.',
        );
        const board = screen.getByRole('group', { name: 'Bord' });
        expect(within(board).getByText('Beukenlaan')).toBeInTheDocument();
        expect(within(board).getByText('Het bord')).toBeInTheDocument();
        expect(
            within(screen.getByRole('group', { name: 'Kaarten' })).getByText(
                'De tekst is te lang.',
            ),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                'Kies een melding om naar het veld te gaan. Printen kan altijd.',
            ),
        ).toBeInTheDocument();
    });

    it('opens the field of a chosen message and closes the list', async () => {
        const user = userEvent.setup();
        const { onOpen, onOpenChange } = mount([
            issue('text.too-long', 'space.01', 'De naam is te lang.'),
        ]);

        await user.click(
            screen.getByRole('option', { name: /De naam is te lang/ }),
        );

        expect(onOpenChange).toHaveBeenCalledWith(false);
        expect(onOpen).toHaveBeenCalledExactlyOnceWith('space.01', 'name');
    });

    it('cannot open a message about the whole board', () => {
        mount([
            issue('board.center-missing', 'board', 'Het midden ontbreekt.'),
        ]);

        const option = screen.getByRole('option', {
            name: /Het midden ontbreekt/,
        });
        expect(option).toHaveAttribute('aria-disabled', 'true');
        expect(option).toHaveTextContent('Bord');
    });

    it('makes one row of many empty cards, named after their place', () => {
        mount(
            ['01', '02', '03'].map((n) =>
                issue('card.empty', `card.chance.${n}`, 'Geen tekst.'),
            ),
        );

        const options = screen.getAllByRole('option');
        expect(options).toHaveLength(1);
        expect(options[0]).toHaveTextContent(
            /^Kaarten.*3 kaarten hebben nog geen tekst/,
        );
    });

    it('finds messages by what they say, and says when nothing matches', async () => {
        const user = userEvent.setup();
        mount([
            issue('text.too-long', 'space.01', 'De naam is te lang.'),
            issue('text.too-long', 'card.chance.03', 'De tekst is te lang.'),
        ]);

        await user.type(screen.getByRole('combobox'), 'Beukenlaan');
        expect(screen.getAllByRole('option')).toHaveLength(1);

        await user.type(screen.getByRole('combobox'), 'xyz');
        expect(screen.getByText('Geen melding gevonden.')).toBeInTheDocument();
    });

    it('lists messages about the words of the edition under Overzicht', () => {
        mount([issue('text.stale-name', 'words.chance', 'Oud woord.')]);

        expect(
            screen.getByRole('group', { name: 'Overzicht' }),
        ).toHaveTextContent('Oud woord.');
    });
});
