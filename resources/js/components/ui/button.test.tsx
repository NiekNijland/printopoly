import { render, screen } from '@testing-library/react';

import { Button } from '@/components/ui/button';

describe('Button', () => {
    it('is a 48 px primary button of type button by default', () => {
        render(<Button>Editie maken</Button>);

        const button = screen.getByRole('button', { name: 'Editie maken' });

        expect(button).toHaveAttribute('type', 'button');
        expect(button).toHaveClass('h-12', 'bg-press', 'text-white');
    });

    it('draws the secondary variant with a 2 px ink border', () => {
        render(<Button variant="secondary">Foto kiezen</Button>);

        expect(screen.getByRole('button')).toHaveClass(
            'border-2',
            'border-ink',
            'bg-transparent',
        );
    });

    it('makes the icon variant a 48 px square', () => {
        render(
            <Button variant="icon" aria-label="Ongedaan maken">
                <svg />
            </Button>,
        );

        expect(
            screen.getByRole('button', { name: 'Ongedaan maken' }),
        ).toHaveClass('size-12');
    });

    it('styles a link when asChild is set, without a button type', () => {
        render(
            <Button asChild>
                <a href="/nl/editor">Printen</a>
            </Button>,
        );

        const link = screen.getByRole('link', { name: 'Printen' });

        expect(link).toHaveClass('h-12', 'bg-press');
        expect(link).not.toHaveAttribute('type');
    });

    it('keeps a submit type when one is given', () => {
        render(<Button type="submit">Opslaan</Button>);

        expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });
});
