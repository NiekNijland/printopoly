import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { mediaQueryList } from '@/testing/media-query';
import { renderWithI18n } from '@/testing/render';

import { PanelSection } from './panel-section';

const screenWide = (wide: boolean) =>
    vi
        .spyOn(window, 'matchMedia')
        .mockImplementation((query: string) => mediaQueryList(query, wide));

describe('PanelSection', () => {
    it('is a heading with its fields on a wide screen', () => {
        screenWide(true);

        renderWithI18n(
            <PanelSection
                id="image"
                title="Afbeelding"
                note="B141"
                summary="geen foto"
            >
                <p>velden</p>
            </PanelSection>,
        );

        expect(
            screen.getByRole('heading', { level: 3, name: /Afbeelding/ }),
        ).toHaveTextContent('AfbeeldingB141');
        expect(screen.getByText('velden')).toBeVisible();
        expect(screen.queryByText('geen foto')).toBeNull();
    });

    it('folds on a phone and says what is in it while closed', async () => {
        const user = userEvent.setup();
        screenWide(false);

        renderWithI18n(
            <PanelSection id="image" title="Afbeelding" summary="geen foto">
                <p>velden</p>
            </PanelSection>,
        );

        expect(screen.getByText('geen foto')).toBeInTheDocument();
        expect(screen.queryByText('velden')).not.toBeVisible();

        await user.click(screen.getByRole('button', { name: /Afbeelding/ }));

        expect(screen.getByText('velden')).toBeVisible();
        expect(screen.queryByText('geen foto')).toBeNull();
    });
});
