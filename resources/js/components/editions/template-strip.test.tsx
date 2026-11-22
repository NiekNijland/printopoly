import type * as InertiaReact from '@inertiajs/react';
import { screen, within } from '@testing-library/react';

import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

import { TemplateStrip } from './template-strip';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof InertiaReact>()),
    usePage: () => fakePage(),
}));

describe('TemplateStrip', () => {
    it.each([
        [
            'nl',
            'Leeg beginnen',
            [
                'Dorp of wijk',
                'Familie',
                'Vrienden',
                'Feest',
                'Bruiloft',
                'Groep',
            ],
        ],
        [
            'en',
            'Start blank',
            [
                'Village or neighbourhood',
                'Family',
                'Friends',
                'Party',
                'Wedding',
                'Group',
            ],
        ],
    ] as const)(
        'offers the same seven starts as Nieuwe editie, blank first (B201, %s)',
        (locale, blank, labels) => {
            renderWithI18n(<TemplateStrip locale={locale} />, locale);

            const strip = screen.getByRole('region', {
                name: locale === 'nl' ? 'Begin met…' : 'Start from…',
            });
            const links = within(strip).getAllByRole('link');

            expect(links).toHaveLength(7);
            expect(links[0]).toHaveAccessibleName(blank);
            expect(links[0]).toHaveAttribute('href', `/${locale}/editions/new`);
            const start = locale === 'nl' ? 'Begin met' : 'Start with';
            labels.forEach((label, index) => {
                expect(links[index + 1]).toHaveAccessibleName(
                    `${start} ${label}`,
                );
            });
            expect(links[4]?.getAttribute('href')).toContain('template=party');
            expect(links[6]?.getAttribute('href')).toContain('template=group');
            for (const link of links) {
                expect(link.getAttribute('aria-label')).not.toMatch(
                    /Kinderfeest|Vrijgezellen|School|Bedrijf|Kids|Hen|Company/,
                );
            }
        },
    );
});
