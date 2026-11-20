import { screen } from '@testing-library/react';

import { sampleEdition } from '@/testing/editions';
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
