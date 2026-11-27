import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Placeholder from '@/pages/placeholder';
import { renderWithI18n } from '@/testing/render';

describe('Placeholder', () => {
    it('shows the translated title as the heading', () => {
        renderWithI18n(<Placeholder titleKey="nav.my_editions" />);

        expect(
            screen.getByRole('heading', { level: 1, name: 'Mijn edities' }),
        ).toBeInTheDocument();
    });

    it('uses the English catalogue on an English page', () => {
        renderWithI18n(<Placeholder titleKey="nav.my_editions" />, 'en');

        expect(
            screen.getByRole('heading', { level: 1, name: 'My editions' }),
        ).toBeInTheDocument();
    });
});
