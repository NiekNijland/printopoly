import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RegistrationStrip } from '@/components/registration-strip';

describe('RegistrationStrip', () => {
    it('is decoration in the four process colours, in print order', () => {
        const { container } = render(<RegistrationStrip />);
        const strip = container.firstElementChild;

        expect(strip).toHaveAttribute('aria-hidden', 'true');
        expect(
            Array.from(strip?.children ?? []).map((band) => band.className),
        ).toEqual([
            'flex-1 bg-print-cyan',
            'flex-1 bg-print-magenta',
            'flex-1 bg-print-riso-yellow',
            'flex-1 bg-press',
        ]);
    });

    it('lets a caller change the height', () => {
        const { container } = render(<RegistrationStrip className="h-3" />);

        expect(container.firstElementChild).toHaveClass('flex', 'h-3');
        expect(container.firstElementChild).not.toHaveClass('h-1.5');
    });
});
