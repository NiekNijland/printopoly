import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LiveEdition, memorySession } from '@/features/edition/testing/session';
import { resolveEdition } from '@/lib/render/edition-resolve';
import type { Edition } from '@/lib/render/edition-types';
import { installMemoryServices, sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { LookFields } from './look-fields';

const setup = (edition: Edition = sampleEdition()) => {
    installMemoryServices();
    const session = memorySession(edition);
    renderWithI18n(
        <LiveEdition session={session}>
            {(current) => (
                <LookFields
                    session={session}
                    edition={current}
                    resolved={resolveEdition(current)}
                    interfaceLanguage="nl"
                />
            )}
        </LiveEdition>,
    );

    return Promise.resolve({ session, user: userEvent.setup() });
};

describe('LookFields (Uiterlijk)', () => {
    it('has no accent colour: the theme sets the accents (B203)', async () => {
        await setup();
        expect(
            screen.queryByRole('button', { name: /Pijlen/ }),
        ).not.toBeInTheDocument();
        expect(screen.queryByText('Accentkleur')).toBeNull();
    });

    it('picks the theme as a radio group', async () => {
        const { session, user } = await setup();
        await user.click(screen.getByRole('radio', { name: 'Riso' }));
        expect(session.edition.theme).toBe('riso');
        expect(screen.getByRole('radio', { name: 'Riso' })).toBeChecked();
    });

    it('opens the colour of a street group, sets it, and puts it back with Standaard', async () => {
        const { session, user } = await setup();
        const swatch = screen.getAllByRole('button', {
            name: /^Kleur van /,
        })[0];
        if (swatch === undefined) {
            throw new Error('No group swatch.');
        }

        await user.click(swatch);
        expect(swatch).toHaveAttribute('aria-pressed', 'true');
        const hex = screen.getByRole('textbox', { name: /hex/ });
        await user.clear(hex);
        await user.type(hex, '#123456');
        expect(
            Object.values(session.edition.elements).some(
                (element) => element.color === '#123456',
            ),
        ).toBe(true);

        await user.click(screen.getByRole('button', { name: /Standaard/ }));
        expect(
            Object.values(session.edition.elements).some(
                (element) => element.color === '#123456',
            ),
        ).toBe(false);
        await user.click(swatch);
        expect(swatch).toHaveAttribute('aria-pressed', 'false');
    });
});
