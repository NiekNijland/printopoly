import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithI18n } from '@/testing/render';

import { PrintBar } from './print-bar';

type Props = Parameters<typeof PrintBar>[0];

const mount = (overrides: Partial<Props> = {}) => {
    const onCopies = vi.fn<(copies: number) => void>();
    const result = renderWithI18n(
        <PrintBar
            notice="De server maakt je PDF's."
            problem={null}
            estimate="12 pagina's"
            progress="2 van 5 klaar"
            copies={2}
            onCopies={onCopies}
            {...overrides}
        >
            <button type="button">Alles downloaden</button>
        </PrintBar>,
    );

    return { ...result, onCopies };
};

describe('PrintBar', () => {
    it('shows the server line, the estimate, the sets and the buttons', () => {
        const { container } = mount();

        expect(
            screen.getByText("De server maakt je PDF's."),
        ).toBeInTheDocument();
        expect(container.querySelector('[data-estimate]')).toHaveTextContent(
            "12 pagina's · 2 van 5 klaar",
        );
        expect(
            screen.getByRole('group', { name: 'Aantal sets' }),
        ).toHaveTextContent('2 sets');
        expect(
            screen.getByRole('button', { name: 'Alles downloaden' }),
        ).toBeInTheDocument();
        expect(screen.queryByRole('alert')).toBeNull();
        expect(screen.queryByRole('link')).toBeNull();
    });

    it('counts sets between one and forty', async () => {
        const user = userEvent.setup();
        const { onCopies } = mount();

        await user.click(
            screen.getByRole('button', { name: 'Een set minder' }),
        );
        await user.click(screen.getByRole('button', { name: 'Een set meer' }));
        expect(onCopies.mock.calls).toEqual([[1], [3]]);
    });

    it('goes no lower than one set', () => {
        mount({ copies: 1 });

        expect(
            screen.getByRole('button', { name: 'Een set minder' }),
        ).toBeDisabled();
        expect(screen.getByText('1 set')).toBeInTheDocument();
    });

    it('stops at forty sets', () => {
        mount({ copies: 40 });

        expect(
            screen.getByRole('button', { name: 'Een set meer' }),
        ).toBeDisabled();
    });

    it('puts a problem next to the button, with a way to try now', async () => {
        const user = userEvent.setup();
        const onRetryNow = vi.fn<() => void>();
        mount({
            problem: { message: 'Geen verbinding.', seconds: 10, onRetryNow },
            activity: { message: 'Foto’s versturen', fraction: 0.5 },
        });

        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent('Geen verbinding.');
        expect(screen.queryByRole('status')).toBeNull();
        expect(screen.queryByText("De server maakt je PDF's.")).toBeNull();
        await user.click(screen.getByRole('button', { name: 'Nu proberen' }));

        expect(onRetryNow).toHaveBeenCalledTimes(1);
    });

    it('has no retry button for a problem the page cannot retry', () => {
        mount({ problem: { message: 'Mislukt.', seconds: null } });

        expect(
            screen.queryByRole('button', { name: 'Nu proberen' }),
        ).toBeNull();
    });

    it('shows what it is doing with how far it got', () => {
        const { container } = mount({
            activity: { message: 'Foto’s versturen', fraction: 1.4 },
        });

        expect(screen.getByRole('status')).toHaveTextContent(
            'Foto’s versturen',
        );
        const bar = container.querySelector(
            '[data-activity] [aria-hidden] span',
        );
        expect(bar).toHaveStyle({ width: '100%' });
    });

    it('pulses when it cannot tell how far it got', () => {
        const { container } = mount({
            activity: { message: 'Bezig', fraction: null },
        });

        const bar = container.querySelector(
            '[data-activity] [aria-hidden] span',
        );
        expect(bar).toHaveClass('animate-pulse');
    });

    it('links to the open messages, which never stop printing', () => {
        mount({ check: { count: 3, href: '#nakijken' } });

        const link = screen.getByRole('link', {
            name: '3 dingen om na te kijken. Naar Nog even nakijken.',
        });
        expect(link).toHaveAttribute('href', '#nakijken');
        expect(link).toHaveTextContent('3 nakijken3 dingen om na te kijken');
    });

    it('has no link when nothing is open', () => {
        mount({ check: { count: 0, href: '#nakijken' } });

        expect(screen.queryByRole('link')).toBeNull();
    });

    it('folds the estimate open to the server line on a phone', async () => {
        const user = userEvent.setup();
        const { container } = mount();
        const fold = container.querySelector('[data-notice] button');
        if (!(fold instanceof HTMLElement)) {
            throw new Error('no fold');
        }

        await user.click(fold);

        expect(fold).toHaveAttribute('aria-expanded', 'true');
        expect(fold).toHaveTextContent('Inklappen');
        expect(container.querySelector('[data-notice]')).toHaveTextContent(
            "12 pagina's · 2 van 5 klaar",
        );
    });
});
