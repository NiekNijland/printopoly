import { act, fireEvent, render, screen } from '@testing-library/react';

import { useSectionScroll } from './use-section-scroll';

const Panel = ({
    hasBox,
    request,
}: {
    hasBox: boolean;
    request: { section: 'words' | 'board'; n: number } | null;
}) => {
    const { sections, open, scroller, current, follow, show, toggle } =
        useSectionScroll(hasBox, request);

    return (
        <div>
            <output data-testid="state">
                {`${sections.join(',')}|${[...open].join(',')}|${current}`}
            </output>
            <button type="button" onClick={() => toggle('general')}>
                toggle
            </button>
            <button type="button" onClick={() => show('board')}>
                show
            </button>
            <div data-testid="scroller" ref={scroller} onScroll={follow}>
                {sections.map((section) => (
                    <section key={section} id={`edition-${section}`} />
                ))}
            </div>
        </div>
    );
};

const state = () => screen.getByTestId('state').textContent;

describe('useSectionScroll', () => {
    it('leaves Samen maken out without a box, and opens Algemeen first', () => {
        render(<Panel hasBox={false} request={null} />);

        expect(state()).toBe('general,look,words,board|general|general');
    });

    it('folds and unfolds a section, and shows a section that is asked for once per request', () => {
        const { rerender } = render(
            <Panel hasBox request={{ section: 'words', n: 1 }} />,
        );

        expect(state()).toBe(
            'general,look,words,board,together|general,words|words',
        );
        fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
        expect(state()).toContain('|words|');

        rerender(<Panel hasBox request={{ section: 'words', n: 1 }} />);
        fireEvent.click(screen.getByRole('button', { name: 'show' }));
        expect(state()).toContain('|board');
    });

    it('keeps a chosen section lit while the panel scrolls to it, until the person scrolls by hand', () => {
        render(<Panel hasBox={false} request={null} />);
        const scroller = screen.getByTestId('scroller');
        for (const section of scroller.querySelectorAll('section')) {
            if (section.id !== 'edition-general') {
                section.getBoundingClientRect = () => new DOMRect(0, 500);
            }
        }

        act(() => {
            fireEvent.click(screen.getByRole('button', { name: 'show' }));
        });
        fireEvent.scroll(scroller);
        expect(state()).toMatch(/\|board$/);

        fireEvent.wheel(scroller);
        fireEvent.scroll(scroller);
        expect(state()).toMatch(/\|general$/);
    });
});
