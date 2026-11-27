import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LanguageSwitch } from '@/components/language-switch';
import { setPage } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

describe('LanguageSwitch', () => {
    it('offers both languages as plain links to the same page', () => {
        renderWithI18n(<LanguageSwitch />);

        const nav = screen.getByRole('navigation', { name: 'Taal' });
        const nl = within(nav).getByRole('link', { name: 'NL' });
        const en = within(nav).getByRole('link', { name: 'EN' });

        expect(nl).toHaveAttribute('href', 'http://localhost/nl');
        expect(nl).toHaveAttribute('lang', 'nl');
        expect(nl).toHaveAttribute('hreflang', 'nl');
        expect(en).toHaveAttribute('href', 'http://localhost/en');
        expect(en).toHaveAttribute('hreflang', 'en');
    });

    it('marks the current language and only that one', () => {
        renderWithI18n(<LanguageSwitch />);

        expect(screen.getByRole('link', { name: 'NL' })).toHaveAttribute(
            'aria-current',
            'true',
        );
        expect(screen.getByRole('link', { name: 'NL' })).toHaveClass('bg-ink');
        expect(screen.getByRole('link', { name: 'EN' })).not.toHaveAttribute(
            'aria-current',
        );
        expect(screen.getByRole('link', { name: 'EN' })).not.toHaveClass(
            'bg-ink',
        );
    });

    it('marks English on an English page', () => {
        setPage(fakePage({ locale: 'en' }));
        renderWithI18n(<LanguageSwitch />, 'en');

        expect(
            screen.getByRole('navigation', { name: 'Language' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'EN' })).toHaveAttribute(
            'aria-current',
            'true',
        );
    });

    it('takes extra classes', () => {
        renderWithI18n(<LanguageSwitch className="ml-auto" />);

        expect(screen.getByRole('navigation')).toHaveClass(
            'ml-auto',
            'border-ink',
        );
    });
});
