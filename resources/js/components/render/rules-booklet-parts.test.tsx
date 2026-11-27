import { render } from '@testing-library/react';

import { THEMES } from '@/lib/render/themes';

import { Body, ChapterPage, Lines, brandColor } from './rules-booklet-parts';

const theme = THEMES.classic;

describe('the parts of a rules booklet page', () => {
    it('takes the second accent when the accent is plain ink', () => {
        expect(brandColor({ ...theme, accent: theme.ink })).toBe(
            theme.secondaryAccent,
        );
        expect(brandColor({ ...theme, accent: '#abcdef' })).toBe('#abcdef');
    });

    it('writes paragraphs, a tip and a numbered list', () => {
        const { container } = render(
            <Body
                theme={theme}
                blocks={[
                    { type: 'p', text: 'Een' },
                    { type: 'tip', text: 'Tip' },
                    { type: 'list', items: ['a', 'b'], numbered: true },
                ]}
            />,
        );

        expect(container.querySelectorAll('p')).toHaveLength(2);
        expect(
            [...container.querySelectorAll('li > span:first-child')].map(
                (node) => node.textContent,
            ),
        ).toEqual(['1', '2']);
    });

    it('frames a chapter with its title and folio', () => {
        const { container } = render(
            <ChapterPage
                kicker="Hoofdstuk 1"
                title="Welkom"
                page={3}
                name="Dorp"
            >
                <span data-testid="body" />
            </ChapterPage>,
        );

        expect(
            container.querySelector('[data-slot="booklet-title"]')?.textContent,
        ).toBe('Welkom');
        expect(container.textContent).toContain('Hoofdstuk 1');
        expect(container.textContent).toContain('Dorp');
        expect(container.querySelector('[data-testid="body"]')).not.toBeNull();
    });

    it('draws write-on lines and the page number', () => {
        const lines = render(<Lines count={4} top={10} theme={theme} />);
        const chapter = render(
            <ChapterPage kicker="Hoofdstuk 2" title="Bord" page={7} name="Dorp">
                <span />
            </ChapterPage>,
        );

        expect(lines.container.children).toHaveLength(4);
        expect(
            [...chapter.container.querySelectorAll('span')]
                .slice(-2)
                .map((node) => node.textContent),
        ).toEqual(['Dorp', '7']);
    });
});
