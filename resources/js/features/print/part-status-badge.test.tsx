import { screen } from '@testing-library/react';

import { renderWithI18n } from '@/testing/render';

import { PartStatusBadge } from './part-status-badge';

describe('PartStatusBadge', () => {
    it('says the status in words next to a shape, never colour alone (B98)', () => {
        const { unmount } = renderWithI18n(
            <PartStatusBadge shown="done" waitingFor={null} />,
        );
        expect(screen.getByText('klaar')).toBeInTheDocument();
        expect(screen.getByText('✓')).toHaveAttribute('aria-hidden', 'true');
        unmount();

        renderWithI18n(<PartStatusBadge shown="waiting" waitingFor="cards" />);
        expect(
            screen.getByText('wacht op Kaarten en eigendomsbewijzen'),
        ).toBeInTheDocument();
    });

    it('names a part in line, a skipped part and a failed one', () => {
        const { unmount } = renderWithI18n(
            <PartStatusBadge shown="queued" waitingFor={null} />,
        );
        expect(screen.getByText('wacht op de vorige')).toBeInTheDocument();
        unmount();

        const failed = renderWithI18n(
            <PartStatusBadge shown="failed" waitingFor={null} />,
        );
        expect(
            screen.getByText('mislukt, opnieuw proberen'),
        ).toBeInTheDocument();
        failed.unmount();

        renderWithI18n(<PartStatusBadge shown="skipped" waitingFor={null} />);
        expect(screen.getByText('–')).toBeInTheDocument();
    });
});
