import { render } from '@testing-library/react';

import { DEFAULT_WORDS, type RulesContext } from '@/lib/render/rules-booklet';

import { BackFace, CoverFace } from './rules-booklet-covers';

const context: RulesContext = {
    locale: 'en',
    currency: 'eur',
    name: 'Our Town',
    words: DEFAULT_WORDS.en,
    spaceNames: [],
    houseRules: [],
    money: { notes: 90, maxPlayers: 6 },
};

describe('the cover and the back of the rules booklet', () => {
    it('shows the title, the players and four icons without a photo', () => {
        const { container } = render(
            <CoverFace
                content={{
                    kind: 'cover',
                    title: 'Our Town',
                    subtitle: 'How to play',
                }}
                context={context}
            />,
        );

        expect(
            container.querySelector('[data-slot="booklet-cover-title"]')
                ?.textContent,
        ).toBe('Our Town');
        expect(container.textContent).toContain('A game for 2 to 6 players');
        expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(
            4,
        );
    });

    it('puts the photo on the cover in place of the icons', () => {
        const { container } = render(
            <CoverFace
                content={{
                    kind: 'cover',
                    title: 'Our Town',
                    subtitle: 'How to play',
                }}
                context={context}
                photo={{ src: 'cover.jpg' }}
            />,
        );

        expect(container.querySelector('img')?.getAttribute('src')).toBe(
            'cover.jpg',
        );
    });

    it('writes the closing line, the name and the credit on the back', () => {
        const { container } = render(
            <BackFace
                content={{
                    kind: 'back',
                    title: 'Our Town',
                    line: 'Have fun playing',
                    credit: 'Made with Printopoly',
                }}
            />,
        );

        expect(
            container.querySelector('[data-slot="booklet-back-line"]')
                ?.textContent,
        ).toBe('Have fun playing');
        expect(container.textContent).toContain('Made with Printopoly');
    });
});
