import type * as InertiaReact from '@inertiajs/react';
import {
    act,
    cleanup,
    fireEvent,
    screen,
    within,
    waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useState } from 'react';

import { templateEdition } from '@/data/templates';
import type { BoxContributionData } from '@/lib/boxes/types';
import type { CheckIssue } from '@/lib/checks/types';
import { EditionBus } from '@/lib/edition/bus';
import { setElement } from '@/lib/edition/changes';
import { resolveEdition } from '@/lib/edition/resolve';
import { EditionSession } from '@/lib/edition/session';
import { MemoryEditionStorage } from '@/lib/edition/storage';
import { photo } from '@/lib/edition/test-utils';
import type { Edition, ElementOverride } from '@/lib/edition/types';
import { layerOnFold } from '@/lib/editor/layers';
import { PhotoCache } from '@/lib/editor/photo-cache';
import { newPlacement } from '@/lib/editor/placements';
import { installMemoryServices, sampleEdition } from '@/testing/editions';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

import { ElementPanel, type ElementPanelProps } from './element-panel';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof InertiaReact>()),
    usePage: () => fakePage(),
}));

const ingest = vi.hoisted(() => vi.fn());
vi.mock('@/lib/editor/ingest', () => ({ ingestPhoto: ingest }));

const context = {
    source: { w: 4000, h: 3000 },
    frame: { w: 40, h: 30 },
    bleed: 0,
};

/** The ⋯ menu of the panel head (the phone has a second one in the panel). */
const menuButton = (name: string): HTMLElement =>
    screen.getAllByRole('button', { name })[0] as HTMLElement;

async function setup(
    key: string,
    options: {
        withPhoto?: boolean;
        named?: boolean;
        issues?: CheckIssue[];
        elements?: Record<string, ElementOverride>;
    } = {},
) {
    installMemoryServices();
    const storage = new MemoryEditionStorage();
    const base = sampleEdition({
        parts: { money: true, pawns: true, boxLid: true, houseRules: true },
    });
    const edition = options.withPhoto
        ? {
              ...base,
              elements: { [key]: { photo: newPlacement('p1', context) } },
          }
        : options.named === true
          ? { ...base, elements: { [key]: { name: 'Jans Bierkelder' } } }
          : options.elements !== undefined
            ? { ...base, elements: options.elements }
            : base;
    await storage.createEdition(edition);
    const session = new EditionSession(edition, {
        storage,
        bus: new EditionBus(null, 'w'),
        now: () => 5,
        debounceMs: 1000,
    });
    const onAct = vi.fn();
    const props: ElementPanelProps = {
        session,
        edition,
        resolved: resolveEdition(edition),
        editKey: key,
        title: 'Molenweg',
        context: options.withPhoto ? context : null,
        onAct,
        cache: new PhotoCache(() => Promise.resolve(undefined)),
        issues: options.issues ?? [],
        siblings: ['space.03'],
    };

    return { session, onAct, props };
}

describe('ElementPanel photo style (B124)', () => {
    it('offers In kader and Hele vak only once there is a photo', async () => {
        const bare = await setup('space.01');

        renderWithI18n(<ElementPanel {...bare.props} />);
        expect(
            screen.queryByRole('radio', { name: 'Hele vak' }),
        ).not.toBeInTheDocument();
    });

    it('writes full on the element and goes back to framed by dropping the field', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01', {
            withPhoto: true,
        });

        const first = renderWithI18n(<ElementPanel {...props} />);
        expect(screen.getByRole('radio', { name: 'In kader' })).toBeChecked();

        await user.click(screen.getByRole('radio', { name: 'Hele vak' }));
        expect(session.edition.elements['space.01']?.photoStyle).toBe('full');

        first.unmount();
        renderWithI18n(<ElementPanel {...props} edition={session.edition} />);
        expect(screen.getByRole('radio', { name: 'Hele vak' })).toBeChecked();

        await user.click(screen.getByRole('radio', { name: 'In kader' }));
        expect(
            session.edition.elements['space.01']?.photoStyle,
        ).toBeUndefined();
    });

    it('says on what the photo is printed, not always "op het bord" (R5-08)', async () => {
        const space = await setup('space.01', { withPhoto: true });
        const first = renderWithI18n(<ElementPanel {...space.props} />);
        expect(screen.getByTestId('photo-paper-size')).toHaveTextContent(
            'Op het bord is de foto ongeveer 40 bij 30 mm.',
        );
        first.unmount();

        const pawn = await setup('pawn.01', { withPhoto: true });
        const second = renderWithI18n(<ElementPanel {...pawn.props} />);
        expect(screen.getByTestId('photo-paper-size')).toHaveTextContent(
            'Op de pion is de foto ongeveer 40 bij 30 mm.',
        );
        second.unmount();

        // A large photo, such as on the lid, gets its size only: a face fills it anyway.
        const lid = await setup('box_lid', { withPhoto: true });
        renderWithI18n(
            <ElementPanel
                {...lid.props}
                context={{ ...context, frame: { w: 267, h: 180 } }}
            />,
        );
        expect(screen.getByTestId('photo-paper-size')).toHaveTextContent(
            /^Op het deksel is de foto ongeveer 267 bij 180 mm\.$/,
        );
    });

    it('shows the message about the pawns on every pawn it is about (R5-09)', async () => {
        const message = 'Pionnen zonder foto worden lege staanders.';
        const { props } = await setup('pawn.03', {
            issues: [
                {
                    id: 'pawns.no-photo|pawn.02|photo',
                    code: 'pawns.no-photo',
                    elementKey: 'pawn.02',
                    field: 'photo',
                    severity: 'warning',
                    icon: 'triangle-alert',
                    severityLabel: { nl: 'Waarschuwing', en: 'Warning' },
                    message: { nl: message, en: message },
                    alsoKeys: ['pawn.03'],
                    about: { nl: 'Pionnen', en: 'Pawns' },
                },
            ],
        });

        renderWithI18n(<ElementPanel {...props} />);
        expect(screen.getAllByText(message).length).toBeGreaterThan(0);
    });

    it('has no choice on a corner space', async () => {
        const { props } = await setup('space.00', { withPhoto: true });

        renderWithI18n(<ElementPanel {...props} />);

        expect(
            screen.queryByRole('radio', { name: 'Hele vak' }),
        ).not.toBeInTheDocument();
    });

    it('picks another icon in the image section of a special space and goes back to the standard (B136)', async () => {
        const { props, session } = await setup('space.30');
        const user = userEvent.setup();

        renderWithI18n(<ElementPanel {...props} />);

        expect(
            screen.getByRole('heading', { name: 'Afbeelding' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('radio', { name: 'Standaardicoon' }),
        ).toBeChecked();
        // Only the choices this space has: Naar de gevangenis takes a photo too.
        expect(screen.getByRole('radio', { name: 'Foto' })).toBeInTheDocument();

        await user.click(screen.getByRole('radio', { name: 'Ander icoon' }));
        await user.click(screen.getByRole('radio', { name: 'Handboeien' }));
        expect(session.edition.elements['space.30']?.icon).toEqual({
            preset: 'handcuffs',
        });

        // The arrow keys move through the quick choice, Space picks (shadcn ToggleGroup, B196).
        screen.getByRole('radio', { name: 'Handboeien' }).focus();
        await user.keyboard('{ArrowRight}');
        expect(screen.getByRole('radio', { name: 'Fluitje' })).toHaveFocus();
        await user.keyboard(' ');
        expect(session.edition.elements['space.30']?.icon).toEqual({
            preset: 'whistle',
        });

        // The whole set: search by name and pick a lucide drawing, which shows on the space.
        await user.click(
            screen.getByRole('button', { name: /Zoek uit \d+ iconen/ }),
        );
        await user.type(
            await screen.findByRole('combobox', { name: 'Kies een icoon' }),
            'tunnel',
        );
        await user.click(
            await screen.findByRole('option', { name: /Trein in een tunnel/ }),
        );
        expect(session.edition.elements['space.30']?.icon).toEqual({
            preset: 'lucide:train-front-tunnel',
        });

        await user.click(screen.getByRole('radio', { name: 'Standaardicoon' }));
        expect(session.edition.elements['space.30']?.icon).toBeUndefined();

        await user.click(
            screen.getByRole('radio', { name: 'Eigen afbeelding' }),
        );
        expect(
            screen.getByRole('button', { name: 'Afbeelding kiezen' }),
        ).toBeInTheDocument();
    });
});

