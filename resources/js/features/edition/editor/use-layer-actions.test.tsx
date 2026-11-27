import { act, renderHook } from '@testing-library/react';
import { LaravelReactI18nProvider } from 'laravel-react-internationalization';
import type { ChangeEvent, ReactNode } from 'react';

import { EditionBus } from '@/features/edition/bus';
import { EditionSession } from '@/features/edition/session';
import { MemoryEditionStorage } from '@/lib/render/edition-storage';
import type { FreeLayer } from '@/lib/render/edition-types';
import { PhotoCache } from '@/lib/render/editor-photo-cache';
import { installMemoryServices, sampleEdition } from '@/testing/editions';
import { setPage } from '@/testing/inertia';
import { fakePage } from '@/testing/page-props';

import nl from '../../../../../lang/nl.json';

import { useLayerActions } from './use-layer-actions';

const ingest = vi.hoisted(() => vi.fn());
vi.mock('@/features/edition/editor/ingest', () => ({ ingestPhoto: ingest }));

const Dutch = ({ children }: { children: ReactNode }) => (
    <LaravelReactI18nProvider
        locale="nl"
        fallbackLocale="nl"
        files={{ '/lang/nl.json': nl }}
    >
        {children}
    </LaravelReactI18nProvider>
);

const text: FreeLayer = {
    id: 'layer-1',
    kind: 'text',
    text: 'Hoi',
    x: 10,
    y: 10,
    w: 60,
    h: 12,
};

const fileEvent = (files: File[]): ChangeEvent<HTMLInputElement> => {
    const input = document.createElement('input');
    input.type = 'file';
    Object.defineProperty(input, 'files', { value: files });

    return {
        target: input,
        currentTarget: input,
        nativeEvent: new Event('change'),
        bubbles: true,
        cancelable: false,
        defaultPrevented: false,
        eventPhase: 0,
        isTrusted: true,
        preventDefault: () => undefined,
        isDefaultPrevented: () => false,
        stopPropagation: () => undefined,
        isPropagationStopped: () => false,
        persist: () => undefined,
        timeStamp: 0,
        type: 'change',
    };
};

const setup = async (editKey: string, layers: FreeLayer[] = []) => {
    setPage(fakePage());
    installMemoryServices();
    const storage = new MemoryEditionStorage();
    const base = sampleEdition({ parts: { boxLid: true } });
    const edition = { ...base, elements: { [editKey]: { layers } } };
    await storage.createEdition(edition);
    const session = new EditionSession(edition, {
        storage,
        bus: new EditionBus(null, 'w'),
        now: () => 5,
        debounceMs: 1000,
    });
    const onSelect = vi.fn();
    const cache = new PhotoCache(() => Promise.resolve(undefined));
    const { result } = renderHook(
        () =>
            useLayerActions({
                session,
                edition: session.edition,
                editKey,
                area: { w: 200, h: 200 },
                layers: session.edition.elements[editKey]?.layers ?? [],
                onSelect,
                cache,
            }),
        { wrapper: Dutch },
    );

    return {
        result,
        onSelect,
        layersOf: () => session.edition.elements[editKey]?.layers ?? [],
    };
};

describe('useLayerActions', () => {
    it('adds a text layer on the board centre clear of the title, and chooses it', async () => {
        const { result, onSelect, layersOf } = await setup('board_center');

        act(() => result.current.addText());

        expect(layersOf()).toMatchObject([{ kind: 'text' }]);
        expect(onSelect).toHaveBeenCalledWith(layersOf()[0]?.id);
    });

    it('changes and removes a layer', async () => {
        const { result, onSelect, layersOf } = await setup('box_lid', [text]);

        act(() =>
            result.current.change({ ...text, text: 'Hallo' }, 'layer-text:1'),
        );

        expect(layersOf()).toEqual([{ ...text, text: 'Hallo' }]);

        act(() => result.current.remove('layer-1'));

        expect(layersOf()).toEqual([]);
        expect(onSelect).toHaveBeenCalledWith(null);
    });

    it('adds a photo layer, and says when a photo did not fit', async () => {
        const { result, layersOf } = await setup('box_lid');
        ingest.mockResolvedValueOnce({
            ok: true,
            record: { id: 'p5', width: 400, height: 300, blob: new Blob() },
        });

        await act(() =>
            result.current.onFile(
                fileEvent([new File(['x'], 'kat.jpg', { type: 'image/jpeg' })]),
            ),
        );

        expect(layersOf()).toMatchObject([{ kind: 'photo' }]);

        ingest.mockResolvedValueOnce({
            ok: false,
            storageFull: true,
            fileName: 'kat.jpg',
        });
        await act(() =>
            result.current.onFile(
                fileEvent([new File(['x'], 'kat.jpg', { type: 'image/jpeg' })]),
            ),
        );

        expect(result.current.problem).toMatch(/^kat\.jpg past niet meer/);

        await act(() => result.current.onFile(fileEvent([])));

        expect(result.current.problem).toMatch(/^kat\.jpg/);
    });
});
