import { render } from '@testing-library/react';

import { BOOKLET_PAGE } from '@/lib/render/print-extras';
import {
    DEFAULT_WORDS,
    bookletPages,
    type RulesContext,
} from '@/lib/render/rules-booklet';
import { standardEdition } from '@/lib/render/standard-edition';
import { THEMES } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';
import { css, root } from '@/testing/render-dom';

import { RulesBookletPage } from './rules-booklet';

const base = { theme: 'classic', locale: 'en' } as const;

const context: RulesContext = {
    locale: 'en',
    currency: 'eur',
    name: 'Club',
    words: DEFAULT_WORDS.en,
    spaceNames: standardEdition.spaces.map((space) => space.name.en),
    houseRules: [],
};

const pageOf = (kind: string, ctx: RulesContext = context): number =>
    bookletPages(ctx).findIndex((page) => page.kind === kind) + 1;

const draw = (page: number, ctx: RulesContext = context) =>
    render(<RulesBookletPage {...base} page={page} context={ctx} />).container;

const hairlines = (container: HTMLElement): number =>
    Array.from(container.querySelectorAll<HTMLElement>('div')).filter(
        (element) => element.style.height === mm(0.2),
    ).length;

describe('RulesBookletPage', () => {
    it('draws an A5 sheet named rules-booklet', () => {
        const sheet = root(draw(1));

        expect(sheet.getAttribute('data-element')).toBe('rules-booklet');
        expect(sheet.getAttribute('data-width-mm')).toBe(
            String(BOOKLET_PAGE.w),
        );
        expect(sheet.getAttribute('data-height-mm')).toBe(
            String(BOOKLET_PAGE.h),
        );
    });

    it.each([0, 17])('draws nothing for page %i', (page) => {
        expect(draw(page).innerHTML).toBe('');
    });

    it('colours the cover like the board, the back like a corner and the rest like paper', () => {
        const theme = THEMES.classic;

        expect(root(draw(1)).style.background).toBe(css(theme.boardBackground));
        expect(root(draw(16)).style.background).toBe(
            css(theme.cornerBackground),
        );
        expect(root(draw(2)).style.background).toBe(css(theme.paper));
    });

    it('shows the kicker, title and edition name on a chapter page', () => {
        const page = bookletPages(context)[1];
        const { kicker, title } =
            page?.kind === 'text' ? page : { kicker: '', title: '' };
        const text = draw(2).textContent;

        expect(kicker).not.toBe('');
        expect(text).toContain(title);
        expect(text).toContain(kicker);
        expect(text).toContain('Club');
    });

    it('draws the price table on a price page', () => {
        const container = draw(pageOf('prices'));

        expect(
            container.querySelectorAll('[data-price-name]').length,
        ).toBeGreaterThan(0);
    });

    it('numbers the house rules of the edition in a fitted text', () => {
        const ctx = { ...context, houseRules: ['No deals', 'Free lunch'] };
        const container = draw(pageOf('houseRules', ctx), ctx);
        const rules = container.querySelector(
            '[data-slot="booklet-house-rules"]',
        );

        expect(rules?.textContent).toContain('1. No deals');
        expect(rules?.textContent).toContain('2. Free lunch');
    });

    it('draws nine blank lines instead when the edition has no house rules', () => {
        const ctx = { ...context, houseRules: ['No deals'] };
        const empty = draw(pageOf('houseRules'));
        const written = draw(pageOf('houseRules', ctx), ctx);

        expect(
            empty.querySelector('[data-slot="booklet-house-rules"]'),
        ).toBeNull();
        expect(hairlines(empty) - hairlines(written)).toBe(9);
    });

    it('gives the notes page one numbered line per player', () => {
        const text = draw(pageOf('notes')).textContent;

        expect(text).toContain('Player 1');
        expect(text).toContain('Player 8');
        expect(text).not.toContain('Player 9');
    });
});