describe('ElementPanel', () => {
    beforeEach(() => ingest.mockReset());

    it('shows the fields of a space: name, photo, amounts and group', async () => {
        const { props } = await setup('space.01');

        renderWithI18n(<ElementPanel {...props} />);

        expect(screen.getByRole('radio', { name: 'Geen' })).toBeChecked();
        expect(screen.getByLabelText('Naam')).toHaveValue('Molenweg');
        expect(screen.getByLabelText('Prijs')).toHaveValue(60);
        expect(
            screen.getByText('Kies 48 tot 72. Standaard € 60.'),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Hypotheek')).toHaveValue(30);
        expect(screen.getByText('Groepskleur')).toBeInTheDocument();
        // Town and colour are group fields: they say how far they reach.
        expect(
            screen.getAllByText('geldt voor alle 2 bruine straten'),
        ).toHaveLength(2);
    });

    it('changes an amount of a space within 20% and puts it back (B132)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01');

        renderWithI18n(<ElementPanel {...props} />);
        await user.click(screen.getByRole('button', { name: 'Prijs hoger' }));
        expect(session.edition.elements['space.01']?.amounts).toEqual({
            price: 61,
        });

        const price = screen.getByLabelText('Prijs');
        await user.clear(price);
        await user.type(price, '90');
        // 90 is above 72: the edition keeps the last good amount and the field says why.
        expect(session.edition.elements['space.01']?.amounts?.price).not.toBe(
            90,
        );
        expect(
            screen.getByText('Kies een bedrag tussen 48 en 72.'),
        ).toBeInTheDocument();
        await user.clear(price);
        await user.type(price, '70');
        expect(session.edition.elements['space.01']?.amounts?.price).toBe(70);
    });

    // Bug 8 (ronde 3): "Betaal 45" above "Betaal € 50"; one tap makes them agree.
    it('sets the card amount to the amount the text names', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('card.chest.03', {
            elements: { 'card.chest.03': { text: 'Betaal 45.' } },
            issues: [
                {
                    id: 'text.amount-differs|card.chest.03|text',
                    code: 'text.amount-differs',
                    elementKey: 'card.chest.03',
                    field: 'text',
                    severity: 'warning',
                    icon: 'triangle-alert',
                    severityLabel: { nl: 'Waarschuwing', en: 'Warning' },
                    message: {
                        nl: 'De tekst noemt 45.',
                        en: 'The text says 45.',
                    },
                    data: { mentioned: -45, allowed: true },
                },
            ],
        });

        renderWithI18n(<ElementPanel {...props} />);
        await user.click(
            screen.getByRole('button', { name: 'Bedrag aanpassen' }),
        );

        expect(session.edition.elements['card.chest.03']?.amount).toBe(-45);
        // The number in the text becomes the amount of the card, so the fix raises no "already at the bottom"
        // (Sem, R5-11): with {amount} in the text the line at the bottom goes.
        expect(session.edition.elements['card.chest.03']?.text).toBe(
            'Betaal {amount}.',
        );
        expect(
            screen.getByText(
                'Het bedrag is nu 45. Het staat in de tekst, dus de regel onderaan valt weg.',
            ),
        ).toBeInTheDocument();
    });

    it('puts an amount that the text and the line both name into the text once (R5-11)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('card.chest.03', {
            elements: { 'card.chest.03': { text: 'Je tandarts kost je 50.' } },
            issues: [
                {
                    id: 'text.amount-twice|card.chest.03|text',
                    code: 'text.amount-twice',
                    elementKey: 'card.chest.03',
                    field: 'text',
                    severity: 'warning',
                    icon: 'triangle-alert',
                    severityLabel: { nl: 'Waarschuwing', en: 'Warning' },
                    message: { nl: 'De tekst noemt 50.', en: 'It says 50.' },
                },
            ],
        });

        renderWithI18n(<ElementPanel {...props} />);
        await user.click(
            screen.getByRole('button', { name: 'Alleen in de tekst' }),
        );

        expect(session.edition.elements['card.chest.03']?.text).toBe(
            'Je tandarts kost je {amount}.',
        );
        expect(
            session.edition.elements['card.chest.03']?.amount,
        ).toBeUndefined();
    });

    it('turns a card whose text says the other way in one tap (R5-11)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('card.chest.03', {
            elements: {
                'card.chest.03': {
                    text: 'Je vindt geld op straat.',
                    amount: 55,
                },
            },
            issues: [
                {
                    id: 'text.amount-direction|card.chest.03|text',
                    code: 'text.amount-direction',
                    elementKey: 'card.chest.03',
                    field: 'text',
                    severity: 'warning',
                    icon: 'triangle-alert',
                    severityLabel: { nl: 'Waarschuwing', en: 'Warning' },
                    message: {
                        nl: 'De tekst zegt betalen.',
                        en: 'It says pay.',
                    },
                    data: { says: 'pay' },
                },
            ],
        });

        renderWithI18n(<ElementPanel {...props} />);
        await user.click(
            screen.getByRole('button', { name: 'Zet op Betalen' }),
        );

        expect(session.edition.elements['card.chest.03']?.amount).toBe(-55);
        expect(
            screen.getByText('De speler betaalt nu op deze kaart.'),
        ).toBeInTheDocument();
    });

    it('lets the owner choose pay, collect or no amount on a standard card (R5-11)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('card.chest.03');

        function Live() {
            const [edition, setEdition] = useState(session.edition);
            useEffect(
                () => session.subscribe(() => setEdition(session.edition)),
                [],
            );

            return (
                <ElementPanel
                    {...props}
                    edition={edition}
                    resolved={resolveEdition(edition)}
                />
            );
        }

        renderWithI18n(<Live />);
        const direction = screen.getByRole('group', {
            name: 'Betalen of ontvangen',
        });
        expect(
            within(direction).getByRole('radio', { name: 'Betalen' }),
        ).toHaveAttribute('aria-checked', 'true');

        await user.click(
            within(direction).getByRole('radio', { name: 'Ontvangen' }),
        );
        expect(session.edition.elements['card.chest.03']?.amount).toBe(50);
        expect(screen.getByLabelText('Bedrag op de kaart')).toHaveValue(50);

        await user.click(
            within(direction).getByRole('radio', { name: 'Geen bedrag' }),
        );
        expect(session.edition.elements['card.chest.03']?.amount).toBe(0);
        expect(
            screen.queryByLabelText('Bedrag op de kaart'),
        ).not.toBeInTheDocument();

        // Back to paying the standard amount: nothing is stored.
        await user.click(
            within(direction).getByRole('radio', { name: 'Betalen' }),
        );
        expect(
            session.edition.elements['card.chest.03']?.amount,
        ).toBeUndefined();
    });

    // UX 7 (ronde 3): an amount outside the limits no longer jumps back without a word.
    it('sets an amount outside the limits to the nearest limit and says so', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01');

        renderWithI18n(<ElementPanel {...props} />);
        const price = screen.getByLabelText('Prijs');
        await user.clear(price);
        await user.type(price, '90{Enter}');

        expect(session.edition.elements['space.01']?.amounts?.price).toBe(72);
        expect(
            screen.getByText('Maximaal 72. Het bedrag staat nu op 72.'),
        ).toHaveAttribute('role', 'status');

        await user.clear(price);
        await user.type(price, '10');
        await user.tab();
        expect(session.edition.elements['space.01']?.amounts?.price).toBe(48);
        expect(
            screen.getByText('Minimaal 48. Het bedrag staat nu op 48.'),
        ).toBeInTheDocument();
    });

    it('puts an amount back to the standard amount', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01', {
            elements: { 'space.01': { amounts: { price: 70 } } },
        });

        renderWithI18n(<ElementPanel {...props} />);
        expect(screen.getByLabelText('Prijs')).toHaveValue(70);
        // Only the field that differs has the button.
        expect(
            screen.queryByRole('button', {
                name: 'Hypotheek terug naar standaard',
            }),
        ).toBeNull();
        await user.click(
            screen.getByRole('button', { name: 'Prijs terug naar standaard' }),
        );
        expect(session.edition.elements['space.01']?.amounts).toBeUndefined();
    });

    it('writes a typed name into the edition and back to standard clears it', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01');

        renderWithI18n(<ElementPanel {...props} />);
        const name = screen.getByLabelText('Naam');
        await user.clear(name);
        await user.type(name, 'Jans Bierkelder');

        expect(session.edition.elements['space.01']?.name).toBe(
            'Jans Bierkelder',
        );
    });

    it('goes back to standard by dropping every override of the element', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01', { named: true });

        renderWithI18n(<ElementPanel {...props} />);
        await user.click(menuButton('Meer voor Molenweg'));
        await user.click(
            screen.getByRole('menuitem', { name: 'Terug naar standaard' }),
        );

        expect(session.edition.elements['space.01']).toBeUndefined();
    });

    it('prefills a card amount, writes it signed, and adds what it is for (B132)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('card.chest.03');

        renderWithI18n(<ElementPanel {...props} />);
        const field = screen.getByLabelText('Bedrag op de kaart');
        // "Betaal 50" is prefilled as 50; paying stays paying.
        expect(field).toHaveValue(50);
        expect(
            screen.getByText('Kies 40 tot 60. Standaard € 50.'),
        ).toBeInTheDocument();
        await user.clear(field);
        await user.type(field, '55');
        expect(session.edition.elements['card.chest.03']?.amount).toBe(-55);

        await user.type(
            screen.getByLabelText('Waarvoor', { exact: false }),
            'je tandarts',
        );
        expect(session.edition.elements['card.chest.03']?.purpose).toBe(
            'je tandarts',
        );
    });

    it('says the limits up front, why a tiny amount is fixed, and that rent and mortgage do not follow the price (UX 7)', async () => {
        const user = userEvent.setup();
        const { props } = await setup('space.01');

        renderWithI18n(<ElementPanel {...props} />);
        expect(
            screen.getByText(
                /Huur en hypotheek pas je apart aan: ze volgen de prijs niet\./,
            ),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Tonen' }));
        // The base rent of Molenweg is 2: 20% of it is less than 1.
        expect(
            screen.getAllByText(
                'Dit bedrag is te klein om aan te passen: 20% ervan is minder dan 1.',
            ).length,
        ).toBeGreaterThan(0);
    });

    it('points to an extra card for an amount outside the limits (UX 7, B182)', async () => {
        const { props } = await setup('card.chest.03');

        renderWithI18n(<ElementPanel {...props} />);
        expect(
            screen.getByText(
                /Dat kan op een extra kaart: kies Kaart toevoegen onder de stapel\./,
            ),
        ).toBeInTheDocument();
    });

    it('writes the purpose example in the currency of the edition (bug 38)', async () => {
        const { props } = await setup('card.chest.03', {
            elements: { 'words.currency': { name: 'Kroketten', text: 'K' } },
        });

        renderWithI18n(<ElementPanel {...props} />);
        expect(
            screen.getByText(/Betaal K 50 voor je taalcursus/),
        ).toBeInTheDocument();
    });

    it('takes out the last pawns, not the one on screen (bug 27)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('pawn.08');

        renderWithI18n(<ElementPanel {...props} />);
        await user.click(screen.getByRole('radio', { name: '4' }));
        expect(
            Array.from({ length: 8 }, (_, i) => `pawn.0${i + 1}`).filter(
                (key) => session.edition.elements[key]?.hidden !== true,
            ),
        ).toEqual(['pawn.01', 'pawn.02', 'pawn.03', 'pawn.04']);
    });

    it('has no amount field on a card without money', async () => {
        const { props } = await setup('card.chance.01');

        renderWithI18n(<ElementPanel {...props} />);
        expect(screen.queryByLabelText('Betalen')).toBeNull();
        expect(screen.queryByLabelText('Ontvangen')).toBeNull();
        expect(screen.queryByRole('heading', { name: /Bedragen/ })).toBeNull();
        expect(screen.getByText('Standaardtekst')).toBeInTheDocument();
    });

    it('sets the colour of a note and points to the bank name in the edition (B85, B148)', async () => {
        const { props, session } = await setup('note.100');

        renderWithI18n(<ElementPanel {...props} />);
        fireEvent.change(screen.getByLabelText('Kleur'), {
            target: { value: '#aabbcc' },
        });
        expect(session.edition.elements['note.100']?.color).toBe('#aabbcc');
        expect(screen.queryByLabelText('Naam van de bank')).toBeNull();
        expect(
            screen.getByText('onder Woorden', { exact: false }),
        ).toBeInTheDocument();
        expect(
            screen.getAllByText('vast', { exact: false }).length,
        ).toBeGreaterThan(0);
    });

    it('goes to the words of the edition with a real button, not a link in the sentence (designcheck ronde 5)', async () => {
        const { props } = await setup('note.100');
        const onOpenWords = vi.fn();

        renderWithI18n(<ElementPanel {...props} onOpenWords={onOpenWords} />);
        const button = screen.getByRole('button', { name: 'Naar de woorden' });
        // The house button (48 px high), outside the paragraph that explains where the bank name lives.
        expect(button).toHaveAttribute('data-slot', 'button');
        expect(button).toHaveClass('h-12');
        expect(button.closest('p')).toBeNull();
        fireEvent.click(button);
        expect(onOpenWords).toHaveBeenCalledTimes(1);
    });

    it('takes a pawn out of the set and tells the editor', async () => {
        const user = userEvent.setup();
        const onRemoved = vi.fn();
        const { props, session } = await setup('pawn.03');

        renderWithI18n(<ElementPanel {...props} onRemoved={onRemoved} />);
        await user.click(menuButton('Meer voor Molenweg'));
        await user.click(
            screen.getByRole('menuitem', { name: 'Pion weghalen' }),
        );

        expect(session.edition.elements['pawn.03']?.hidden).toBe(true);
        expect(onRemoved).toHaveBeenCalled();
    });

    // Bug 33 (ronde 3): the menu lay over the title, and at 1024 px over the switch Vak / Eigendomsbewijs above the
    // panel. As shadcn's DropdownMenu it always opens downwards, under its button, and never flips up (B179).
    // Vindbaarheid point 15: what you came to do first, Terug naar standaard last.
    it('opens the element menu under its button with the actions first, and closes it with Escape', async () => {
        const user = userEvent.setup();
        const { props } = await setup('pawn.03', {
            elements: { 'pawn.03': { name: 'Oma' } },
        });

        renderWithI18n(<ElementPanel {...props} />);
        const button = menuButton('Meer voor Molenweg');
        expect(button).toHaveAttribute('aria-expanded', 'false');
        await user.click(button);
        const menu = await screen.findByRole('menu', {
            name: 'Meer voor Molenweg',
        });

        expect(button).toHaveAttribute('aria-expanded', 'true');
        expect(menu).toHaveAttribute('data-side', 'bottom');
        expect(
            within(menu)
                .getAllByRole('menuitem')
                .map((item) => item.textContent),
        ).toEqual(['Pion weghalen', 'Terug naar standaard']);
        expect(within(menu).getByRole('separator')).toBeInTheDocument();

        await user.keyboard('{Escape}');
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(button).toHaveFocus();
    });

    it('edits the house rules as text', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('house_rules');

        renderWithI18n(<ElementPanel {...props} />);
        await user.type(screen.getByLabelText('Regels'), 'Geen handel');

        expect(session.edition.elements['house_rules']?.text).toBe(
            'Geen handel',
        );
    });

    it('opens the files right away when you choose Logo without a logo, and not when there is one (B179)', async () => {
        const user = userEvent.setup();
        const click = vi
            .spyOn(HTMLInputElement.prototype, 'click')
            .mockImplementation(() => undefined);
        const { props, session } = await setup('board_center');

        const { unmount } = renderWithI18n(<ElementPanel {...props} />);
        await user.click(screen.getByRole('radio', { name: 'Logo' }));

        expect(session.edition.elements['board_center']?.centerMode).toBe(
            'logo',
        );
        expect(click).toHaveBeenCalledTimes(1);
        expect(click.mock.contexts[0]).toBe(screen.getByTestId('photo-input'));
        unmount();

        click.mockClear();
        const withLogo = await setup('board_center', { withPhoto: true });
        renderWithI18n(<ElementPanel {...withLogo.props} />);
        await user.click(screen.getByRole('radio', { name: 'Logo' }));
        expect(click).not.toHaveBeenCalled();
        click.mockRestore();
    });

    it('puts the four centre choices in two rows of two, so each fits with large letters (Gerda, Lukas: R5-18)', async () => {
        const { props } = await setup('board_center');

        renderWithI18n(<ElementPanel {...props} />);
        const choice = document.querySelector<HTMLElement>(
            '[data-slot="toggle-group"][aria-label="Wat staat er in het midden?"]',
        )!;

        expect(choice).toHaveClass('grid', 'grid-cols-2');
        expect(within(choice).getByRole('radio', { name: 'Logo' })).toHaveClass(
            'nth-[n+3]:border-t',
            'odd:border-l-0',
        );
    });

    it('never calls the plain ground of the centre "Bordgroen", which does not fit every theme (bug 38)', async () => {
        const { props } = await setup('board_center');

        renderWithI18n(<ElementPanel {...props} />);
        // Since B187 the plain ground is simply the layout "Naam"; the whole-centre photo is a layout of its own.
        expect(screen.getByRole('radio', { name: 'Naam' })).toBeInTheDocument();
        expect(
            screen.getByRole('radio', { name: 'Foto over het hele midden' }),
        ).toBeInTheDocument();
        expect(screen.queryByText(/Bordgroen/)).toBeNull();
    });

    it('offers Passend for a logo in the board centre and fits a logo already placed (B168)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('board_center', {
            withPhoto: true,
        });

        renderWithI18n(<ElementPanel {...props} />);
        expect(
            screen.queryByRole('radio', { name: 'Passend, hele foto' }),
        ).not.toBeInTheDocument();
        await user.click(screen.getByRole('radio', { name: 'Logo' }));

        expect(session.edition.elements['board_center']).toMatchObject({
            centerMode: 'logo',
            photo: { photoId: 'p1', fit: true },
        });
    });

    it('shows Vullend and Passend for the photo above the name too (B168)', async () => {
        const { props } = await setup('board_center', {
            elements: {
                board_center: {
                    centerMode: 'photo',
                    photo: newPlacement('p1', context),
                },
            },
        });

        renderWithI18n(<ElementPanel {...props} context={context} />);
        expect(screen.getByRole('radio', { name: 'Vullend' })).toBeChecked();
        expect(
            screen.getByRole('radio', { name: 'Passend, hele foto' }),
        ).not.toBeChecked();
    });

    it('puts a new logo in the board centre whole and centred (B168)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('board_center', {
            elements: { board_center: { centerMode: 'logo' } },
        });
        ingest.mockResolvedValue({
            ok: true,
            record: {
                id: 'logo-1',
                editionId: 'sample-edition-1',
                blob: new Blob(['x']),
                width: 600,
                height: 900,
                createdAt: 1,
            },
        });

        renderWithI18n(<ElementPanel {...props} />);
        await user.upload(
            screen.getByTestId('photo-input'),
            new File(['x'], 'logo.png', { type: 'image/png' }),
        );

        await waitFor(() =>
            expect(
                session.edition.elements['board_center']?.photo?.photoId,
            ).toBe('logo-1'),
        );
        expect(session.edition.elements['board_center']).toMatchObject({
            photoAspect: 600 / 900,
            photo: { cx: 0.5, cy: 0.5, scale: 1, fit: true },
        });
    });

    it('adds a text layer on the board centre and lists it with the title', async () => {
        const user = userEvent.setup();
        const onSelectLayer = vi.fn();
        const { props, session } = await setup('board_center');

        renderWithI18n(
            <ElementPanel
                {...props}
                area={{ w: 360, h: 360 }}
                onSelectLayer={onSelectLayer}
            />,
        );
        expect(screen.getByText('Titel: Zaterdagclub')).toBeInTheDocument();
        // The two add buttons share a row of the narrow panel and may shrink (no overflow at 1440 px).
        expect(
            screen.getByRole('button', { name: 'Extra foto erop' }),
        ).toHaveClass('flex-1', 'basis-36');
        await user.click(
            screen.getByRole('button', { name: 'Tekst toevoegen' }),
        );

        const layers = session.edition.elements['board_center']?.layers ?? [];
        expect(layers).toHaveLength(1);
        expect(layers[0]).toMatchObject({ kind: 'text', id: 'layer-1' });
        // A new layer starts in a free square, never on the fold lines (B183, B187).
        expect(
            layers.some((layer) =>
                layerOnFold(layer, session.edition.boardProfile),
            ),
        ).toBe(false);
        expect(onSelectLayer).toHaveBeenCalledWith('layer-1');
    });

    // Vindbaarheid point 2: Foto opens the files in one step, like Logo; no second "Foto kiezen" button.
    it('starts with the choice Geen or Foto, and Foto opens the files at once', async () => {
        const user = userEvent.setup();
        const { props } = await setup('space.01');

        renderWithI18n(<ElementPanel {...props} />);
        const input = screen.getByTestId('photo-input');
        const opened = vi.spyOn(input, 'click').mockImplementation(() => {});

        expect(screen.getByRole('radio', { name: 'Geen' })).toBeChecked();
        await user.click(screen.getByRole('radio', { name: 'Foto' }));
        expect(opened).toHaveBeenCalledOnce();
        // Until a photo is there, Geen stays chosen: a second click on Foto opens the files again.
        expect(screen.getByRole('radio', { name: 'Geen' })).toBeChecked();
        await user.click(screen.getByRole('radio', { name: 'Foto' }));
        expect(opened).toHaveBeenCalledTimes(2);
        expect(
            screen.queryByRole('button', { name: 'Foto kiezen' }),
        ).not.toBeInTheDocument();
        expect(screen.queryByRole('slider')).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Kwartslag draaien' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Foto weghalen' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('checkbox', { name: 'Zwart-wit' }),
        ).not.toBeInTheDocument();
    });

    it('shows zoom, rotate, remove and black and white once there is a photo', async () => {
        const { props } = await setup('space.01', { withPhoto: true });

        renderWithI18n(<ElementPanel {...props} />);

        expect(
            screen.getByRole('button', { name: 'Andere foto' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: 'Foto' })).toBeChecked();
        expect(screen.getByRole('slider')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Kwartslag draaien' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('checkbox', { name: 'Zwart-wit' }),
        ).toBeInTheDocument();
    });

    it('writes the town of the colour group of a street, once for the whole group', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01');

        renderWithI18n(<ElementPanel {...props} />);
        await user.type(screen.getByLabelText('Plaats'), 'Zwolle');

        expect(session.edition.elements['group.brown']?.town).toBe('Zwolle');
        expect(session.edition.elements['space.01']).toBeUndefined();

        await user.clear(screen.getByLabelText('Plaats'));

        expect(session.edition.elements['group.brown']?.town).toBeUndefined();
    });

    it('has no town field on a space that is not a street', async () => {
        const { props } = await setup('space.05');

        renderWithI18n(<ElementPanel {...props} />);

        expect(screen.queryByLabelText('Plaats')).not.toBeInTheDocument();
    });

    it('zooms 100 to 300%, rotates, goes black and white and reports the resolution', async () => {
        const user = userEvent.setup();
        const { props, onAct } = await setup('space.01', { withPhoto: true });

        renderWithI18n(<ElementPanel {...props} />);
        const slider = screen.getByRole('slider', { name: 'Zoom 100%' });

        expect(slider).toHaveAttribute('aria-valuemin', '100');
        expect(slider).toHaveAttribute('aria-valuemax', '300');
        expect(screen.getByText('Scherp genoeg')).toBeInTheDocument();

        slider.focus();
        await user.keyboard('{End}');
        expect(onAct).toHaveBeenLastCalledWith({ type: 'zoom-to', scale: 3 });

        await user.click(
            screen.getByRole('button', { name: 'Kwartslag draaien' }),
        );
        expect(onAct).toHaveBeenLastCalledWith({ type: 'rotate', turns: 1 });

        await user.click(screen.getByRole('checkbox', { name: 'Zwart-wit' }));
        expect(onAct).toHaveBeenLastCalledWith({ type: 'grayscale', on: true });

        await user.click(screen.getByRole('button', { name: 'Inzoomen' }));
        expect(onAct).toHaveBeenLastCalledWith(
            { type: 'zoom-by', delta: 0.1 },
            'Zoom 110%',
        );
    });

    it('removes the photo', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01', { withPhoto: true });

        renderWithI18n(<ElementPanel {...props} />);
        await user.click(screen.getByRole('radio', { name: 'Geen' }));

        expect(session.edition.elements['space.01']?.photo).toBeUndefined();
    });

    it('shows the warning of the Controle list at the field, with an icon word', async () => {
        const issue: CheckIssue = {
            id: 'x',
            code: 'photo.low-resolution',
            elementKey: 'space.01',
            field: 'photo',
            severity: 'warning',
            icon: 'triangle-alert',
            severityLabel: { nl: 'Waarschuwing', en: 'Warning' },
            message: {
                nl: 'De foto heeft 112 dpi.',
                en: 'The photo has 112 dpi.',
            },
        };
        const { props } = await setup('space.01', {
            withPhoto: true,
            issues: [issue],
        });

        renderWithI18n(<ElementPanel {...props} />);

        expect(screen.getByText('Waarschuwing:')).toBeInTheDocument();
        expect(screen.getByText(/De foto heeft 112 dpi\./)).toBeInTheDocument();
    });

    it('puts a chosen photo in the element', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01');
        const record = {
            id: 'photo-1',
            editionId: 'sample-edition-1',
            blob: new Blob(['x']),
            width: 800,
            height: 600,
            createdAt: 1,
        };

        ingest.mockResolvedValue({ ok: true, record });
        renderWithI18n(<ElementPanel {...props} />);
        const input = screen.getByTestId('photo-input');
        await user.upload(
            input,
            new File(['x'], 'strand.jpg', { type: 'image/jpeg' }),
        );

        await waitFor(() =>
            expect(session.edition.elements['space.01']?.photo?.photoId).toBe(
                'photo-1',
            ),
        );
        expect(session.edition.elements['space.01']).toMatchObject({
            photo: { cx: 0.5, cy: 0.5, scale: 1 },
        });
    });

    // Bug 16 (ronde 3): "Foto kiezen" made way for "Andere foto" and the focus fell to body.
    it('puts the focus on Andere foto after the first photo', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01');
        ingest.mockResolvedValue({
            ok: true,
            record: {
                id: 'photo-1',
                editionId: 'sample-edition-1',
                blob: new Blob(['x']),
                width: 800,
                height: 600,
                createdAt: 1,
            },
        });

        function Live() {
            const [edition, setEdition] = useState(session.edition);
            useEffect(
                () => session.subscribe(() => setEdition(session.edition)),
                [],
            );

            return <ElementPanel {...props} edition={edition} />;
        }

        renderWithI18n(<Live />);
        const input = screen.getByTestId('photo-input');
        vi.spyOn(input, 'click').mockImplementation(() => {});
        await user.click(screen.getByRole('radio', { name: 'Foto' }));
        // The file picker took the focus away and gave it back to nothing.
        (document.activeElement as HTMLElement | null)?.blur();
        fireEvent.change(input, {
            target: {
                files: [new File(['x'], 'strand.jpg', { type: 'image/jpeg' })],
            },
        });

        const replace = await screen.findByRole('button', {
            name: 'Andere foto',
        });
        await waitFor(() => expect(replace).toHaveFocus());
    });

    it('gives several chosen photos to the next elements', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01');
        let n = 0;

        ingest.mockImplementation(() =>
            Promise.resolve({
                ok: true,
                record: {
                    id: `photo-${String(++n)}`,
                    editionId: 'e',
                    blob: new Blob(['x']),
                    width: 8,
                    height: 6,
                    createdAt: 1,
                },
            }),
        );
        renderWithI18n(<ElementPanel {...props} />);
        await user.upload(screen.getByTestId('photo-input'), [
            new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
            new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
        ]);

        await waitFor(() =>
            expect(session.edition.elements['space.03']?.photo?.photoId).toBe(
                'photo-2',
            ),
        );
        expect(session.edition.elements['space.01']?.photo?.photoId).toBe(
            'photo-1',
        );
    });

    it('gives several photos only to empty elements of the same kind, and says where they went (bug 7, ronde 4)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01');
        let n = 0;
        // Space 03 already has a photo: a choice of several never overwrites it.
        const { change } = setElement(session.edition, 'space.03', {
            photo: photo('old'),
        });
        if (change !== null) {
            session.apply([change]);
        }

        ingest.mockImplementation(() =>
            Promise.resolve({
                ok: true,
                record: {
                    id: `photo-${String(++n)}`,
                    editionId: 'e',
                    blob: new Blob(['x']),
                    width: 8,
                    height: 6,
                    createdAt: 1,
                },
            }),
        );
        // Standard board: 02 Community Chest and 04 income tax have no photo frame, 03 a photo already, 05 is a
        // station and 10 a corner; 06 and 08 are empty streets.
        renderWithI18n(
            <ElementPanel
                {...props}
                siblings={[
                    'space.02',
                    'space.03',
                    'space.04',
                    'space.05',
                    'space.06',
                    'space.07',
                    'space.08',
                    'space.10',
                ]}
            />,
        );
        await user.upload(screen.getByTestId('photo-input'), [
            new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
            new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
            new File(['c'], 'c.jpg', { type: 'image/jpeg' }),
            new File(['d'], 'd.jpg', { type: 'image/jpeg' }),
        ]);

        await waitFor(() =>
            expect(session.edition.elements['space.08']?.photo?.photoId).toBe(
                'photo-3',
            ),
        );
        expect(session.edition.elements['space.01']?.photo?.photoId).toBe(
            'photo-1',
        );
        expect(session.edition.elements['space.06']?.photo?.photoId).toBe(
            'photo-2',
        );
        expect(session.edition.elements['space.03']?.photo?.photoId).toBe(
            'old',
        );
        expect(session.edition.elements['space.05']?.photo).toBeUndefined();
        expect(session.edition.elements['space.10']?.photo).toBeUndefined();
        expect(session.edition.elements['space.02']?.photo).toBeUndefined();
        expect(await screen.findByText(/3 foto's geplaatst/)).toBeVisible();
        expect(screen.getByText(/Overgeslagen: 5 vakken/)).toBeVisible();
        // The fourth photo found no empty street: the list asks where it goes (B237).
        expect(screen.getByText(/Deze foto vond geen plek/)).toBeVisible();
        expect(
            within(screen.getByTestId('photos-missed')).getByText('d.jpg'),
        ).toBeVisible();
    });

    it('moves a photo of the list to another space, and trades places with a photo there (UX 4, ronde 4)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01');
        let n = 0;

        ingest.mockImplementation(() =>
            Promise.resolve({
                ok: true,
                record: {
                    id: `photo-${String(++n)}`,
                    editionId: 'e',
                    blob: new Blob(['x']),
                    width: 8,
                    height: 6,
                    createdAt: 1,
                },
            }),
        );
        renderWithI18n(
            <ElementPanel
                {...props}
                siblings={['space.03', 'space.06', 'space.08']}
            />,
        );
        await user.upload(screen.getByTestId('photo-input'), [
            new File(['a'], 'oma.jpg', { type: 'image/jpeg' }),
            new File(['b'], 'kerk.jpg', { type: 'image/jpeg' }),
        ]);
        await waitFor(() =>
            expect(session.edition.elements['space.03']?.photo?.photoId).toBe(
                'photo-2',
            ),
        );

        // kerk.jpg goes to space 08 instead: space 03 is empty again.
        const kerk = screen.getByRole('combobox', {
            name: 'Waar komt kerk.jpg?',
        });
        const label = (key: string) =>
            screen
                .getAllByRole<HTMLOptionElement>('option')
                .find((option) => option.value === key)?.textContent ?? '';
        await user.selectOptions(kerk, 'space.08');
        expect(session.edition.elements['space.08']?.photo?.photoId).toBe(
            'photo-2',
        );
        expect(session.edition.elements['space.03']?.photo).toBeUndefined();

        // oma.jpg to space 08: the two photos trade places.
        await user.selectOptions(
            screen.getByRole('combobox', { name: 'Waar komt oma.jpg?' }),
            'space.08',
        );
        expect(session.edition.elements['space.08']?.photo?.photoId).toBe(
            'photo-1',
        );
        expect(session.edition.elements['space.01']?.photo?.photoId).toBe(
            'photo-2',
        );
        expect(label('space.06')).not.toBe('');

        // Ongedaan maken puts every space back as it was before the choice.
        await user.click(
            screen.getByRole('button', { name: 'Ongedaan maken' }),
        );
        for (const key of ['space.01', 'space.03', 'space.06', 'space.08']) {
            expect(session.edition.elements[key]?.photo).toBeUndefined();
        }
    });

    it('puts photos named after a space on that space, says so, and undoes them in one step (B237)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01');
        let n = 0;

        ingest.mockImplementation(() =>
            Promise.resolve({
                ok: true,
                record: {
                    id: `photo-${String(++n)}`,
                    editionId: 'e',
                    blob: new Blob(['x']),
                    width: 8,
                    height: 6,
                    createdAt: 1,
                },
            }),
        );
        renderWithI18n(<ElementPanel {...props} siblings={['space.03']} />);
        await user.upload(screen.getByTestId('photo-input'), [
            new File(['a'], 'Kroonpléin.jpg', { type: 'image/jpeg' }),
            new File(['b'], 'IMG_0001.jpg', { type: 'image/jpeg' }),
        ]);

        await waitFor(() =>
            expect(session.edition.elements['space.01']?.photo?.photoId).toBe(
                'photo-2',
            ),
        );
        // Kroonplein is space 39, far from the open space: its name brought it there.
        expect(session.edition.elements['space.39']?.photo?.photoId).toBe(
            'photo-1',
        );
        const list = screen.getByTestId('photos-placed');
        expect(within(list).getByText('1 op naam gevonden')).toBeVisible();
        expect(list.querySelectorAll('[data-placed-how="name"]')).toHaveLength(
            1,
        );
        expect(within(list).getByText('op naam')).toBeVisible();

        await user.click(
            screen.getByRole('button', { name: 'Ongedaan maken' }),
        );
        expect(session.edition.elements['space.39']).toBeUndefined();
        expect(session.edition.elements['space.01']).toBeUndefined();
    });

    it('moves the photo of a space to another one, and trades it with a photo there (B238)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01', {
            elements: {
                'space.01': { photo: photo('mine') },
                'space.06': { photo: photo('theirs') },
            },
        });

        renderWithI18n(<ElementPanel {...props} />);
        await user.click(
            screen.getByRole('button', { name: 'Naar ander vak…' }),
        );
        const dialog = await screen.findByRole('dialog');
        expect(
            within(dialog).getByText('Foto van Molenweg wisselen'),
        ).toBeVisible();
        await user.click(
            dialog.querySelector<HTMLElement>(
                '[data-photo-swap-target="space.06"]',
            ) as HTMLElement,
        );

        expect(session.edition.elements['space.01']?.photo?.photoId).toBe(
            'theirs',
        );
        expect(session.edition.elements['space.06']?.photo?.photoId).toBe(
            'mine',
        );
        // One undo step puts both back.
        session.undo();
        expect(session.edition.elements['space.01']?.photo?.photoId).toBe(
            'mine',
        );
        expect(session.edition.elements['space.06']?.photo?.photoId).toBe(
            'theirs',
        );
    });

    it('offers the logo of the board on the box lid, whole and straight (B241)', async () => {
        const user = userEvent.setup();
        const logo = { ...photo('logo'), rotation: 0 };
        const { props, session } = await setup('box_lid', {
            elements: {
                board_center: { centerMode: 'logo', photo: logo },
            },
        });

        renderWithI18n(<ElementPanel {...props} title="Doosdeksel" />);
        await user.click(
            screen.getByRole('radio', { name: 'Logo van het bord' }),
        );

        expect(session.edition.elements['box_lid']?.photo).toEqual({
            photoId: 'logo',
            cx: 0.5,
            cy: 0.5,
            scale: 1,
            rotation: 0,
            grayscale: false,
            fit: true,
        });
    });

    it('has no logo choice on the lid without a logo in the centre (B241)', async () => {
        const { props } = await setup('box_lid');

        renderWithI18n(<ElementPanel {...props} title="Doosdeksel" />);
        expect(
            screen.queryByRole('radio', { name: 'Logo van het bord' }),
        ).toBeNull();
    });

    it('shows a photo layer in the list as a small preview of the photo (R5-07)', async () => {
        const { props } = await setup('board_center', {
            elements: {
                board_center: {
                    layers: [
                        {
                            id: 'layer-1',
                            kind: 'photo',
                            photo: photo('p9'),
                            x: 10,
                            y: 10,
                            w: 40,
                            h: 30,
                        },
                    ],
                },
            },
        });

        renderWithI18n(
            <ElementPanel
                {...props}
                area={{ w: 360, h: 360 }}
                selectedLayer="layer-1"
            />,
        );
        const row = document.querySelector('[data-layer-row="photo"]');
        expect(row?.querySelector('[data-layer-preview]')).not.toBeNull();
        expect(row).toHaveTextContent('Foto');
        expect(row).not.toHaveTextContent('gekozen');
    });

    it('keeps the one photo of the centre when the layout changes (UX 1, ronde 4)', async () => {
        const user = userEvent.setup();
        const named = await setup('board_center', {
            elements: {
                board_center: { centerMode: 'photo', photo: photo('p1') },
            },
        });
        renderWithI18n(<ElementPanel {...named.props} />);

        await user.click(
            screen.getByRole('radio', { name: 'Foto over het hele midden' }),
        );
        const full = named.session.edition.elements['board_center'];
        expect(full?.background?.photoId).toBe('p1');
        expect(full?.photo).toBeUndefined();
        expect(full?.centerMode).toBeUndefined();
        cleanup();

        const whole = await setup('board_center', {
            elements: { board_center: { background: photo('p2') } },
        });
        renderWithI18n(<ElementPanel {...whole.props} />);
        expect(
            screen.getByRole('radio', { name: 'Foto over het hele midden' }),
        ).toBeChecked();
        await user.click(screen.getByRole('radio', { name: 'Logo' }));
        const logo = whole.session.edition.elements['board_center'];
        expect(logo?.photo?.photoId).toBe('p2');
        expect(logo?.photo?.fit).toBe(true);
        expect(logo?.background).toBeUndefined();
        expect(logo?.centerMode).toBe('logo');
    });

    it('keeps the photo chosen right after "Foto over het hele midden" (R5-02)', async () => {
        const user = userEvent.setup();
        const click = vi
            .spyOn(HTMLInputElement.prototype, 'click')
            .mockImplementation(() => undefined);
        const { props, session } = await setup('board_center');
        ingest.mockImplementation(() =>
            Promise.resolve({
                ok: true,
                record: {
                    id: 'kerk',
                    editionId: 'e',
                    blob: new Blob(['x']),
                    width: 2400,
                    height: 3200,
                    createdAt: 1,
                },
            }),
        );
        renderWithI18n(<ElementPanel {...props} />);
        const field = screen.getByTestId('background-input');

        await user.click(
            screen.getByRole('radio', { name: 'Foto over het hele midden' }),
        );
        // The file chooser opened on this field: it has to stay, or the chosen file goes nowhere.
        expect(click.mock.contexts[0]).toBe(field);
        expect(field.isConnected).toBe(true);
        click.mockRestore();

        await user.upload(
            field,
            new File(['a'], 'kerk.jpg', { type: 'image/jpeg' }),
        );
        await waitFor(() =>
            expect(
                session.edition.elements['board_center']?.background?.photoId,
            ).toBe('kerk'),
        );
        // A standing photo starts with its faces a third from the top of the centre, clear of the fold (R5-03).
        const start = session.edition.elements['board_center']?.background;
        expect(start?.cy).toBeCloseTo(1 / 3 + 0.75 / 6, 2);
    });

    it('starts a photo moved over the whole centre clear of the fold, not with the crop of its square (R5-03)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('board_center', {
            elements: {
                board_center: {
                    centerMode: 'photo',
                    photo: { ...photo('p1'), cx: 0.5, cy: 1 / 3, scale: 1.4 },
                },
            },
        });
        props.cache.add({
            id: 'p1',
            editionId: 'e',
            blob: new Blob(['x']),
            width: 3000,
            height: 4000,
            createdAt: 1,
        });
        renderWithI18n(<ElementPanel {...props} />);

        await user.click(
            screen.getByRole('radio', { name: 'Foto over het hele midden' }),
        );
        const background = session.edition.elements['board_center']?.background;
        expect(background?.photoId).toBe('p1');
        expect(background?.scale).toBe(1);
        expect(background?.cy).toBeCloseTo(1 / 3 + 0.75 / 6, 2);
    });

    it('starts a photo on the invitation whole, so a standing drawing keeps its head (UX 4, ronde 4)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('invitation');

        ingest.mockImplementation(() =>
            Promise.resolve({
                ok: true,
                record: {
                    id: 'portrait',
                    editionId: 'e',
                    blob: new Blob(['x']),
                    width: 600,
                    height: 900,
                    createdAt: 1,
                },
            }),
        );
        renderWithI18n(<ElementPanel {...props} />);
        await user.upload(
            screen.getByTestId('photo-input'),
            new File(['a'], 'mila.jpg', { type: 'image/jpeg' }),
        );

        await waitFor(() =>
            expect(session.edition.elements['invitation']?.photo?.fit).toBe(
                true,
            ),
        );
    });

    it('moves the name off the fold lines with one tap in Controle (B183)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('board_center', {
            elements: { board_center: { centerPlace: 'middle' } },
            issues: [
                {
                    id: 'center.on-fold|board_center|center-place',
                    code: 'center.on-fold',
                    elementKey: 'board_center',
                    field: 'center-place',
                    severity: 'warning',
                    icon: 'triangle-alert',
                    severityLabel: { nl: 'Waarschuwing', en: 'Warning' },
                    message: {
                        nl: 'De naam ligt over de vouwlijnen.',
                        en: 'The name lies across the fold lines.',
                    },
                },
            ],
        });
        renderWithI18n(<ElementPanel {...props} />);

        await user.click(screen.getByRole('button', { name: 'Verschuiven' }));

        expect(
            session.edition.elements['board_center']?.centerPlace,
        ).toBeUndefined();
        expect(
            await screen.findByText('Verschoven, van de vouwlijnen af.'),
        ).toBeVisible();
    });

    it('says one skipped space in the singular, not "1 vakken"', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01');
        let n = 0;

        ingest.mockImplementation(() =>
            Promise.resolve({
                ok: true,
                record: {
                    id: `photo-${String(++n)}`,
                    editionId: 'e',
                    blob: new Blob(['x']),
                    width: 8,
                    height: 6,
                    createdAt: 1,
                },
            }),
        );
        renderWithI18n(
            <ElementPanel {...props} siblings={['space.02', 'space.03']} />,
        );
        await user.upload(screen.getByTestId('photo-input'), [
            new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
            new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
        ]);

        await waitFor(() =>
            expect(session.edition.elements['space.03']?.photo?.photoId).toBe(
                'photo-2',
            ),
        );
        expect(
            await screen.findByText(/Overgeslagen: 1 vak met al een foto/),
        ).toBeVisible();
        expect(screen.queryByText(/1 vakken/)).toBeNull();
    });

    it('lists which photo went where after several, and undoes them all in one step (ronde 3, UX 1)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01');
        let n = 0;

        ingest.mockImplementation(() =>
            Promise.resolve({
                ok: true,
                record: {
                    id: `photo-${String(++n)}`,
                    editionId: 'e',
                    blob: new Blob(['x']),
                    width: 8,
                    height: 6,
                    createdAt: 1,
                },
            }),
        );
        renderWithI18n(<ElementPanel {...props} />);
        await user.upload(screen.getByTestId('photo-input'), [
            new File(['a'], 'bakker.jpg', { type: 'image/jpeg' }),
            new File(['b'], 'kerk.jpg', { type: 'image/jpeg' }),
        ]);

        const list = await screen.findByTestId('photos-placed');
        expect(within(list).getByText("2 foto's geplaatst")).toBeVisible();
        expect(within(list).getByText('bakker.jpg')).toBeVisible();
        expect(within(list).getByText('kerk.jpg')).toBeVisible();

        await user.click(
            within(list).getByRole('button', { name: 'Ongedaan maken' }),
        );

        expect(session.edition.elements['space.01']?.photo).toBeUndefined();
        expect(session.edition.elements['space.03']?.photo).toBeUndefined();
        expect(within(list).getByText(/Teruggezet/)).toBeVisible();
    });

    it('starts a standing photo at the top third, where the faces are (ronde 3, UX 1)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('pawn.01');

        ingest.mockResolvedValue({
            ok: true,
            record: {
                id: 'portrait',
                editionId: 'e',
                blob: new Blob(['x']),
                width: 3000,
                height: 4000,
                createdAt: 1,
            },
        });
        renderWithI18n(<ElementPanel {...props} />);
        await user.click(screen.getByRole('radio', { name: 'Foto' }));
        await user.upload(
            screen.getByTestId('photo-input'),
            new File(['a'], 'oma.jpg', { type: 'image/jpeg' }),
        );

        await waitFor(() =>
            expect(session.edition.elements['pawn.01']?.photo?.cy).toBeCloseTo(
                1 / 3,
            ),
        );
    });

    it('offers Vullend and Passend for a photo, and Passend acts on the photo (B168)', async () => {
        const user = userEvent.setup();
        const { props } = await setup('space.01', { withPhoto: true });

        renderWithI18n(<ElementPanel {...props} />);
        await user.click(
            screen.getByRole('radio', { name: 'Passend, hele foto' }),
        );

        expect(props.onAct).toHaveBeenCalledWith(
            { type: 'fit', on: true },
            'De hele foto staat in het kader.',
        );
    });

    it('puts the photo of a street on its title deed unless switched off (B157)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01', { withPhoto: true });

        renderWithI18n(<ElementPanel {...props} />);
        const also = screen.getByRole('checkbox', {
            name: 'Ook op het eigendomsbewijs',
        });

        expect(also).toBeChecked();
        await user.click(also);
        expect(session.edition.elements['space.01']?.deedPhoto).toBe(false);
    });

    it('lets a title deed show the photo of its space, none, or its own (B157)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('deed.01', {
            elements: { 'space.01': { photo: newPlacement('p1', context) } },
        });

        renderWithI18n(<ElementPanel {...props} />);

        expect(
            screen.getByRole('radio', { name: 'Foto van het vak' }),
        ).toBeChecked();
        await user.click(screen.getByRole('radio', { name: 'Geen' }));
        expect(session.edition.elements['space.01']?.deedPhoto).toBe(false);
    });

    it('has a story field for a title deed (B169)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('deed.01');

        renderWithI18n(<ElementPanel {...props} />);
        await user.type(
            screen.getByRole('textbox', { name: /Verhaal/ }),
            'Hier woonde opa',
        );

        expect(session.edition.elements['deed.01']?.text).toBe(
            'Hier woonde opa',
        );
    });

    it('puts a pasted image on the chosen element and says so when the clipboard has none', async () => {
        const { props, session } = await setup('space.01');

        ingest.mockImplementation(() =>
            Promise.resolve({
                ok: true,
                record: {
                    id: 'pasted-1',
                    editionId: 'e',
                    blob: new Blob(['x']),
                    width: 8,
                    height: 6,
                    createdAt: 1,
                },
            }),
        );
        renderWithI18n(<ElementPanel {...props} />);

        const paste = (files: File[]): void => {
            const event = new Event('paste', {
                bubbles: true,
                cancelable: true,
            });

            Object.defineProperty(event, 'clipboardData', {
                value: { files },
            });
            document.body.dispatchEvent(event);
        };

        act(() => paste([]));
        expect(
            await screen.findByText(/geen foto op het klembord/),
        ).toBeVisible();

        act(() => paste([new File(['a'], 'image.png', { type: 'image/png' })]));
        await waitFor(() =>
            expect(session.edition.elements['space.01']?.photo?.photoId).toBe(
                'pasted-1',
            ),
        );
    });

    it('leaves a paste inside a text field alone', async () => {
        const { props } = await setup('space.01');

        renderWithI18n(<ElementPanel {...props} />);
        const event = new Event('paste', { bubbles: true, cancelable: true });

        Object.defineProperty(event, 'clipboardData', { value: { files: [] } });
        screen.getByLabelText('Naam').dispatchEvent(event);

        expect(event.defaultPrevented).toBe(false);
        expect(screen.queryByText(/geen foto op het klembord/)).toBeNull();
    });

    it('offers no photo on a space that shows none', async () => {
        const { props } = await setup('space.02');

        renderWithI18n(<ElementPanel {...props} />);

        expect(screen.queryByTestId('photo-input')).not.toBeInTheDocument();
        expect(screen.queryByRole('radio', { name: 'Foto' })).toBeNull();
    });

    it('shows the error text of the design with the file name in bold', async () => {
        const user = userEvent.setup({ applyAccept: false });
        const { props } = await setup('space.01');

        ingest.mockResolvedValue({
            ok: false,
            error: {
                code: 'unsupported-type',
                fileName: 'vakantie.tiff',
                rest: {
                    nl: 'kan niet: kies een JPEG, PNG, WebP of HEIC.',
                    en: "can't be used: choose a JPEG, PNG, WebP or HEIC.",
                },
            },
        });
        renderWithI18n(<ElementPanel {...props} />);
        await user.upload(
            screen.getByTestId('photo-input'),
            new File(['x'], 'vakantie.tiff', { type: 'image/tiff' }),
        );

        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent(
            'vakantie.tiff kan niet: kies een JPEG, PNG, WebP of HEIC.',
        );
        expect(alert.querySelector('strong')).toHaveTextContent(
            'vakantie.tiff',
        );
    });

    it('tells when the browser storage is full', async () => {
        const user = userEvent.setup();
        const { props } = await setup('space.01');

        ingest.mockResolvedValue({
            ok: false,
            storageFull: true,
            fileName: 'strand.jpg',
        });
        renderWithI18n(<ElementPanel {...props} />);
        await user.upload(
            screen.getByTestId('photo-input'),
            new File(['x'], 'strand.jpg', { type: 'image/jpeg' }),
        );

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'past niet meer in de opslag van deze browser',
        );
        await act(() => Promise.resolve());
    });

    it('drops an upload error when a new file is chosen and when another element is shown', async () => {
        const user = userEvent.setup({ applyAccept: false });
        const { props } = await setup('space.01');

        ingest.mockResolvedValueOnce({
            ok: false,
            error: {
                code: 'unsupported-type',
                fileName: 'vakantie.tiff',
                rest: { nl: 'kan niet.', en: "can't be used." },
            },
        });
        function Switcher() {
            const [key, setKey] = useState('space.01');

            return (
                <>
                    <button type="button" onClick={() => setKey('space.03')}>
                        volgende
                    </button>
                    <ElementPanel {...props} editKey={key} />
                </>
            );
        }
        renderWithI18n(<Switcher />);
        await user.upload(
            screen.getByTestId('photo-input'),
            new File(['x'], 'vakantie.tiff', { type: 'image/tiff' }),
        );
        expect(await screen.findByRole('alert')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'volgende' }));
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('gives a corner a short text with the standard line as placeholder, and a street none', async () => {
        const user = userEvent.setup();
        const start = await setup('space.00');

        renderWithI18n(<ElementPanel {...start.props} />);
        const field = screen.getByLabelText(/Korte tekst/);
        expect(field).toHaveAttribute(
            'placeholder',
            'Ontvang €\u00A0200 als je langs Start komt',
        );
        await user.type(field, 'Pak je salaris');
        expect(start.session.edition.elements['space.00']?.text).toBe(
            'Pak je salaris',
        );
        await user.clear(field);
        expect(start.session.edition.elements['space.00']).toBeUndefined();
    });

    it('does not offer a short text on a street or a card space', async () => {
        const street = await setup('space.01');

        renderWithI18n(<ElementPanel {...street.props} />);

        expect(screen.queryByLabelText(/Korte tekst/)).toBeNull();
        expect(screen.queryByLabelText('Verhaal')).toBeNull();
    });
});

