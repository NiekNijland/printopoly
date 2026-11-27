import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DEFAULT_BOARD_PROFILE } from '@/lib/render/print-board';
import { renderWithI18n } from '@/testing/render';

import { NewEditionCard } from './new-edition-card';

type Props = Parameters<typeof NewEditionCard>[0];

const props = (overrides: Partial<Props> = {}): Props => ({
    locale: 'nl',
    template: 'village',
    startLabel: 'Dorp of wijk',
    name: 'Zaterdagclub',
    shownName: 'Zaterdagclub',
    onName: () => undefined,
    language: 'nl',
    currency: 'eur',
    theme: 'classic',
    themeLabel: 'Klassiek',
    profile: DEFAULT_BOARD_PROFILE,
    busy: false,
    disabled: false,
    failed: false,
    ...overrides,
});

describe('NewEditionCard', () => {
    it('shows what is chosen, the name and the button', () => {
        renderWithI18n(<NewEditionCard {...props()} />);

        const card = screen.getByRole('complementary', { name: 'Je editie' });
        expect(card).toHaveAttribute('data-bar-shown', 'true');
        expect(card).toHaveTextContent('Begin: Dorp of wijk · Klassiek');
        expect(
            screen.getByRole('textbox', { name: 'Naam van je editie' }),
        ).toHaveValue('Zaterdagclub');
        expect(
            screen.getByRole('button', { name: 'Editie maken' }),
        ).toBeEnabled();
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('passes on what is typed as the name', async () => {
        const user = userEvent.setup();
        const onName = vi.fn<(name: string) => void>();
        renderWithI18n(<NewEditionCard {...props({ name: '', onName })} />);

        await user.type(screen.getByRole('textbox'), 'C');

        expect(onName).toHaveBeenCalledExactlyOnceWith('C');
    });

    it('shows the work while it makes the edition, and says when it failed', () => {
        renderWithI18n(
            <NewEditionCard {...props({ busy: true, failed: true })} />,
        );

        const button = screen.getByRole('button', {
            name: 'Editie wordt gemaakt…',
        });
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute('aria-busy', 'true');
        expect(screen.getByRole('alert')).toHaveTextContent(
            'De editie kon niet worden bewaard in deze browser. Probeer het nog een keer.',
        );
    });

    it('cannot make an edition that is not ready', () => {
        renderWithI18n(<NewEditionCard {...props({ disabled: true })} />);

        expect(
            screen.getByRole('button', { name: 'Editie maken' }),
        ).toBeDisabled();
    });

    it('links to the filled-in template, and not for the standard edition', () => {
        const { unmount } = renderWithI18n(<NewEditionCard {...props()} />);
        expect(
            screen.getByRole('link', { name: 'Bekijk dit sjabloon' }),
        ).toHaveAttribute('href', '/nl/editions/sample?template=village');
        unmount();

        renderWithI18n(
            <NewEditionCard {...props({ template: null, barShown: false })} />,
        );

        expect(screen.queryByRole('link')).toBeNull();
        expect(
            screen.getByRole('complementary', { name: 'Je editie' }),
        ).toHaveAttribute('data-bar-shown', 'false');
    });

    it('draws the name typed so far on the miniature board, and an empty one for Leeg', () => {
        const { container, unmount } = renderWithI18n(
            <NewEditionCard {...props({ shownName: 'Buurtfeest' })} />,
        );
        expect(
            container.querySelector('[aria-hidden="true"]'),
        ).toHaveTextContent('Buurtfeest');
        unmount();

        const empty = renderWithI18n(
            <NewEditionCard
                {...props({ template: null, empty: true, shownName: '' })}
            />,
        );
        const preview = empty.container.querySelector('[aria-hidden="true"]');
        expect(preview).not.toHaveTextContent('Molenweg');
        expect(preview?.querySelectorAll('svg').length).toBeGreaterThan(0);
    });
});
