import type * as InertiaReact from '@inertiajs/react';
import {
    act,
    fireEvent,
    screen,
    within,
    waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useState } from 'react';

import { templateEdition } from '@/data/templates';
import type { CheckIssue } from '@/lib/checks/types';
import { EditionBus } from '@/lib/edition/bus';
import { setElement } from '@/lib/edition/changes';
import { resolveEdition } from '@/lib/edition/resolve';
import { EditionSession } from '@/lib/edition/session';
import { MemoryEditionStorage } from '@/lib/edition/storage';
import type { Edition, ElementOverride } from '@/lib/edition/types';
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

        // The arrow keys move through the grid and choose as they go.
        screen.getByRole('radio', { name: 'Handboeien' }).focus();
        await user.keyboard('{ArrowRight}');
        expect(session.edition.elements['space.30']?.icon).toEqual({
            preset: 'whistle',
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
            screen.getByText('standaard € 60, 48 tot 72'),
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
        expect(
            screen.getByText('Het bedrag onderaan is nu 45.'),
        ).toBeInTheDocument();
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
        const field = screen.getByLabelText('Betalen');
        // "Betaal 50" is prefilled as 50; paying stays paying.
        expect(field).toHaveValue(50);
        expect(
            screen.getByText('standaard € 50, 40 tot 60'),
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

    // Bug 33 (ronde 3): the menu lay over the yellow warning and read as part of it.
    it('opens the element menu beside its button, on a background of its own', async () => {
        const user = userEvent.setup();
        const { props } = await setup('pawn.03');

        renderWithI18n(<ElementPanel {...props} />);
        await user.click(menuButton('Meer voor Molenweg'));
        const menu = screen.getByRole('menu');

        expect(menu).toHaveAttribute('data-side', 'left');
        expect(menu).toHaveClass('bg-paper');
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
            screen.getByRole('button', { name: 'Foto toevoegen' }),
        ).toHaveClass('flex-1', 'basis-36');
        await user.click(
            screen.getByRole('button', { name: 'Tekst toevoegen' }),
        );

        const layers = session.edition.elements['board_center']?.layers ?? [];
        expect(layers).toHaveLength(1);
        expect(layers[0]).toMatchObject({ kind: 'text', id: 'layer-1' });
        expect(onSelectLayer).toHaveBeenCalledWith('layer-1');
    });

    it('starts with the choice Geen or Foto, and Foto offers to choose one', async () => {
        const user = userEvent.setup();
        const { props } = await setup('space.01');

        renderWithI18n(<ElementPanel {...props} />);

        expect(screen.getByRole('radio', { name: 'Geen' })).toBeChecked();
        expect(
            screen.queryByRole('button', { name: 'Foto kiezen' }),
        ).not.toBeInTheDocument();
        await user.click(screen.getByRole('radio', { name: 'Foto' }));
        expect(
            screen.getByRole('button', { name: 'Foto kiezen' }),
        ).toBeInTheDocument();
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
        const slider = screen.getByRole('slider');

        expect(slider).toHaveAttribute('min', '100');
        expect(slider).toHaveAttribute('max', '300');
        expect(
            screen.getByText(/Resolutie 2540 dpi, scherp genoeg/),
        ).toBeInTheDocument();

        fireEvent.change(slider, { target: { value: '180' } });
        expect(onAct).toHaveBeenLastCalledWith({ type: 'zoom-to', scale: 1.8 });

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
        await user.click(screen.getByRole('radio', { name: 'Foto' }));
        const choose = screen.getByRole('button', { name: 'Foto kiezen' });
        choose.focus();
        fireEvent.change(screen.getByTestId('photo-input'), {
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

    it('gives several photos only to elements that can show one, and says where they went', async () => {
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
        // Standard board: 02 Community Chest and 04 income tax have no photo frame, 03 is a street, 05 a station.
        renderWithI18n(
            <ElementPanel
                {...props}
                siblings={['space.02', 'space.03', 'space.04', 'space.05']}
            />,
        );
        await user.upload(screen.getByTestId('photo-input'), [
            new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
            new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
            new File(['c'], 'c.jpg', { type: 'image/jpeg' }),
        ]);

        await waitFor(() =>
            expect(session.edition.elements['space.05']?.photo?.photoId).toBe(
                'photo-3',
            ),
        );
        expect(session.edition.elements['space.03']?.photo?.photoId).toBe(
            'photo-2',
        );
        expect(session.edition.elements['space.02']?.photo).toBeUndefined();
        expect(session.edition.elements['space.04']?.photo).toBeUndefined();
        expect(await screen.findByText(/3 foto's geplaatst/)).toBeVisible();
        expect(screen.getByText(/Overgeslagen: 2 vakken/)).toBeVisible();
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
            'Ontvang € 200 als je langs Start komt',
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
            'Bedragenbinnen 20%',
            'Stijl',
        ]);
        first.unmount();

        const pawn = await setup('pawn.03');
        renderWithI18n(<ElementPanel {...pawn.props} title="Pion 3" />);
        expect(headings()).toEqual(['Tekst', 'Afbeelding']);
        expect(screen.getByText('Pion 3 van 8')).toBeInTheDocument();
    });

    it('names the kind of the extra print items in words, not as a key (bug 1)', async () => {
        const { props } = await setup('rules_booklet');

        renderWithI18n(<ElementPanel {...props} title="Boekje" />);

        expect(screen.queryByText(/editor\.kind_/)).not.toBeInTheDocument();
        expect(screen.getByText('Spelregelboekje')).toBeInTheDocument();
        expect(
            screen.getByText('De foto komt op de voorkant van het boekje.'),
        ).toBeInTheDocument();
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
                name: 'Verhaal terug naar standaard',
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

    it('lists what friends sent for this element and applies it (B128)', async () => {
        const user = userEvent.setup();
        const decide = vi.fn(() => Promise.resolve());
        const { props } = await setup('space.01');
        const contribution = {
            id: 'c1',
            elementKey: 'space.01',
            firstName: 'Joost',
            field: 'name' as const,
            value: 'Jumbostraat',
            hasPhoto: false,
            width: null,
            height: null,
            photoUrl: null,
            createdAt: 1,
        };

        renderWithI18n(
            <ElementPanel
                {...props}
                friends={{
                    contributions: [
                        contribution,
                        { ...contribution, id: 'c2', elementKey: 'space.03' },
                    ],
                    decision: {
                        decide,
                        working: null,
                        note: null,
                        problem: null,
                    },
                    secret: null,
                    busy: false,
                }}
            />,
        );

        const section = screen.getByRole('region', { name: /Van vrienden/ });
        expect(within(section).getAllByRole('listitem')).toHaveLength(1);
        expect(section).toHaveTextContent('Joost: “Jumbostraat”');
        await user.click(
            within(section).getByRole('button', { name: 'Toepassen' }),
        );

        expect(decide).toHaveBeenCalledWith(contribution, 'accept');
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
            screen.getByText(`standaard € ${String(amount)}, 40 tot 60`),
        ).toBeInTheDocument();
        await user.click(
            screen.getByRole('button', {
                name: 'Betalen terug naar standaard',
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
                name: 'Verhaal terug naar standaard',
            }),
        );
        expect(session.edition.elements['card.chest.03']).toEqual(card);
    });
});