describe('ElementPanel sections and patterns (B141, B142)', () => {
    beforeEach(() => ingest.mockReset());

    const headings = () =>
        screen
            .getAllByRole('heading', { level: 3 })
            .map((heading) => heading.textContent);

    it('shows the fixed sections a street has, and only those a pawn has', async () => {
        const street = await setup('space.01');
        const first = renderWithI18n(<ElementPanel {...street.props} />);
        expect(headings()).toEqual([
            'Tekst',
            'Afbeelding',
            'Bedragen',
            'Stijl',
        ]);
        first.unmount();

        const pawn = await setup('pawn.03');
        renderWithI18n(<ElementPanel {...pawn.props} title="Pion 3" />);
        expect(headings()).toEqual(['Tekst', 'Afbeelding']);
        expect(screen.getByText('Pion 3 van 8')).toBeInTheDocument();
    });

    it('counts a pawn among the pawns that are in the set', async () => {
        const pawn = await setup('pawn.03', {
            elements: {
                'pawn.01': { hidden: true },
                'pawn.07': { hidden: true },
                'pawn.08': { hidden: true },
            },
        });
        renderWithI18n(<ElementPanel {...pawn.props} title="Pion 3" />);
        expect(screen.getByText('Pion 2 van 5')).toBeInTheDocument();
    });

    it('shows Standaard at a field only when it differs, and it puts the field back', async () => {
        const user = userEvent.setup();
        const plain = await setup('space.01');
        const first = renderWithI18n(<ElementPanel {...plain.props} />);
        expect(
            screen.queryByRole('button', { name: /terug naar standaard/ }),
        ).toBeNull();
        first.unmount();

        const { props, session } = await setup('space.01', { named: true });
        renderWithI18n(<ElementPanel {...props} />);
        await user.click(
            screen.getByRole('button', { name: 'Naam terug naar standaard' }),
        );

        expect(session.edition.elements['space.01']).toBeUndefined();
    });

    it('folds the standard text of a card under the story, with one Standaard button', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('card.chance.01', {
            elements: { 'card.chance.01': { text: 'Eigen verhaal' } },
        });

        renderWithI18n(<ElementPanel {...props} />);
        expect(
            screen.getAllByRole('button', { name: /terug naar standaard/ }),
        ).toHaveLength(1);
        await user.click(screen.getByText('Standaardtekst'));
        expect(screen.getByText(/Wat er gebeurt/)).toBeVisible();

        await user.click(
            screen.getByRole('button', {
                name: 'Tekst van de kaart terug naar standaard',
            }),
        );
        expect(session.edition.elements['card.chance.01']).toBeUndefined();
    });

    it('has no Verhaal field on a corner, only a short text (bug 9)', async () => {
        const { props } = await setup('space.00');

        renderWithI18n(<ElementPanel {...props} />);

        expect(screen.getByLabelText('Korte tekst')).toBeInTheDocument();
        expect(screen.queryByText('Verhaal')).toBeNull();
    });

    it('asks before going back to standard when a photo goes with it', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01', {
            withPhoto: true,
        });

        renderWithI18n(<ElementPanel {...props} />);
        await user.click(menuButton('Meer voor Molenweg'));
        await user.click(
            screen.getByRole('menuitem', { name: 'Terug naar standaard' }),
        );
        const dialog = await screen.findByRole('dialog', {
            name: 'Terug naar standaard?',
        });
        expect(session.edition.elements['space.01']?.photo).toBeDefined();

        await user.click(
            within(dialog).getByRole('button', {
                name: 'Terug naar standaard',
            }),
        );
        expect(session.edition.elements['space.01']).toBeUndefined();
    });

    it('swaps a street with another from the menu of the panel', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01', { named: true });

        function Switcher() {
            const [key, setKey] = useState('space.01');

            return (
                <>
                    <button type="button" onClick={() => setKey('space.05')}>
                        Ander vak
                    </button>
                    <ElementPanel {...props} editKey={key} />
                </>
            );
        }
        renderWithI18n(<Switcher />);
        await user.click(menuButton('Meer voor Molenweg'));
        await user.click(
            screen.getByRole('menuitem', { name: 'Wisselen met…' }),
        );
        const dialog = await screen.findByRole('dialog', {
            name: 'Molenweg wisselen met',
        });
        // Only streets: no station or utility in the list.
        expect(within(dialog).queryByText('Station Noord')).toBeNull();
        await user.click(
            within(dialog).getByRole('button', { name: /Veldweg/ }),
        );

        expect(session.edition.elements['space.01']).toBeUndefined();
        expect(session.edition.elements['space.03']?.name).toBe(
            'Jans Bierkelder',
        );
        expect(
            screen.getByText(/Molenweg en Veldweg gewisseld/),
        ).toBeInTheDocument();

        // The line belongs to the swap: another element does not show it.
        await user.click(screen.getByRole('button', { name: 'Ander vak' }));
        expect(screen.queryByText(/Molenweg en Veldweg gewisseld/)).toBeNull();
    });

    it('clears every name on the board from the menu of a street, in one undo step (B201)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01', { named: true });
        const before = structuredClone(session.edition.elements);

        renderWithI18n(<ElementPanel {...props} />);
        await user.click(menuButton('Meer voor Molenweg'));
        await user.click(
            screen.getByRole('menuitem', {
                name: 'Alle namen op het bord leegmaken',
            }),
        );

        expect(session.edition.elements['space.01']?.name).toBe('');
        expect(session.edition.elements['space.03']?.name).toBe('');
        expect(session.edition.elements['space.05']?.name).toBe('');
        expect(session.edition.elements['space.00']).toBeUndefined();
        expect(screen.getByText(/hebben geen naam meer/)).toBeInTheDocument();

        session.undo();
        expect(session.edition.elements).toEqual(before);
    });

    it('gives an extra card a free amount and takes it out from the menu (B135)', async () => {
        const user = userEvent.setup();
        const onRemoved = vi.fn();
        const { props, session } = await setup('card.chest.17', {
            elements: {
                'card.chest.17': { added: true, text: 'Een' },
                'card.chest.18': { added: true, text: 'Twee' },
            },
        });

        renderWithI18n(
            <ElementPanel
                {...props}
                title="Algemeen Fonds 17"
                onRemoved={onRemoved}
            />,
        );
        expect(screen.getByText(/Extra kaart/)).toBeInTheDocument();
        expect(screen.queryByText('Standaardtekst')).toBeNull();

        await user.click(screen.getByRole('radio', { name: 'Ontvangen' }));
        expect(session.edition.elements['card.chest.17']?.amount).toBe(50);

        await user.click(menuButton('Meer voor Algemeen Fonds 17'));
        await user.click(
            screen.getByRole('menuitem', { name: 'Kaart weghalen' }),
        );

        expect(session.edition.elements['card.chest.17']).toEqual({
            added: true,
            text: 'Twee',
        });
        expect(session.edition.elements['card.chest.18']).toBeUndefined();
        expect(onRemoved).toHaveBeenCalled();
    });

    const proposal = {
        id: 'c1',
        elementKey: 'space.01',
        firstName: 'Joost',
        field: 'name' as const,
        value: 'Jumbostraat',
        amount: null,
        open: ['name' as const],
        hasPhoto: false,
        width: null,
        height: null,
        photoUrl: null,
        createdAt: 1,
    };

    function friendsProps(
        edition: Edition,
        contributions: BoxContributionData[],
        decision: Partial<
            NonNullable<ElementPanelProps['friends']>['decision']
        > = {},
    ): NonNullable<ElementPanelProps['friends']> {
        return {
            contributions,
            edition,
            locale: 'nl',
            decision: {
                decide: vi.fn(() => Promise.resolve()),
                working: null,
                note: null,
                problem: null,
                clear: vi.fn(),
                ...decision,
            },
            secret: null,
            busy: false,
            photos: new Map(),
        };
    }

    it('lists what friends sent for this element and applies it (B128)', async () => {
        const user = userEvent.setup();
        const decide = vi.fn(() => Promise.resolve());
        const { props } = await setup('space.01');

        renderWithI18n(
            <ElementPanel
                {...props}
                friends={friendsProps(
                    props.edition,
                    [
                        proposal,
                        { ...proposal, id: 'c2', elementKey: 'space.03' },
                    ],
                    { decide },
                )}
            />,
        );

        const section = screen.getByRole('region', { name: /Van vrienden/ });
        expect(within(section).getAllByRole('listitem')).toHaveLength(1);
        expect(section).toHaveTextContent('“Jumbostraat”van Joost');
        await user.click(
            within(section).getByRole('button', { name: 'Toepassen' }),
        );

        expect(decide).toHaveBeenCalledWith(proposal, 'accept', ['name']);
    });

    it('puts two names for one space side by side and photos and amounts apart (B175)', async () => {
        const user = userEvent.setup();
        const decide = vi.fn(() => Promise.resolve());
        const { props } = await setup('space.01');
        const maya = {
            ...proposal,
            id: 'c2',
            firstName: 'Maya',
            value: 'Dorpsstraat',
            open: ['name' as const, 'photo' as const],
            hasPhoto: true,
            photoUrl: '/api/boxes/b1/contributions/c2/photo',
        };

        renderWithI18n(
            <ElementPanel
                {...props}
                friends={friendsProps(props.edition, [proposal, maya], {
                    decide,
                })}
            />,
        );

        const section = screen.getByRole('region', { name: /Van vrienden/ });
        expect(section).toHaveTextContent('2 voorstellen, kies er één');
        expect(within(section).getAllByRole('listitem')).toHaveLength(3);
        const photo = within(section)
            .getAllByRole('listitem')
            .find((item) => item.dataset.proposal === 'c2:photo');
        expect(photo).toBeDefined();
        await user.click(
            within(photo as HTMLElement).getByRole('button', {
                name: 'Niet gebruiken',
            }),
        );

        expect(decide).toHaveBeenCalledWith(maya, 'reject', ['photo']);
    });

    it('keeps "Toegepast op" with the proposal and only at its own element (bug 30)', async () => {
        const { props } = await setup('space.01');
        const note = { element: 'space.01', text: 'Toegepast op Molenweg.' };
        const { rerender } = renderWithI18n(
            <ElementPanel
                {...props}
                friends={friendsProps(props.edition, [], { note })}
            />,
        );

        const section = screen.getByRole('region', { name: /Van vrienden/ });
        expect(within(section).getByRole('status')).toHaveTextContent(
            'Toegepast op Molenweg.',
        );

        rerender(
            <ElementPanel
                {...props}
                friends={friendsProps(props.edition, [], {
                    note: { ...note, element: 'space.03' },
                })}
            />,
        );
        expect(screen.queryByText('Toegepast op Molenweg.')).toBeNull();
        expect(
            screen.queryByRole('region', { name: /Van vrienden/ }),
        ).toBeNull();
    });

    it('shows no Van vrienden without contributions', async () => {
        const { props } = await setup('space.01');

        renderWithI18n(<ElementPanel {...props} />);

        expect(screen.queryByText('Van vrienden')).toBeNull();
    });

    it('shows no keyboard hints on a touch screen, and folds the sections there (bug 10, §3.6)', async () => {
        const user = userEvent.setup();
        const media = vi.spyOn(window, 'matchMedia').mockImplementation(
            (query: string) =>
                ({
                    matches: query.includes('coarse'),
                    media: query,
                    addEventListener: () => undefined,
                    removeEventListener: () => undefined,
                }) as unknown as MediaQueryList,
        );
        const { props } = await setup('space.01');

        renderWithI18n(<ElementPanel {...props} />);

        expect(screen.queryByText(/plakken met/)).toBeNull();
        expect(
            screen.getByRole('button', { name: /Tekst/, expanded: true }),
        ).toBeInTheDocument();
        const image = screen.getByRole('button', {
            name: /Afbeelding/,
            expanded: false,
        });
        expect(screen.queryByRole('radio', { name: 'Foto' })).toBeNull();
        await user.click(image);
        expect(screen.getByRole('radio', { name: 'Foto' })).toBeVisible();
        media.mockRestore();
    });

    it('shows the keyboard hint with a mouse and keyboard', async () => {
        const media = vi.spyOn(window, 'matchMedia').mockImplementation(
            (query: string) =>
                ({
                    matches: query.includes('min-width'),
                    media: query,
                    addEventListener: () => undefined,
                    removeEventListener: () => undefined,
                }) as unknown as MediaQueryList,
        );
        const { props } = await setup('space.01');

        renderWithI18n(<ElementPanel {...props} />);

        expect(screen.getByText(/plakken met/)).toBeInTheDocument();
        media.mockRestore();
    });
});

