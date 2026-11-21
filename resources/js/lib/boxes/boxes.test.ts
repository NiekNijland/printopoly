import { resolveEdition } from '@/lib/edition/resolve';
import { sampleEdition } from '@/testing/editions';

import { BoxApiError, createBox, fetchBox, sendContribution } from './api';
import { firstStreetKey, groupOf, targetLabel } from './labels';
import {
    addSent,
    forgetOwnerRecord,
    readFirstName,
    readOwnerRecord,
    readSent,
    writeFirstName,
    writeOwnerRecord,
} from './local';
import {
    buildSnapshot,
    editionFromSnapshot,
    shareImageEdition,
} from './snapshot';

describe('buildSnapshot', () => {
    it('keeps names, card texts and towns, and nothing else', () => {
        const edition = sampleEdition();
        edition.elements = {
            'space.01': {
                name: 'Molenweg',
                photo: {
                    photoId: 'p1',
                    cx: 0.5,
                    cy: 0.5,
                    scale: 1,
                    rotation: 0,
                    grayscale: false,
                },
            },
            'space.02': { name: '  ' },
            'card.chance.01': { text: 'Ga naar start', amount: 5 },
            'group.brown': { town: 'Raalte' },
            box_lid: { name: 'Deksel' },
            bank: { name: 'Bank' },
        };

        expect(buildSnapshot(edition).elements).toEqual({
            'space.01': { name: 'Molenweg' },
            'card.chance.01': { text: 'Ga naar start' },
            'group.brown': { town: 'Raalte' },
        });
    });

    it('keeps renamed decks, so friends see their names (UX 4, ronde 3)', () => {
        const edition = sampleEdition();
        edition.elements = {
            'words.chance': { name: 'Loterij' },
            'words.bank': { name: 'Bank van de club' },
        };
        const snapshot = buildSnapshot(edition);

        expect(snapshot.elements).toEqual({
            'words.chance': { name: 'Loterij' },
        });
        expect(
            editionFromSnapshot(snapshot, { name: 'Club', language: 'nl' })
                .elements['words.chance'],
        ).toEqual({ name: 'Loterij' });
    });

    it('keeps the words a card text holds, so a friend reads "bushalte" (B177)', () => {
        const edition = sampleEdition();
        edition.elements = {
            'words.station': { name: 'Bushalte', text: 'Bushaltes' },
            'words.jail': { name: 'de strafbank' },
            'card.chance.07': {
                text: 'Ga naar het dichtstbijzijnde {station}. Of naar {jail}.',
            },
        };
        const snapshot = buildSnapshot(edition);

        expect(snapshot.elements['words.station']).toEqual({
            name: 'Bushalte',
            text: 'Bushaltes',
        });
        const card = resolveEdition(
            editionFromSnapshot(snapshot, { name: 'Club', language: 'nl' }),
        ).decks?.chance[6];
        expect(card?.text).toBe(
            'Ga naar het dichtstbijzijnde Bushalte. Of naar de strafbank.',
        );
    });

    it('keeps the extra cards the edition added, with or without a text (B135)', () => {
        const edition = sampleEdition();
        edition.elements = {
            'card.chance.17': { added: true, text: 'Je wint de pubquiz.' },
            'card.chest.18': { added: true, amount: 25 },
            'card.chest.19': { text: 'niet toegevoegd' },
        };

        const snapshot = buildSnapshot(edition);

        expect(snapshot.elements).toEqual({
            'card.chance.17': { added: true, text: 'Je wint de pubquiz.' },
            'card.chest.18': { added: true },
        });
        expect(
            editionFromSnapshot(snapshot, { name: 'Club', language: 'nl' })
                .elements['card.chest.18']?.added,
        ).toBe(true);
    });

    it('turns a snapshot back into an edition with the names on it', () => {
        const snapshot = buildSnapshot(sampleEdition());
        snapshot.elements['space.01'] = { name: 'Molenweg' };

        const edition = editionFromSnapshot(snapshot, {
            name: 'Club',
            language: 'nl',
        });

        expect(edition.elements['space.01']?.name).toBe('Molenweg');
        expect(edition.name).toBe('Club');
    });

    it('sends only names to the picture for the group app', () => {
        const edition = sampleEdition();
        edition.elements = {
            'space.01': { name: 'Molenweg' },
            'card.chance.01': { text: 'Geheim' },
        };

        expect(JSON.stringify(shareImageEdition(edition))).not.toContain(
            'Geheim',
        );
    });
});

