import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { LaravelReactI18nProvider } from 'laravel-react-internationalization';
import type { ReactElement, ReactNode } from 'react';

import type { Locale } from '@/types/generated';

import en from '../../../lang/en.json';
import nl from '../../../lang/nl.json';

/** Render with the real NL or EN catalogue, as the app does. */
export const renderWithI18n = (
    ui: ReactElement,
    locale: Locale = 'nl',
): RenderResult => {
    return render(
        <LaravelReactI18nProvider
            locale={locale}
            fallbackLocale={locale}
            files={{ '/lang/nl.json': nl, '/lang/en.json': en }}
        >
            {ui}
        </LaravelReactI18nProvider>,
    );
};

export const I18nWrapper = ({ children }: { children: ReactNode }) => (
    <LaravelReactI18nProvider
        locale="nl"
        fallbackLocale="nl"
        files={{ '/lang/nl.json': nl, '/lang/en.json': en }}
    >
        {children}
    </LaravelReactI18nProvider>
);
