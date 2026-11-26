import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LiveEdition, memorySession } from '@/features/edition/testing/session';
import type { Edition } from '@/lib/render/edition-types';
import { installMemoryServices, sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { WordFields } from './word-fields';

const setup = (edition: Edition = sampleEdition()) => {
    installMemoryServices();
    const session = memorySession(edition);
    renderWithI18n(
        <LiveEdition session={session}>
            {(current) => <WordFields session={session} edition={current} />}
        </LiveEdition>,
    );

    return Promise.resolve({ session, user: userEvent.setup() });
};

describe('WordFields (Woorden)', () => {
    it('has the words of the game and the bank, but no corners or tax spaces', async () => {
        await setup();
        expect(screen.getByLabelText('Huis (één)')).toHaveAttribute(
            'placeholder',
            'huis',
        );
        expect(
            screen.getByLabelText('De gevangenis in kaartteksten'),
        ).toHaveAttribute('placeholder', 'de gevangenis');
        expect(screen.getByLabelText('Eerste stapel')).toHaveAttribute(
            'placeholder',
            'Kans',
        );
        expect(screen.getByLabelText('Naam van de bank')).toHaveAttribute(
            'placeholder',
            'Speelgeld',
        );
        expect(screen.queryByLabelText('Inkomstenbelasting')).toBeNull();
        expect(screen.queryByText('Start')).toBeNull();
        expect(screen.queryByText(/blijven zoals in het origineel/)).toBeNull();
    });

    it('stores the bank name as a word of the edition (B148)', async () => {
        const { session, user } = await setup();

        await user.type(
            screen.getByLabelText('Naam van de bank'),
            'Bank van de club',
        );
        expect(session.edition.elements['words.bank']).toEqual({
            name: 'Bank van de club',
        });
        expect(session.edition.elements['bank']).toBeUndefined();
    });

    it('lets Standaard wrap under a long label in a narrow column instead of leaving the panel (round 4, bug 5)', async () => {
        await setup({
            ...sampleEdition(),
            elements: {
                'words.utility': { name: 'bron', text: 'bronnen' },
            },
        });
        for (const button of screen.getAllByRole('button', {
            name: /Standaard/,
        })) {
            const head = button.closest('[data-field-head]');
            expect(head?.className).toContain('flex-wrap');
            expect(head?.className).toContain('min-w-0');
        }
    });
});
