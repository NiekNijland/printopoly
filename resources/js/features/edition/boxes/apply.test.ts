import { EditionSession } from '@/features/edition/session';
import type { Edition, PhotoRecord } from '@/lib/render/edition-types';
import {
    makeBus,
    makeEdition,
    ManualScheduler,
} from '@/testing/edition-test-utils';
import { installMemoryServices } from '@/testing/editions';
import { pngHeader } from '@/testing/photos-test-fixtures';

import { ApplyError, applyContribution, type ApplyDeps } from './apply';
import type { BoxContributionData } from './types';

const contribution = (
    overrides: Partial<BoxContributionData> = {},
): BoxContributionData => ({
    id: 'c1',
    elementKey: 'space.01',
    firstName: 'Sanne',
    field: 'name',
    value: 'Molenweg',
    amount: null,
    open: ['name'],
    hasPhoto: false,
    width: null,
    height: null,
    photoUrl: null,
    createdAt: 1,
    ...overrides,
});

const withPhoto = (
    overrides: Partial<BoxContributionData> = {},
): BoxContributionData =>
    contribution({
        open: ['name', 'photo'],
        hasPhoto: true,
        width: 800,
        height: 600,
        photoUrl: '/photo/c1',
        ...overrides,
    });

const stubImages = (): void => {
    vi.stubGlobal(
        'createImageBitmap',
        vi.fn(() =>
            Promise.resolve({
                width: 800,
                height: 600,
                close: () => undefined,
            }),
        ),
    );
    vi.stubGlobal(
        'OffscreenCanvas',
        class {
            getContext() {
                return { drawImage: () => undefined };
            }
            convertToBlob() {
                return Promise.resolve(new Blob(['webp']));
            }
        },
    );
};

const setUp = (
    edition: Edition = makeEdition(),
    overrides: Partial<ApplyDeps> = {},
) => {
    const services = installMemoryServices();
    const session = new EditionSession(edition, {
        storage: services.storage,
        bus: makeBus(null, 'w1'),
        now: () => 1_000,
        scheduler: new ManualScheduler(),
    });
    const onPhoto = vi.fn<(record: PhotoRecord) => void>();
    const deps: ApplyDeps = {
        session,
        repository: services.repository,
        fetchPhoto: () =>
            Promise.resolve(new Blob([new Uint8Array(pngHeader(800, 600))])),
        onPhoto,
        locale: 'nl',
        storageFullMessage: 'Vol.',
        failedMessage: 'Mislukt.',
        deckFullMessage: 'Stapel vol.',
        ...overrides,
    };

    return { session, deps, onPhoto, storage: services.storage };
};

const fullChanceDeck = (): Edition => {
    const edition = makeEdition();
    for (let number = 17; number <= 32; number++) {
        edition.elements[`card.chance.${String(number)}`] = { added: true };
    }

    return edition;
};

describe('applyContribution', () => {
    it('puts the suggested name on the element', async () => {
        const { session, deps } = setUp();

        expect(await applyContribution(contribution(), deps)).toBe('space.01');
        expect(session.edition.elements['space.01']).toEqual({
            name: 'Molenweg',
        });
    });

    it('stores the photo like one of the owner and places it on the element', async () => {
        stubImages();
        const { session, deps, onPhoto } = setUp();

        await applyContribution(withPhoto(), deps);

        const record = onPhoto.mock.calls[0]?.[0];
        expect(record?.fileName).toBe('Sanne.jpg');
        expect(session.edition.elements['space.01']).toMatchObject({
            name: 'Molenweg',
            photo: { photoId: record?.id },
        });
    });

    it('applies only the chosen parts', async () => {
        const fetchPhoto = vi.fn<ApplyDeps['fetchPhoto']>();
        const { session, deps } = setUp(makeEdition(), { fetchPhoto });

        await applyContribution(withPhoto(), deps, ['name']);

        expect(fetchPhoto).not.toHaveBeenCalled();
        expect(session.edition.elements['space.01']).toEqual({
            name: 'Molenweg',
        });
    });

    it('changes nothing when the chosen parts hold nothing', async () => {
        const { session, deps } = setUp();

        expect(await applyContribution(contribution({ value: '' }), deps)).toBe(
            'space.01',
        );
        await applyContribution(contribution({ value: null }), deps);
        await applyContribution(contribution(), deps, ['amount']);

        expect(session.canUndo).toBe(false);
    });

    it('puts a new card at the end of its deck as an extra card, whole', async () => {
        const { session, deps } = setUp();

        const key = await applyContribution(
            contribution({
                elementKey: 'newcard.chance',
                field: 'text',
                value: 'Je wint de pubquiz.',
                amount: 25,
                open: ['text', 'amount'],
            }),
            deps,
            ['text'],
        );

        expect(key).toBe('card.chance.17');
        expect(session.edition.elements[key]).toEqual({
            added: true,
            text: 'Je wint de pubquiz.',
            amount: 25,
        });
    });

    it('brings back an extra card the owner took out', async () => {
        const edition = makeEdition();
        edition.elements['card.chest.17'] = { text: 'Oud' };
        const { session, deps } = setUp(edition);

        await applyContribution(
            contribution({
                elementKey: 'card.chest.17',
                field: 'text',
                value: 'Nieuw',
                open: ['text'],
            }),
            deps,
        );

        expect(session.edition.elements['card.chest.17']).toEqual({
            text: 'Nieuw',
            added: true,
        });
    });

    it('refuses a new card for a full deck', async () => {
        const newCard = contribution({ elementKey: 'newcard.chance' });

        await expect(
            applyContribution(newCard, setUp(fullChanceDeck()).deps),
        ).rejects.toThrow(new ApplyError('Stapel vol.'));
        await expect(
            applyContribution(
                newCard,
                setUp(fullChanceDeck(), { deckFullMessage: undefined }).deps,
            ),
        ).rejects.toThrow('Mislukt.');
    });

    it('stops with the failure text when the photo cannot be fetched', async () => {
        const { session, deps } = setUp(makeEdition(), {
            fetchPhoto: () => Promise.reject(new Error('403')),
        });

        await expect(applyContribution(withPhoto(), deps)).rejects.toThrow(
            new ApplyError('Mislukt.'),
        );
        expect(session.edition.elements['space.01']).toBeUndefined();
    });

    it('says why the photo cannot be used, in the language of the owner', async () => {
        const { deps } = setUp(makeEdition(), {
            fetchPhoto: () => Promise.resolve(new Blob(['nope'])),
            locale: 'en',
        });

        await expect(applyContribution(withPhoto(), deps)).rejects.toThrow(
            "Sanne.jpg can't be used: choose a JPEG, PNG, WebP or HEIC.",
        );
    });

    it('says the storage is full when the photo does not fit', async () => {
        stubImages();
        const { deps, storage } = setUp();
        const full = new Error('full');
        full.name = 'QuotaExceededError';
        vi.spyOn(storage, 'putPhoto').mockRejectedValue(full);

        await expect(applyContribution(withPhoto(), deps)).rejects.toThrow(
            'Vol.',
        );
    });
});
