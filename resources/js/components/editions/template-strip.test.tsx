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
    it('offers the same eleven starts as Nieuwe editie, blank first, Kinderfeest after Verjaardag', () => {
        renderWithI18n(<TemplateStrip locale="nl" />);

        const strip = screen.getByRole('region', { name: 'Begin met…' });
        const links = within(strip).getAllByRole('link');

        expect(links).toHaveLength(11);
        expect(links[0]).toHaveAccessibleName('Leeg beginnen');
        expect(links[0]).toHaveAttribute('href', '/nl/editions/new');
        expect(links[1]).toHaveAccessibleName('Begin met Je dorp of wijk');
        expect(links[1]?.getAttribute('href')).toContain('template=village');
        expect(links[4]).toHaveAccessibleName('Begin met School of klas');
        expect(links[5]).toHaveAccessibleName('Begin met Club of vereniging');
        expect(links[8]).toHaveAccessibleName('Begin met Verjaardag');
        expect(links[9]).toHaveAccessibleName('Begin met Kinderfeest');
        expect(links[10]).toHaveAccessibleName('Begin met Familie');
    });
});
