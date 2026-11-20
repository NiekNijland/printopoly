import { render, screen } from '@testing-library/react';

import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
    it('sets a count in mono', () => {
        render(<Badge variant="count">14/41</Badge>);

        expect(screen.getByText('14/41')).toHaveClass('font-mono', 'text-xs');
    });

    it('is neutral by default', () => {
        render(<Badge>klaar</Badge>);

        expect(screen.getByText('klaar')).toHaveClass('text-ink-soft');
    });

    it('uses the warning yellow with text, never colour alone', () => {
        render(<Badge variant="warning">2 waarschuwingen</Badge>);

        expect(screen.getByText('2 waarschuwingen')).toHaveClass('bg-warning');
    });

    it('shows a failure in drukkersrood', () => {
        render(<Badge variant="danger">Maken mislukt</Badge>);

        expect(screen.getByText('Maken mislukt')).toHaveClass('text-press');
    });
});
