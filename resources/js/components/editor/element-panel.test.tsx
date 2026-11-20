import type * as InertiaReact from '@inertiajs/react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { CheckIssue } from '@/lib/checks/types';
import { EditionBus } from '@/lib/edition/bus';
import { resolveEdition } from '@/lib/edition/resolve';
import { EditionSession } from '@/lib/edition/session';
import { MemoryEditionStorage } from '@/lib/edition/storage';
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

async function setup(
    key: string,
    options: {
        withPhoto?: boolean;
        named?: boolean;
        issues?: CheckIssue[];
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
        subtitle: 'Vak',
        context: options.withPhoto ? context : null,
        onAct,
        layout: 'frame',
        cache: new PhotoCache(() => Promise.resolve(undefined)),
        issues: options.issues ?? [],
        siblings: ['space.03'],
        position: 1,
    };

    return { session, onAct, props };
}

describe('ElementPanel', () => {
    beforeEach(() => ingest.mockReset());

    it('shows the fields of a space: layout, name, photo, fixed price and group', async () => {
        const { props } = await setup('space.01');

        renderWithI18n(<ElementPanel {...props} />);

        expect(screen.getAllByRole('radio').map((r) => r.textContent)).toEqual([
            'Foto in kader',
            'Hele vak',
            'Alleen tekst',
        ]);
        expect(screen.getByLabelText('Naam')).toHaveValue('Molenweg');
        expect(screen.getByText(/€\s?60/)).toBeInTheDocument();
        expect(screen.getByText('vast', { exact: false })).toBeInTheDocument();
        expect(screen.getByText('Bruin')).toBeInTheDocument();
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
        await user.click(
            screen.getByRole('button', { name: 'Terug naar standaard' }),
        );

        expect(session.edition.elements['space.01']).toBeUndefined();
    });

    it('switches layout', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('space.01');

        renderWithI18n(<ElementPanel {...props} />);
        await user.click(screen.getByRole('radio', { name: 'Hele vak' }));

        expect(session.edition.elements['space.01']?.layout).toBe('full');
    });

    it('writes a card amount, signed, and clears it when emptied (B32)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('card.chance.01');

        renderWithI18n(<ElementPanel {...props} />);
        const field = screen.getByLabelText('Bedrag op de kaart', {
            exact: false,
        });
        await user.type(field, '-50');
        expect(session.edition.elements['card.chance.01']?.amount).toBe(-50);
        await user.clear(field);
        expect(
            session.edition.elements['card.chance.01']?.amount,
        ).toBeUndefined();
        expect(screen.getByText('Standaardkaart')).toBeInTheDocument();
    });

    it('sets the colour of a note and one bank name for every note (B85, B101)', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('note.100');

        renderWithI18n(<ElementPanel {...props} />);
        fireEvent.change(screen.getByLabelText('Kleur'), {
            target: { value: '#aabbcc' },
        });
        expect(session.edition.elements['note.100']?.color).toBe('#aabbcc');
        await user.type(
            screen.getByLabelText('Naam van de bank', { exact: false }),
            'De club',
        );
        expect(session.edition.elements['bank']?.name).toBe('De club');
        expect(
            screen.getAllByText('vast', { exact: false }).length,
        ).toBeGreaterThan(0);
    });

    it('takes a pawn out of the set and tells the editor', async () => {
        const user = userEvent.setup();
        const onRemovePawn = vi.fn();
        const { props, session } = await setup('pawn.03');

        renderWithI18n(<ElementPanel {...props} onRemovePawn={onRemovePawn} />);
        await user.click(
            screen.getByRole('button', { name: 'Pion verwijderen' }),
        );

        expect(session.edition.elements['pawn.03']?.hidden).toBe(true);
        expect(onRemovePawn).toHaveBeenCalled();
    });

    it('edits the house rules as text', async () => {
        const user = userEvent.setup();
        const { props, session } = await setup('house_rules');

        renderWithI18n(<ElementPanel {...props} />);
        await user.type(
            screen.getByLabelText('Huisregels', { exact: false }),
            'Geen handel',
        );

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
        await user.click(
            screen.getByRole('button', { name: 'Tekst toevoegen' }),
        );

        const layers = session.edition.elements['board_center']?.layers ?? [];
        expect(layers).toHaveLength(1);
        expect(layers[0]).toMatchObject({ kind: 'text', id: 'layer-1' });
        expect(onSelectLayer).toHaveBeenCalledWith('layer-1');
    });

    it('offers only the layouts the theme has (Riso has no whole-space layout)', async () => {
        const { props } = await setup('space.01');
        const riso = { ...props.edition, theme: 'riso' as const };

        renderWithI18n(
            <ElementPanel
                {...props}
                edition={riso}
                resolved={resolveEdition(riso)}
            />,
        );

        expect(
            screen.queryByRole('radio', { name: 'Hele vak' }),
        ).not.toBeInTheDocument();
    });

    it('disables the photo controls until there is a photo and a frame', async () => {
        const { props } = await setup('space.01');

        renderWithI18n(<ElementPanel {...props} />);

        expect(screen.getByRole('slider')).toBeDisabled();
        expect(
            screen.getByRole('button', { name: 'Kwartslag draaien' }),
        ).toBeDisabled();
        expect(
            screen.getByRole('button', { name: 'Foto weghalen' }),
        ).toBeDisabled();
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
        await user.click(screen.getByRole('button', { name: 'Foto weghalen' }));

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

    it('puts a chosen photo in the element and switches a text-only layout to a frame', async () => {
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
            layout: 'frame',
            photo: { cx: 0.5, cy: 0.5, scale: 1 },
        });
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
});