describe('labels', () => {
    it('knows colour groups and their first street', () => {
        expect(groupOf('group.brown')?.id).toBe('brown');
        expect(groupOf('space.01')).toBeUndefined();
        expect(firstStreetKey('group.brown')).toMatch(/^space\.\d{2}$/);
    });

    it('names a group through the given words', () => {
        expect(
            targetLabel(
                'group.brown',
                sampleEdition(),
                'nl',
                (g) => `Plaats ${g}`,
            ),
        ).toMatch(/^Plaats /);
    });
});

describe('local store', () => {
    beforeEach(() => window.localStorage.clear());

    it('keeps and forgets the owner secret per edition', () => {
        expect(readOwnerRecord('e1')).toBeNull();
        writeOwnerRecord('e1', { id: 'b1', secret: 's' });
        expect(readOwnerRecord('e1')).toEqual({ id: 'b1', secret: 's' });
        expect(readOwnerRecord('e2')).toBeNull();
        forgetOwnerRecord('e1');
        expect(readOwnerRecord('e1')).toBeNull();
    });

    it('keeps the first name and what was sent per link', () => {
        writeFirstName('Sanne');
        addSent('t1', {
            receipt: 'r1',
            elementKey: 'space.01',
            label: 'A',
            value: 'x',
            hasPhoto: false,
            sentAt: 1,
        });

        expect(readFirstName()).toBe('Sanne');
        expect(readSent('t1')).toHaveLength(1);
        expect(readSent('t2')).toEqual([]);
    });

    it('survives broken storage', () => {
        window.localStorage.setItem('printopoly.boxes.owner', '{nope');

        expect(readOwnerRecord('e1')).toBeNull();
    });
});

describe('api', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('sends the owner secret in the header and CSRF with a post', async () => {
        const fetchMock = vi.fn(() =>
            Promise.resolve(
                new Response(JSON.stringify({ id: 'b1' }), { status: 200 }),
            ),
        );
        vi.stubGlobal('fetch', fetchMock);

        await fetchBox('b1', 'secret');

        const [, init] = fetchMock.mock.calls[0] as unknown as [
            string,
            RequestInit,
        ];
        expect((init.headers as Record<string, string>)['X-Box-Owner']).toBe(
            'secret',
        );
    });

    it('turns a validation answer into an error with its first message', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() =>
                Promise.resolve(
                    new Response(
                        JSON.stringify({
                            errors: { value: ['Links kunnen hier niet.'] },
                        }),
                        { status: 422 },
                    ),
                ),
            ),
        );

        await expect(
            createBox({
                editionId: 'edition-1',
                editionName: 'x',
                language: 'nl',
                snapshot: buildSnapshot(sampleEdition()),
            }),
        ).rejects.toMatchObject({
            status: 422,
            message: 'Links kunnen hier niet.',
        });
        expect(BoxApiError).toBeDefined();
    });

    it('sends a contribution as a form with an empty honeypot', async () => {
        const fetchMock = vi.fn(() =>
            Promise.resolve(
                new Response(JSON.stringify({ id: 'c', receipt: 'r' }), {
                    status: 201,
                }),
            ),
        );
        vi.stubGlobal('fetch', fetchMock);

        await sendContribution('tok', {
            elementKey: 'space.01',
            firstName: 'Sanne',
            value: 'Kerkstraat',
            photo: new Blob(['x']),
        });

        const [url, init] = fetchMock.mock.calls[0] as unknown as [
            string,
            RequestInit,
        ];
        const body = init.body as FormData;
        expect(url).toBe('/api/box/tok/contributions');
        expect(body.get('website')).toBe('');
        expect(body.get('firstName')).toBe('Sanne');
        expect(body.get('photo')).toBeInstanceOf(Blob);
    });
});
