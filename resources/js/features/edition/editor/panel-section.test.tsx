import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithI18n } from '@/testing/render';

import { PanelSection, sectionId } from './panel-section';

describe('PanelSection', () => {
    it('is a region with its title, folding on a phone with what is chosen in its head', async () => {
        const user = userEvent.setup();
        const onToggle = vi.fn<() => void>();
        renderWithI18n(
            <PanelSection
                section="words"
                summary="3 aangepast"
                open={false}
                onToggle={onToggle}
            >
                <p>Inhoud</p>
            </PanelSection>,
        );
        const region = screen.getByRole('region', { name: 'Woorden' });

        expect(region).toHaveAttribute('id', sectionId('words'));
        expect(screen.getByText('3 aangepast')).toBeInTheDocument();
        expect(screen.getByText('+')).toBeInTheDocument();
        expect(screen.getByText('Inhoud').parentElement).toHaveClass('hidden');
        await user.click(screen.getByRole('button', { name: /Woorden/ }));
        expect(onToggle).toHaveBeenCalledOnce();
        expect(
            screen.queryByRole('button', {
                name: 'Alles in deze sectie terug naar standaard',
            }),
        ).toBeNull();
    });

    it('shows its reset only when the section differs, and is open', async () => {
        const user = userEvent.setup();
        const onReset = vi.fn<() => void>();
        renderWithI18n(
            <PanelSection
                section="general"
                open
                onToggle={() => undefined}
                onReset={onReset}
            >
                <p>Inhoud</p>
            </PanelSection>,
        );

        expect(screen.getByText('−')).toBeInTheDocument();
        expect(screen.getByText('Inhoud').parentElement).toHaveClass('flex');
        await user.click(
            screen.getByRole('button', {
                name: 'Alles in deze sectie terug naar standaard',
            }),
        );
        expect(onReset).toHaveBeenCalledOnce();
    });
});
