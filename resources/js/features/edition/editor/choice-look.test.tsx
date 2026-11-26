import { screen } from '@testing-library/react';

import { renderWithI18n } from '@/testing/render';

import { ChoiceRow, StandardButton } from './panel/panel-parts';
import { PhotoStyleChoice } from './photo-style-choice';

/** R6 Tom: the same kind of choice had four looks. One look per kind now (B262). */
describe('one look per kind of control (B262)', () => {
    it('draws every choice of a few options as one joined bar', () => {
        renderWithI18n(
            <>
                <PhotoStyleChoice value="framed" onChange={() => undefined} />
                <ChoiceRow
                    label="Afbeelding"
                    options={[
                        { id: 'none', label: 'Geen' },
                        { id: 'photo', label: 'Foto' },
                    ]}
                    value="none"
                    onChange={() => undefined}
                />
            </>,
        );

        const bars = [
            ...document.querySelectorAll<HTMLElement>(
                '[data-slot="toggle-group"]',
            ),
        ];
        expect(bars).toHaveLength(2);
        for (const bar of bars) {
            expect(bar.dataset['spacing']).toBe('0');
            expect(bar.dataset['variant']).toBe('outline');
        }
    });

    it('makes Standaard a link-like action, not a round pill', () => {
        renderWithI18n(
            <StandardButton label="Naam" onClick={() => undefined} />,
        );

        const button = screen.getByRole('button', {
            name: 'Naam terug naar standaard',
        });
        expect(button).toHaveAttribute('data-variant', 'link');
        expect(button.querySelector('.rounded-full')).toBeNull();
    });
});
