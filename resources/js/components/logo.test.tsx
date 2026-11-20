import { render, screen } from '@testing-library/react';

import { Logo, LogoMark, RegistrationMark } from '@/components/logo';

describe('RegistrationMark', () => {
    it('draws the mark exactly as in the design files', () => {
        const { container } = render(<RegistrationMark />);
        const svg = container.querySelector('svg');
        const circles = container.querySelectorAll('circle');

        expect(svg).toHaveAttribute('viewBox', '0 0 28 28');
        expect(svg).toHaveAttribute('aria-hidden', 'true');
        expect(circles[0]).toHaveAttribute('r', '8');
        expect(circles[0]).toHaveAttribute('stroke', '#1B1F24');
        expect(circles[0]).toHaveAttribute('stroke-width', '2');
        expect(circles[1]).toHaveAttribute('r', '3');
        expect(circles[1]).toHaveAttribute('fill', '#C8321F');
        expect(container.querySelector('path')).toHaveAttribute(
            'd',
            'M14 1v7M14 20v7M1 14h7M20 14h7',
        );
    });

    it('uses paper on dark and the heavier drawing for the icon', () => {
        const { container } = render(<RegistrationMark tone="paper" heavy />);
        const circles = container.querySelectorAll('circle');

        expect(circles[0]).toHaveAttribute('stroke', '#F6F1E4');
        expect(circles[0]).toHaveAttribute('stroke-width', '2.5');
        expect(circles[1]).toHaveAttribute('r', '3.5');
    });
});

describe('LogoMark', () => {
    it('is a board corner in the four colours with a registration mark', () => {
        const { container } = render(<LogoMark />);
        const fills = Array.from(container.querySelectorAll('[fill]')).map(
            (node) => node.getAttribute('fill'),
        );

        expect(container.querySelector('svg')).toHaveAttribute(
            'aria-hidden',
            'true',
        );
        expect(fills).toEqual(
            expect.arrayContaining([
                '#00A3E0',
                '#E6007E',
                '#FFE600',
                '#C8321F',
            ]),
        );
        expect(container.querySelectorAll('circle')).toHaveLength(2);
    });

    it('draws the outline in paper on dark', () => {
        const { container } = render(<LogoMark tone="paper" />);

        expect(
            container.querySelectorAll('[stroke="#F6F1E4"]').length,
        ).toBeGreaterThan(2);
        expect(container.querySelector('[stroke="#1B1F24"]')).toBeNull();
    });
});

describe('Logo', () => {
    it('names the site and sets the wordmark in League Spartan 800', () => {
        const { container } = render(<Logo />);

        expect(screen.getByText('Printopoly')).toHaveClass('sr-only');
        expect(
            container.querySelector('[aria-hidden="true"].font-display'),
        ).toHaveClass('font-extrabold', 'text-3xl');
    });

    it('puts a red dot on a dotless i', () => {
        const { container } = render(<Logo />);

        expect(container.querySelector('.bg-press')).toBeInTheDocument();
        expect(container.textContent).toContain('Prıntopoly');
    });
});
