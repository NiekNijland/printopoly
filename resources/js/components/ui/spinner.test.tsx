import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Spinner } from '@/components/ui/spinner';

describe('Spinner', () => {
    it('is a spinning status called Loading', () => {
        render(<Spinner />);

        const spinner = screen.getByRole('status', { name: 'Loading' });
        expect(spinner).toHaveClass('size-4', 'animate-spin');
    });

    it('lets the caller resize it and rename it', () => {
        render(<Spinner className="size-8" aria-label="Bezig" />);

        const spinner = screen.getByRole('status', { name: 'Bezig' });
        expect(spinner).toHaveClass('size-8', 'animate-spin');
        expect(spinner).not.toHaveClass('size-4');
    });
});
