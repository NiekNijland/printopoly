import { render, screen } from '@testing-library/react';

import { Prose } from '@/components/prose';

describe('Prose', () => {
    it('renders the server-side HTML', () => {
        render(<Prose html="<h3>Thuis</h3><p>Print op A4.</p>" />);

        expect(
            screen.getByRole('heading', { name: 'Thuis' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Print op A4.')).toBeInTheDocument();
    });

    it('renders nothing for empty HTML', () => {
        const { container } = render(<Prose html="" />);

        expect(container).toBeEmptyDOMElement();
    });
});
