import type * as InertiaReact from '@inertiajs/react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useSessionSnapshot } from '@/hooks/use-edition-session';
import { EditionBus } from '@/lib/edition/bus';
import { EditionSession } from '@/lib/edition/session';
import { MemoryEditionStorage } from '@/lib/edition/storage';
import type { Edition } from '@/lib/edition/types';
import { installMemoryServices, sampleEdition } from '@/testing/editions';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

import { WordsDialog } from './words-dialog';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof InertiaReact>()),
    usePage: () => fakePage(),
}));

async function setup(
    edition: Edition = sampleEdition(),
    locale: 'nl' | 'en' = 'nl',
) {
    installMemoryServices();
    const storage = new MemoryEditionStorage();
    await storage.createEdition(edition);
    const session = new EditionSession(edition, {
        storage,
        bus: new EditionBus(null, 'w'),
        now: () => 5,
        debounceMs: 1000,
    });
    const onOpenElement = vi.fn();

    function Harness() {
        const { edition: current } = useSessionSnapshot(session);

        return (
            <WordsDialog
                session={session}
                edition={current}
                open
                onOpenChange={() => undefined}
                onOpenElement={onOpenElement}
            />
        );
    }

    renderWithI18n(<Harness />, locale);

    return { session, onOpenElement };
}

describe('WordsDialog', () => {
    it('shows the standard words as placeholders, so empty means standard', async () => {
        await setup();

        expect(screen.getByLabelText('Huis (één)')).toHaveAttribute(
            'placeholder',
            'huis',
        );
        expect(screen.getByLabelText('Huizen (meer dan één)')).toHaveAttribute(
            'placeholder',
            'huizen',
        );
        expect(screen.getByLabelText('Eerste stapel')).toHaveAttribute(
            'placeholder',
            'Kans',
        );
        expect(screen.getByLabelText('Tweede stapel')).toHaveAttribute(
            'placeholder',
            'Algemeen Fonds',
        );
        expect(screen.getByLabelText('Naam van de munt')).toHaveAttribute(
            'placeholder',
            'Euro',
        );
        expect(screen.getByLabelText('Teken')).toHaveAttribute(
            'placeholder',
            '€',
        );
        expect(
            screen.getByLabelText('De gevangenis in kaartteksten'),
        ).toHaveAttribute('placeholder', 'de gevangenis');
        expect(screen.getByLabelText('Inkomstenbelasting')).toHaveAttribute(
            'placeholder',
            'Inkomstenbelasting',
        );
        expect(
            screen.getByPlaceholderText(
                'Ontvang € 200 als je langs Start komt',
            ),
        ).toBeInTheDocument();
        expect(screen.getByPlaceholderText('In de cel')).toBeInTheDocument();
    });

    it('shows the standard words of an English edition', async () => {
        await setup(sampleEdition({ language: 'en' }), 'en');

        expect(screen.getByLabelText('House (one)')).toHaveAttribute(
            'placeholder',
            'house',
        );
        expect(screen.getByLabelText('First deck')).toHaveAttribute(
            'placeholder',
            'Chance',
        );
        expect(screen.getByLabelText('The jail in card texts')).toHaveAttribute(
            'placeholder',
            'jail',
        );
        expect(
            screen.getByPlaceholderText('Collect M200 when you pass Start'),
        ).toBeInTheDocument();
    });

    it('writes typed words into the edition and clears them when emptied', async () => {
        const user = userEvent.setup();
        const { session } = await setup();

        await user.type(screen.getByLabelText('Huis (één)'), 'Schuurtje');
        await user.type(screen.getByLabelText('Teken'), 'RP');
        await user.type(screen.getByLabelText('Eerste stapel'), 'Roddel');

        expect(session.edition.elements['words.house']).toEqual({
            name: 'Schuurtje',
        });
        expect(session.edition.elements['words.currency']).toEqual({
            text: 'RP',
        });
        expect(session.edition.elements['words.chance']).toEqual({
            name: 'Roddel',
        });

        await user.clear(screen.getByLabelText('Huis (één)'));

        expect(session.edition.elements['words.house']).toBeUndefined();
    });

    it('limits a symbol to six characters', async () => {
        const user = userEvent.setup();
        const { session } = await setup();

        await user.type(screen.getByLabelText('Teken'), 'ABCDEFGH');

        expect(session.edition.elements['words.currency']?.text).toBe('ABCDEF');
    });

    it('writes the name and the short text of a corner and the name of a tax space', async () => {
        const user = userEvent.setup();
        const { session } = await setup();
        const start = screen.getByRole('heading', { name: 'Start' })
            .parentElement as HTMLElement;

        await user.type(within(start).getByLabelText('Naam'), 'Begin');
        await user.type(
            within(start).getByLabelText('Korte tekst'),
            'Pak 200 pegels',
        );
        await user.type(
            screen.getByLabelText('Inkomstenbelasting'),
            'Dorpsbelasting',
        );

        expect(session.edition.elements['space.00']).toEqual({
            name: 'Begin',
            text: 'Pak 200 pegels',
        });
        expect(session.edition.elements['space.04']).toEqual({
            name: 'Dorpsbelasting',
        });
    });

    it('previews the amounts with the symbol of the edition', async () => {
        const user = userEvent.setup();
        await setup();

        await user.type(screen.getByLabelText('Teken'), 'RP');

        expect(
            screen.getByText(/Zo ziet een bedrag eruit: RP 1\.500/),
        ).toBeInTheDocument();
        expect(screen.getByText('RP 200 · RP 100')).toBeInTheDocument();
    });

    it('sends you to the corner to add a photo', async () => {
        const user = userEvent.setup();
        const { onOpenElement } = await setup();
        const jail = screen.getByRole('heading', { name: 'Gevangenis' })
            .parentElement as HTMLElement;

        await user.click(
            within(jail).getByRole('button', { name: 'Foto kiezen' }),
        );

        expect(onOpenElement).toHaveBeenCalledWith('space.10');
    });
});
