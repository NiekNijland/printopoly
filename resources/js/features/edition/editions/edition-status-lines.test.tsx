import { screen } from '@testing-library/react';

import {
    NO_STATUS,
    type EditionStatus,
} from '@/features/edition/use-edition-status';
import { renderWithI18n } from '@/testing/render';

import { StatusLines, statusLines } from './edition-status-lines';

const words = {
    t: (key: string, replacements: Record<string, string | number> = {}) =>
        [key, ...Object.values(replacements)].join(' '),
    tc: (key: string, count: number) => `${key} ${String(count)}`,
    date: (at: number) => `d${String(at)}`,
};

const status = (patch: Partial<EditionStatus>): EditionStatus => ({
    ...NO_STATUS,
    ...patch,
});

describe('statusLines', () => {
    it('says nothing when nothing waits and nothing was printed here', () => {
        expect(statusLines(NO_STATUS, undefined, words)).toEqual([]);
    });

    it('puts waiting contributions above the open box, then the ready sets', () => {
        expect(
            statusLines(
                status({
                    contributions: 2,
                    boxUntil: 9,
                    printer: { readyUntil: 5, outdated: false },
                    home: { readyUntil: 6, outdated: false },
                }),
                { kind: 'never' },
                words,
            ),
        ).toEqual([
            { text: 'editions.status_contributions 2', tone: 'new' },
            { text: 'editions.status_printer_ready d5', tone: 'ready' },
            { text: 'editions.status_home_ready d6', tone: 'ready' },
        ]);
        expect(statusLines(status({ boxUntil: 9 }), undefined, words)).toEqual([
            { text: 'editions.status_box_open d9', tone: 'plain' },
        ]);
    });

    it('says whether and when it was printed once no set is ready', () => {
        expect(statusLines(NO_STATUS, { kind: 'never' }, words)).toEqual([
            { text: 'editions.status_not_printed', tone: 'plain' },
        ]);
        expect(
            statusLines(NO_STATUS, { kind: 'printed', at: 3 }, words),
        ).toEqual([{ text: 'editions.status_printed d3', tone: 'printed' }]);
        expect(
            statusLines(NO_STATUS, { kind: 'changed', at: 4 }, words),
        ).toEqual([
            { text: 'editions.status_printed_changed d4', tone: 'plain' },
        ]);
    });
});

describe('StatusLines', () => {
    it('lists each line with its mark', () => {
        renderWithI18n(
            <StatusLines
                lines={[
                    { text: 'Twee bijdragen', tone: 'new' },
                    { text: 'Klaar', tone: 'ready' },
                    { text: 'Niet geprint', tone: 'plain' },
                ]}
            />,
        );

        const list = screen.getByRole('list');
        expect(list).toHaveAccessibleName();
        expect(screen.getAllByRole('listitem')).toHaveLength(3);
        expect(screen.getByText('Twee bijdragen').parentElement).toHaveClass(
            'text-press',
        );
        expect(screen.getByText('✓')).toBeInTheDocument();
        expect(screen.getByText('!')).toBeInTheDocument();
    });
});
