import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DEFAULT_WORDS, bookletPages } from '@/lib/render/rules-booklet';
import { standardEdition } from '@/lib/render/standard-edition';
import { Invitation } from './invitation';
import { RulesBookletPage } from './rules-booklet';

const base = { theme: 'classic', locale: 'nl' } as const;

describe('extra print items (B129)', () => {
    it('draws an A6 invitation with the text, and lines to fill in when it is empty', () => {
        const { container, rerender } = render(
            <Invitation
                {...base}
                text="Zaterdag 6 december"
                editionName="Club"
            />,
        );
        const sheet = container.querySelector('[data-element="invitation"]');

        expect(sheet?.getAttribute('data-width-mm')).toBe('105');
        expect(sheet?.getAttribute('data-height-mm')).toBe('148');
        expect(container.textContent).toContain('Zaterdag 6 december');

        rerender(<Invitation {...base} text="" editionName="Club" />);
        expect(container.textContent).toContain('Wanneer');
    });

    it('draws a booklet page with the prices of the edition', () => {
        const context = {
            locale: 'nl',
            currency: 'eur',
            name: 'Club',
            words: DEFAULT_WORDS.nl,
            spaceNames: standardEdition.spaces.map((s) => s.name.nl),
            houseRules: ['Geen deals'],
        } as const;
        const { container } = render(
            <RulesBookletPage {...base} page={12} context={context} />,
        );

        expect(container.textContent).toContain('Prijs');
        expect(container.textContent).toContain('Molenweg');
    });

    describe('booklet, round 4', () => {
        const context = {
            locale: 'nl',
            currency: 'eur',
            name: 'Dorpsfeest',
            words: DEFAULT_WORDS.nl,
            spaceNames: standardEdition.spaces.map((s, index) =>
                index === 39
                    ? 'De burgemeesterswoning aan de brink'
                    : s.name.nl,
            ),
            houseRules: [],
        } as const;

        it('lets a long street name in the price list wrap smaller instead of cutting it off (bug 19)', () => {
            const { container } = render(
                <>
                    {bookletPages(context).map((page, index) =>
                        page.kind === 'prices' ? (
                            <RulesBookletPage
                                key={index}
                                {...base}
                                page={index + 1}
                                context={context}
                            />
                        ) : null,
                    )}
                </>,
            );
            const long = Array.from(
                container.querySelectorAll<HTMLElement>('[data-price-name]'),
            ).find((cell) =>
                cell.textContent.startsWith('De burgemeesterswoning'),
            );

            expect(long?.textContent).toBe(
                'De burgemeesterswoning aan de brink',
            );
            expect(long?.style.whiteSpace).toBe('normal');
            expect(long?.style.textOverflow).toBe('');
        });

        it('promises no play money in the box when the edition prints none, and has 8 rows for players (bug 34)', () => {
            const intro = render(
                <RulesBookletPage
                    {...base}
                    page={2}
                    context={{ ...context, noMoney: true }}
                />,
            );
            expect(intro.container.textContent).toContain(
                'het speelgeld neem je uit je eigen spel',
            );
            expect(intro.container.textContent).not.toContain(
                'speelgeld en een pion per speler',
            );

            const notes = bookletPages(context).findIndex(
                (page) => page.kind === 'notes',
            );
            const sheet = render(
                <RulesBookletPage
                    {...base}
                    page={notes + 1}
                    context={context}
                />,
            );
            expect(sheet.container.textContent).toContain('Speler 8');
            expect(sheet.container.textContent).not.toContain('Speler 9');
        });
    });
});
