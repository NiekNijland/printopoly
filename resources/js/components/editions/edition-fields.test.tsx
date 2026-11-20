import { screen } from '@testing-library/react';

import { EditionFields } from '@/components/editions/edition-fields';
import { DEFAULT_PARTS } from '@/lib/edition/types';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';
import { renderWithI18n } from '@/testing/render';

const noop = () => undefined;

function fields(language: 'nl' | 'en') {
    return (
        <EditionFields
            values={{
                name: 'Our edition',
                language,
                currency: 'eur',
                theme: 'classic',
                parts: { ...DEFAULT_PARTS },
                boardProfile: DEFAULT_BOARD_PROFILE,
            }}
            interfaceLanguage={language}
            onName={noop}
            onLanguage={noop}
            onCurrency={noop}
            onTheme={noop}
            onPart={noop}
            onProfile={noop}
        />
    );
}

describe('EditionFields', () => {
    it('names the standard board in the interface language', () => {
        renderWithI18n(fields('en'), 'en');

        expect(screen.getByText('Modern square')).toBeInTheDocument();
        expect(screen.queryByText('Modern vierkant')).not.toBeInTheDocument();
    });

    it('draws the theme previews in the language of the edition', () => {
        const { container } = renderWithI18n(fields('en'), 'en');

        expect(container.textContent).not.toContain('Molenweg');
    });

    it('gives every part checkbox an accessible name that does not shrink', () => {
        renderWithI18n(fields('en'), 'en');

        for (const box of screen.getAllByRole('checkbox')) {
            expect(box).toHaveAccessibleName(/\S/);
            expect(box).toHaveClass('size-5', 'shrink-0');
        }
    });
});