describe('ElementPanel on an edition from a template (B152)', () => {
    async function fromTemplate(
        key: string,
        changes: Record<string, ElementOverride | undefined>,
    ) {
        installMemoryServices();
        const storage = new MemoryEditionStorage();
        const template = templateEdition('village', 'nl');
        if (template === undefined) {
            throw new Error('no template');
        }
        let edition: Edition = { ...template, id: 'tpl' };
        for (const [elementKey, override] of Object.entries(changes)) {
            edition = setElement(edition, elementKey, override).edition;
        }
        await storage.createEdition(edition);
        const session = new EditionSession(edition, {
            storage,
            bus: new EditionBus(null, 'w'),
            now: () => 5,
            debounceMs: 1000,
        });
        const props: ElementPanelProps = {
            session,
            edition,
            resolved: resolveEdition(edition),
            editKey: key,
            title: 'Waar het allemaal begon',
            context: null,
            onAct: vi.fn(),
            cache: new PhotoCache(() => Promise.resolve(undefined)),
            issues: [],
            siblings: ['space.03'],
        };

        return { template, session, props };
    }

    it('shows no Standaard and no dot while a field still has the template value', async () => {
        const { props } = await fromTemplate('space.01', {});

        renderWithI18n(<ElementPanel {...props} />);
        expect(
            screen.queryByRole('button', { name: /terug naar standaard/ }),
        ).toBeNull();
        expect(screen.queryByText('aangepast')).toBeNull();
    });

    it('puts a renamed street back to the template name, with Standaard and with the menu', async () => {
        const user = userEvent.setup();
        const first = await fromTemplate('space.01', {
            'space.01': { name: 'Kerkpad' },
        });
        const name = first.template.elements['space.01']?.name;

        const view = renderWithI18n(<ElementPanel {...first.props} />);
        await user.click(
            screen.getByRole('button', { name: 'Naam terug naar standaard' }),
        );
        expect(first.session.edition.elements['space.01']?.name).toBe(name);
        view.unmount();

        const second = await fromTemplate('space.01', {
            'space.01': { name: 'Kerkpad', amounts: { price: 62 } },
        });
        renderWithI18n(<ElementPanel {...second.props} />);
        await user.click(menuButton('Meer voor Waar het allemaal begon'));
        await user.click(
            screen.getByRole('menuitem', { name: 'Terug naar standaard' }),
        );
        expect(second.session.edition.elements['space.01']).toEqual({ name });
    });

    it('puts a card back to the template text and amount, and folds the template text under the story', async () => {
        const user = userEvent.setup();
        const { template, session, props } = await fromTemplate(
            'card.chest.03',
            { 'card.chest.03': { text: 'Eigen verhaal', amount: -55 } },
        );
        const card = template.elements['card.chest.03'];
        const amount = Math.abs(card?.amount ?? 0);

        renderWithI18n(<ElementPanel {...props} />);
        expect(
            screen.getByText(`Kies 40 tot 60. Standaard € ${String(amount)}.`),
        ).toBeInTheDocument();
        await user.click(
            screen.getByRole('button', {
                name: 'Bedrag op de kaart terug naar standaard',
            }),
        );
        expect(session.edition.elements['card.chest.03']?.amount).toBe(
            card?.amount,
        );

        await user.click(screen.getByText('Standaardtekst'));
        expect(
            screen.getByText(/vuilnisbak/, { selector: 'span' }),
        ).toBeVisible();
        await user.click(
            screen.getByRole('button', {
                name: 'Tekst van de kaart terug naar standaard',
            }),
        );
        expect(session.edition.elements['card.chest.03']).toEqual(card);
    });
});
