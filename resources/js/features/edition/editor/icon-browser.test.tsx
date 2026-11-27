import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { mediaQueryList } from '@/testing/media-query';
import { renderWithI18n } from '@/testing/render';

import { IconBrowser, IconGlyph } from './icon-browser';

const screenIs = (wide: boolean) =>
    vi
        .spyOn(window, 'matchMedia')
        .mockImplementation((query: string) => mediaQueryList(query, wide));

describe('IconBrowser', () => {
    it('searches the whole set beside the panel on a wide screen and picks with a click', async () => {
        screenIs(true);
        const user = userEvent.setup();
        const onChoose = vi.fn<(preset: string) => void>();

        renderWithI18n(
            <IconBrowser
                chosen="whistle"
                suggestions={['handcuffs', 'whistle']}
                color="#000"
                onChoose={onChoose}
            />,
        );
        await user.click(
            screen.getByRole('button', { name: /Zoek uit \d+ iconen/ }),
        );

        expect(
            await screen.findByRole('group', { name: 'Past bij dit vak' }),
        ).toBeInTheDocument();
        expect(
            screen
                .getAllByRole('option', { name: /Fluitje/ })
                .some((option) => option.dataset.checked === 'true'),
        ).toBe(true);

        await user.type(
            screen.getByRole('combobox', { name: 'Kies een icoon' }),
            'tunnel',
        );

        expect(
            screen.queryByRole('group', { name: 'Past bij dit vak' }),
        ).not.toBeInTheDocument();

        await user.click(
            await screen.findByRole('option', { name: /Trein in een tunnel/ }),
        );

        expect(onChoose).toHaveBeenCalledWith('lucide:train-front-tunnel');
        expect(
            screen.queryByRole('combobox', { name: 'Kies een icoon' }),
        ).not.toBeInTheDocument();
    });

    it('finds a name only when each word starts a word of it, and says when none fits', async () => {
        screenIs(true);
        const user = userEvent.setup();

        renderWithI18n(
            <IconBrowser
                chosen={null}
                suggestions={[]}
                color="#000"
                onChoose={() => undefined}
            />,
        );
        await user.click(
            screen.getByRole('button', { name: /Zoek uit \d+ iconen/ }),
        );
        await user.type(
            await screen.findByRole('combobox', { name: 'Kies een icoon' }),
            'trein',
        );

        expect(
            screen.queryByRole('option', { name: /Raam met tralies/ }),
        ).not.toBeInTheDocument();

        await user.type(
            screen.getByRole('combobox', { name: 'Kies een icoon' }),
            'xyzzy',
        );

        expect(
            await screen.findByText(
                'Geen icoon gevonden. Probeer een ander woord.',
            ),
        ).toBeInTheDocument();
    });

    it('opens the set in a drawer from the bottom on a phone', async () => {
        screenIs(false);
        const user = userEvent.setup();

        renderWithI18n(
            <IconBrowser
                chosen={null}
                suggestions={[]}
                color="#000"
                onChoose={() => undefined}
            />,
        );
        await user.click(
            screen.getByRole('button', { name: /Zoek uit \d+ iconen/ }),
        );

        expect(
            await screen.findByText(
                'Zoek op een woord of blader door de groepen. Het icoon komt in de lijn van je thema op het vak.',
            ),
        ).toBeInTheDocument();
    });
});

describe('IconGlyph', () => {
    it('draws a preset small or at full size', () => {
        const { container, rerender } = renderWithI18n(
            <IconGlyph id="whistle" color="#000" small />,
        );

        expect(container.firstElementChild).toHaveClass('size-6');

        rerender(<IconGlyph id="whistle" color="#000" />);

        expect(container.firstElementChild).toHaveClass('size-8');
    });
});
