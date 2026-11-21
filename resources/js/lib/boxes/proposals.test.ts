import { EditionBus } from '@/lib/edition/bus';
import type { EditionRepository } from '@/lib/edition/repository';
import { EditionSession } from '@/lib/edition/session';
import type { Edition } from '@/lib/edition/types';
import { installMemoryServices, sampleEdition } from '@/testing/editions';

import { makeShareImage } from './api';
import { ApplyError, applyContribution } from './apply';
import { nextContributionElement, proposalGroups } from './proposals';
import type { BoxContributionData } from './types';

function proposal(
    id: string,
    elementKey: string,
    overrides: Partial<BoxContributionData> = {},
): BoxContributionData {
    return {
        id,
        elementKey,
        firstName: id,
        field: 'name',
        value: 'Voorstel',
        amount: null,
        open: ['name'],
        hasPhoto: false,
        width: null,
        height: null,
        photoUrl: null,
        createdAt: null,
        ...overrides,
    };
}

describe('proposalGroups (B175)', () => {
    it('groups per element and per field, with competing proposals together', () => {
        const groups = proposalGroups([
            proposal('pim', 'space.01', {
                open: ['name', 'photo'],
                hasPhoto: true,
            }),
            proposal('maya', 'space.01'),
            proposal('daan', 'group.brown', {
                field: 'town',
                open: ['town'],
            }),
            proposal('sanne', 'card.chest.02', {
                field: 'text',
                value: null,
                amount: 220,
                open: ['amount'],
            }),
            proposal('noor', 'newcard.chance', {
                field: 'text',
                open: ['text', 'amount'],
                amount: 100,
            }),
        ]);

        expect(groups.map((group) => group.target)).toEqual([
            'space.01',
            'card.chest.02',
            'newcard.chance',
        ]);
        const street = groups[0];
        expect(
            street?.parts.map((part) => [
                part.elementKey,
                part.part,
                part.options.map((option) => option.id),
            ]),
        ).toEqual([
            ['space.01', 'name', ['pim', 'maya']],
            ['group.brown', 'town', ['daan']],
            ['space.01', 'photo', ['pim']],
        ]);
        expect(groups[2]?.newCard?.id).toBe('noor');
    });

    it('leaves out what has nothing open', () => {
        expect(
            proposalGroups([proposal('pim', 'space.01', { open: [] })]),
        ).toEqual([]);
    });
});

describe('nextContributionElement (bug 30)', () => {
    const waiting = [
        proposal('a', 'card.chance.03'),
        proposal('b', 'space.05'),
        proposal('c', 'card.chance.03'),
        proposal('d', 'newcard.chest'),
    ];

    it('goes to the element after the open one, and round to the first', () => {
        expect(nextContributionElement(waiting, 'space.01')).toBe(
            'card.chance.03',
        );
        expect(nextContributionElement(waiting, 'card.chance.03')).toBe(
            'space.05',
        );
        expect(nextContributionElement(waiting, 'space.05')).toBe(
            'card.chance.03',
        );
    });

    it('has no element when only new cards wait', () => {
        expect(
            nextContributionElement([proposal('d', 'newcard.chest')], ''),
        ).toBeUndefined();
    });
});

describe('applyContribution with parts (B175)', () => {
    async function session(elements: Edition['elements'] = {}) {
        const services = installMemoryServices();
        const edition = sampleEdition();
        edition.elements = { ...edition.elements, ...elements };
        await services.storage.createEdition(edition);

        return new EditionSession(edition, {
            storage: services.storage,
            bus: new EditionBus(null, 'w'),
            now: () => Date.now(),
            debounceMs: 5,
        });
    }

    const deps = (current: EditionSession) => ({
        session: current,
        repository: {} as EditionRepository,
        fetchPhoto: () => Promise.reject(new Error('no photo here')),
        locale: 'nl' as const,
        storageFullMessage: 'vol',
        failedMessage: 'mislukt',
        deckFullMessage: 'stapel vol',
    });

    it('applies only the chosen part', async () => {
        const current = await session();
        const card = proposal('pim', 'card.chest.02', {
            field: 'text',
            value: 'De bank vergist zich weer.',
            amount: 220,
            open: ['text', 'amount'],
        });

        await applyContribution(card, deps(current), ['amount']);

        expect(current.edition.elements['card.chest.02']).toEqual({
            amount: 220,
        });
    });

    it('adds a new card as the next extra card of its deck, whole', async () => {
        const current = await session({ 'card.chance.17': { added: true } });
        const card = proposal('noor', 'newcard.chance', {
            field: 'text',
            value: 'Je wint de loterij.',
            amount: 100,
            open: ['text', 'amount'],
        });

        const key = await applyContribution(card, deps(current), ['amount']);

        expect(key).toBe('card.chance.18');
        expect(current.edition.elements['card.chance.18']).toEqual({
            added: true,
            text: 'Je wint de loterij.',
            amount: 100,
        });
    });

    it('stops with a sentence when the deck is full', async () => {
        const full: Edition['elements'] = {};
        for (let number = 17; number <= 32; number++) {
            full[`card.chest.${String(number)}`] = { added: true };
        }
        const current = await session(full);

        await expect(
            applyContribution(
                proposal('noor', 'newcard.chest', { field: 'text' }),
                deps(current),
            ),
        ).rejects.toEqual(new ApplyError('stapel vol'));
    });
});

describe('makeShareImage (B174)', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('asks the server to make the picture, then asks for it until it is there', async () => {
        const png = new Blob(['png'], { type: 'image/png' });
        const answers = [
            new Response(JSON.stringify({ id: 'x'.repeat(40) }), {
                status: 202,
            }),
            new Response(JSON.stringify({ status: 'waiting' }), {
                status: 202,
                headers: { 'Content-Type': 'application/json' },
            }),
            new Response(png, {
                status: 200,
                headers: { 'Content-Type': 'image/png' },
            }),
        ];
        const fetchMock = vi.fn((url: string) => {
            void url;

            return Promise.resolve(answers.shift());
        });
        vi.stubGlobal('fetch', fetchMock);

        const blob = await makeShareImage(
            { name: 'Zaterdagclub' },
            { pollMs: 1 },
        );

        expect(await blob.text()).toBe('png');
        expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
            '/api/share-image',
            `/api/share-image/${'x'.repeat(40)}`,
            `/api/share-image/${'x'.repeat(40)}`,
        ]);
    });

    it('fails with the sentence of the server when the job failed', async () => {
        const answers = [
            new Response(JSON.stringify({ id: 'x'.repeat(40) }), {
                status: 202,
            }),
            new Response(
                JSON.stringify({ status: 'failed', message: 'Lukte niet.' }),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                },
            ),
        ];
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.resolve(answers.shift())),
        );

        await expect(makeShareImage({}, { pollMs: 1 })).rejects.toMatchObject({
            message: 'Lukte niet.',
        });
    });
});
