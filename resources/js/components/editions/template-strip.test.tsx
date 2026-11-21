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
    it('offers the same eight starts as Nieuwe editie, blank first, so a wide row splits four and four', () => {
        renderWithI18n(<TemplateStrip locale="nl" />);

        const strip = screen.getByRole('region', { name: 'Begin met…' });
        const links = within(strip).getAllByRole('link');

        expect(links).toHaveLength(8);
        expect(links[0]).toHaveAccessibleName('Leeg beginnen');
        expect(links[0]).toHaveAttribute('href', '/nl/editions/new');
        expect(links[1]).toHaveAccessibleName('Begin met Je dorp of wijk');
        expect(links[1]?.getAttribute('href')).toContain('template=village');
        expect(links[7]).toHaveAccessibleName('Begin met Familie');
    });
});
