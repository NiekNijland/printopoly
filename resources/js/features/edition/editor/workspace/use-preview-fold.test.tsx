import { fireEvent, render, screen } from '@testing-library/react';

import { mediaQueryList } from '@/testing/media-query';

import { usePreviewFold } from './use-preview-fold';

const Fields = () => {
    const { foldable, folded, togglePreview, onFieldsScroll } =
        usePreviewFold();

    return (
        <div>
            <div data-preview style={{ height: 100 }} />
            <button type="button" onClick={togglePreview}>
                {`${foldable ? 'foldable' : 'fixed'} ${folded ? 'folded' : 'open'}`}
            </button>
            <div data-testid="fields" onScrollCapture={onFieldsScroll}>
                <div data-testid="inner" />
            </div>
        </div>
    );
};

const foldable = (matches: boolean) =>
    vi
        .spyOn(window, 'matchMedia')
        .mockImplementation((query: string) => mediaQueryList(query, matches));

const scrollTo = (scrollTop: number, scrollHeight = 1000): void => {
    const node = screen.getByTestId('fields');
    Object.defineProperties(node, {
        scrollTop: { value: scrollTop, configurable: true },
        scrollHeight: { value: scrollHeight, configurable: true },
        clientHeight: { value: 400, configurable: true },
    });
    fireEvent.scroll(node);
};

describe('usePreviewFold', () => {
    it('folds by hand and opens only by hand on a foldable screen', () => {
        foldable(true);
        render(<Fields />);

        fireEvent.click(screen.getByRole('button', { name: 'foldable open' }));
        scrollTo(0);

        expect(
            screen.getByRole('button', { name: 'foldable folded' }),
        ).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button'));

        expect(
            screen.getByRole('button', { name: 'foldable open' }),
        ).toBeInTheDocument();
    });

    it('folds when the fields scroll and opens again at the top', () => {
        foldable(true);
        render(<Fields />);

        scrollTo(49);

        expect(
            screen.getByRole('button', { name: 'foldable folded' }),
        ).toBeInTheDocument();

        scrollTo(0);

        expect(
            screen.getByRole('button', { name: 'foldable open' }),
        ).toBeInTheDocument();
    });

    it('stays open when the fields would not stay scrollable', () => {
        foldable(true);
        render(<Fields />);

        scrollTo(49, 400);
        fireEvent.scroll(screen.getByTestId('inner'));

        expect(
            screen.getByRole('button', { name: 'foldable open' }),
        ).toBeInTheDocument();
    });

    it('never folds on a screen without the fold', () => {
        foldable(false);
        render(<Fields />);

        fireEvent.click(screen.getByRole('button'));
        scrollTo(49);

        expect(
            screen.getByRole('button', { name: 'fixed open' }),
        ).toBeInTheDocument();
    });
});
