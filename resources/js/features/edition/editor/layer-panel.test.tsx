import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { EditionBus } from '@/features/edition/bus';
import { EditionSession } from '@/features/edition/session';
import { useSessionSnapshot } from '@/features/edition/use-edition-session';
import { MemoryEditionStorage } from '@/lib/render/edition-storage';
import type { FreeLayer } from '@/lib/render/edition-types';
import { PhotoCache } from '@/lib/render/editor-photo-cache';
import { photo } from '@/testing/edition-test-utils';
import { installMemoryServices, sampleEdition } from '@/testing/editions';
import { fakeIngest } from '@/testing/ingest';
import { renderWithI18n } from '@/testing/render';

import { LayerPanel } from './layer-panel';

const text: FreeLayer = {
    id: 'layer-1',
    kind: 'text',
    text: 'Hoi',
    x: 10,
    y: 10,
    w: 60,
    h: 12,
};
const picture: FreeLayer = {
    id: 'layer-2',
    kind: 'photo',
    photo: photo('p9'),
    x: 10,
    y: 40,
    w: 40,
    h: 30,
};

const Harness = ({
    session,
    start,
    onTitle,
}: {
    session: EditionSession;
    start: string | null;
    onTitle?: () => void;
}) => {
    const { edition } = useSessionSnapshot(session);
    const [selected, setSelected] = useState(start);

    return (
        <LayerPanel
            session={session}
            edition={edition}
            editKey="box_lid"
            area={{ w: 200, h: 200 }}
            layers={edition.elements.box_lid?.layers ?? []}
            selectedId={selected}
            onSelect={setSelected}
            cache={new PhotoCache(() => Promise.resolve(undefined))}
            title={onTitle === undefined ? undefined : 'Zaterdagclub'}
            tag="niet op de vouwlijnen"
            onTitle={onTitle}
        />
    );
};

const setup = async (
    layers: FreeLayer[] = [text, picture],
    start: string | null = null,
    onTitle?: () => void,
) => {
    installMemoryServices();
    const storage = new MemoryEditionStorage();
    const base = sampleEdition({ parts: { boxLid: true } });
    const edition = { ...base, elements: { box_lid: { layers } } };
    await storage.createEdition(edition);
    const session = new EditionSession(edition, {
        storage,
        bus: new EditionBus(null, 'w'),
        now: () => 5,
        debounceMs: 1000,
    });
    renderWithI18n(
        <Harness session={session} start={start} onTitle={onTitle} />,
    );
    const layersOf = () => session.edition.elements.box_lid?.layers ?? [];

    return { session, layersOf };
};

describe('LayerPanel', () => {
    it('lists the layers top first, then the title and the background', async () => {
        const onTitle = vi.fn();
        await setup([text, picture], null, onTitle);
        const rows = screen.getAllByRole('listitem');

        expect(rows.map((row) => row.textContent)).toEqual([
            'Foto✕',
            'AaHoi✕',
            'Titel: Zaterdagclub',
            'Achtergrond',
        ]);
        expect(screen.getByText('niet op de vouwlijnen')).toBeInTheDocument();

        await userEvent.click(
            screen.getByRole('button', { name: 'Titel: Zaterdagclub' }),
        );

        expect(onTitle).toHaveBeenCalledTimes(1);
        expect(
            screen.getByRole('button', { name: 'Titel: Zaterdagclub' }),
        ).toHaveAttribute('aria-current', 'true');
    });

    it('adds a text layer and chooses it', async () => {
        const { layersOf } = await setup([]);

        await userEvent.click(
            screen.getByRole('button', { name: 'Tekst toevoegen' }),
        );

        expect(layersOf()).toMatchObject([
            { kind: 'text', text: 'Jouw tekst' },
        ]);
        expect(screen.getByRole('textbox')).toHaveValue('Jouw tekst');
    });

    it('chooses a layer, removes it, and adds a photo layer', async () => {
        const { layersOf } = await setup();
        fakeIngest.ingestPhoto.mockResolvedValueOnce({
            ok: true,
            record: {
                id: 'p5',
                editionId: 'e1',
                width: 400,
                height: 300,
                blob: new Blob(['x']),
                createdAt: 0,
            },
        });

        await userEvent.click(screen.getByRole('button', { name: /Hoi/ }));

        expect(screen.getByRole('textbox')).toHaveValue('Hoi');

        await userEvent.click(
            screen.getAllByRole('button', { name: 'Laag weghalen' })[1] ??
                document.body,
        );

        expect(layersOf()).toEqual([picture]);
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

        await userEvent.upload(
            screen.getByTestId('layer-photo-input'),
            new File(['x'], 'kat.jpg', { type: 'image/jpeg' }),
        );

        expect(layersOf()).toHaveLength(2);
        expect(layersOf()[1]).toMatchObject({ kind: 'photo' });
    });

    it('says why a photo did not fit or could not be read', async () => {
        await setup();
        fakeIngest.ingestPhoto.mockResolvedValueOnce({
            ok: false,
            storageFull: true,
            fileName: 'kat.jpg',
        });

        await userEvent.upload(
            screen.getByTestId('layer-photo-input'),
            new File(['x'], 'kat.jpg', { type: 'image/jpeg' }),
        );

        expect(screen.getByRole('alert')).toHaveTextContent(
            'kat.jpg past niet meer in de opslag',
        );

        fakeIngest.ingestPhoto.mockResolvedValueOnce({
            ok: false,
            error: {
                code: 'unsupported-type',
                fileName: 'hond.jpg',
                rest: { nl: 'is geen foto.', en: 'is no photo.' },
            },
        });
        await userEvent.upload(
            screen.getByTestId('layer-photo-input'),
            new File(['x'], 'hond.jpg', { type: 'image/jpeg' }),
        );

        expect(screen.getByRole('alert')).toHaveTextContent(
            'hond.jpg is geen foto.',
        );
    });
});
