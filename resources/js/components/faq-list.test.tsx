import { render, screen } from '@testing-library/react';

import { FaqList } from '@/components/faq-list';

const items = [
    { question: 'Wat kost het?', answerHtml: '<p>Niets.</p>' },
    { question: 'Account nodig?', answerHtml: '<p>Nee.</p>' },
];

describe('FaqList', () => {
    it('shows each question with its answer', () => {
        render(<FaqList items={items} />);

        expect(screen.getByText('Wat kost het?')).toBeInTheDocument();
        expect(screen.getByText('Nee.')).toBeInTheDocument();
    });

    it('keeps every question closed by default', () => {
        const { container } = render(<FaqList items={items} />);

        expect(container.querySelectorAll('details[open]')).toHaveLength(0);
    });

    it('opens only the first question when asked to', () => {
        const { container } = render(<FaqList items={items} openFirst />);

        const details = container.querySelectorAll('details');

        expect(details[0]).toHaveAttribute('open');
        expect(details[1]).not.toHaveAttribute('open');
    });
});
