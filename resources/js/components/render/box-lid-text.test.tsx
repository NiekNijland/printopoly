import { render } from '@testing-library/react';

import { lidLayout } from '@/lib/render/box-lid-layout';

import { LidLines, LidTitleText, lidWords } from './box-lid-text';

const layout = lidLayout(
    { w: 200, h: 260 },
    { photo: 'none', offset: undefined, subtitle: true, lines: true },
);

describe('the words of a lid', () => {
    it('falls back to the standard subtitle and trims the own lines', () => {
        const words = lidWords(267, undefined, '  Kerst 2026 ', 'nl');

        expect(words.line).not.toBe('');
        expect(words.own).toBe('Kerst 2026');
        expect(words.subtitleFont).toBeCloseTo(9.078);
        expect(words.linesFont).toBeCloseTo(6.408);
    });

    it('draws the name, the subtitle and the own lines', () => {
        const words = lidWords(260, 'Voor 2 tot 6', 'Familie', 'nl');
        const { container } = render(
            <LidTitleText
                editionName="Ons Dorp"
                layout={layout}
                look={undefined}
                mode="none"
                ink={undefined}
                words={words}
            />,
        );
        const text = (name: string) =>
            container.querySelector(`[data-slot="${name}"]`)?.textContent;

        expect(text('edition-name')).toBe('Ons Dorp');
        expect(text('subtitle')).toBe('Voor 2 tot 6');
        expect(text('lines')).toBe('Familie');
    });

    it('draws only the lines the layout has room for', () => {
        const words = lidWords(260, '', '', 'nl');
        const bare = lidLayout(
            { w: 200, h: 260 },
            { photo: 'none', offset: undefined, subtitle: false, lines: false },
        );
        const { container } = render(
            <LidLines layout={bare} look={undefined} words={words} />,
        );

        expect(container.innerHTML).toBe('');
    });
});
