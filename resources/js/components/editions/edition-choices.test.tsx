import { screen } from '@testing-library/react';

import {
    BoardChoice,
    PartsChoice,
    ThemeChoice,
} from '@/components/editions/edition-choices';
import { DEFAULT_PARTS } from '@/lib/edition/types';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';
import { renderWithI18n } from '@/testing/render';

const noop = () => undefined;

describe('edition choices', () => {
    it('names the standard board in the interface language', () => {
        renderWithI18n(
            <BoardChoice
                profile={DEFAULT_BOARD_PROFILE}
                interfaceLanguage="en"
                idPrefix="edition"
                onProfile={noop}
            />,
            'en',
        );

        expect(screen.getByText('Modern square')).toBeInTheDocument();
        expect(screen.queryByText('Modern vierkant')).not.toBeInTheDocument();
    });

    it('draws the theme previews in the language of the edition', () => {
        const { container } = renderWithI18n(
            <ThemeChoice
                theme="classic"
                name="Our edition"
                language="en"
                currency="eur"
                interfaceLanguage="en"
                idPrefix="edition"
                onTheme={noop}
            />,
            'en',
        );

        expect(container.textContent).not.toContain('Molenweg');
    });

    it('gives every part checkbox an accessible name that does not shrink', () => {
        renderWithI18n(
            <PartsChoice
                parts={{ ...DEFAULT_PARTS }}
                interfaceLanguage="en"
                onPart={noop}
            />,
            'en',
        );

        for (const box of screen.getAllByRole('checkbox')) {
            expect(box).toHaveAccessibleName(/\S/);
            expect(box).toHaveClass('size-5', 'shrink-0');
        }
    });
});
