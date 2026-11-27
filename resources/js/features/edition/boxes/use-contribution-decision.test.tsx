import { act, renderHook } from '@testing-library/react';
import { LaravelReactI18nProvider } from 'laravel-react-internationalization';
import type { ReactNode } from 'react';

import { EditionSession } from '@/features/edition/session';
import type { Edition, PhotoRecord } from '@/lib/render/edition-types';
import {
    makeBus,
    makeEdition,
    ManualScheduler,
} from '@/testing/edition-test-utils';
import { installMemoryServices } from '@/testing/editions';
import { requestOf, stubFetch } from '@/testing/fetch';

import nl from '../../../../../lang/nl.json';

import type { BoxContributionData } from './types';
import type { CollectionBox } from './use-collection-box';
import { useContributionDecision } from './use-contribution-decision';

const Dutch = ({ children }: { children: ReactNode }) => (
    <LaravelReactI18nProvider
        locale="nl"
        fallbackLocale="nl"
        files={{ '/lang/nl.json': nl }}
    >
        {children}
    </LaravelReactI18nProvider>
);

const contribution = (
    overrides: Partial<BoxContributionData> = {},
): BoxContributionData => ({
    id: 'c1',
    elementKey: 'space.01',
    firstName: 'Sanne',
    field: 'name',
    value: 'Beukenlaan',
    amount: null,
    open: ['name'],
    hasPhoto: false,
    width: null,
    height: null,
    photoUrl: null,
    createdAt: 1,
    ...overrides,
});

type Resolve = CollectionBox['resolve'];

const collectBox = (resolve: Resolve): CollectionBox => ({
    box: null,
    loaded: true,
    busy: false,
    error: false,
    errorReason: null,
    secret: 'owner',
    start: () => Promise.resolve(),
    refresh: () => Promise.resolve(),
    close: () => Promise.resolve(),
    renew: () => Promise.resolve(),
    remove: () => Promise.resolve(),
    hideCards: () => Promise.resolve(),
    resolve,
});

const mount = (
    resolve = vi.fn<Resolve>(() => Promise.resolve()),
    edition: Edition = makeEdition(),
) => {
    const services = installMemoryServices();
    const session = new EditionSession(edition, {
        storage: services.storage,
        bus: makeBus(null, 'w1'),
        now: () => 1_000,
        scheduler: new ManualScheduler(),
    });
    const onPhoto = vi.fn<(record: PhotoRecord) => void>();
    const hook = renderHook(
        () =>
            useContributionDecision({
                collect: collectBox(resolve),
                session,
                repository: services.repository,
                locale: 'nl',
                onPhoto,
            }),
        { wrapper: Dutch },
    );

    return { hook, session, resolve };
};

describe('useContributionDecision', () => {
    it('applies a proposal to the edition, tells the server and says where it went', async () => {
        const { hook, session, resolve } = mount();

        await act(() =>
            hook.result.current.decide(contribution(), 'accept', ['name']),
        );

        expect(session.edition.elements['space.01']?.name).toBe('Beukenlaan');
        expect(resolve).toHaveBeenCalledExactlyOnceWith('c1', 'accept', [
            'name',
        ]);
        expect(hook.result.current.note).toEqual({
            element: 'space.01',
            text: 'Toegepast op Beukenlaan.',
        });
        expect(hook.result.current.problem).toBeNull();
        expect(hook.result.current.working).toBeNull();
    });

    it('names a colour group by its town and shows the line at its first street', async () => {
        const { hook } = mount();

        await act(() =>
            hook.result.current.decide(
                contribution({
                    elementKey: 'group.brown',
                    field: 'town',
                    value: 'Raalte',
                    open: ['town'],
                }),
                'accept',
            ),
        );

        expect(hook.result.current.note?.element).toBe('space.01');
        expect(hook.result.current.note?.text).toMatch(
            /^Toegepast op Plaatsnaam voor /,
        );
    });

    it('marks what is being handled while the server answers', async () => {
        let finish: () => void = () => undefined;
        const { hook } = mount(
            vi.fn<Resolve>(
                () =>
                    new Promise<void>((resolve) => {
                        finish = resolve;
                    }),
            ),
        );
        let done: Promise<void> = Promise.resolve();

        act(() => {
            done = hook.result.current.decide(contribution(), 'reject', [
                'photo',
            ]);
        });
        expect(hook.result.current.working).toBe('c1:photo');

        await act(async () => {
            finish();
            await done;
        });
        expect(hook.result.current.working).toBeNull();
        expect(hook.result.current.note).toBeNull();

        act(() => {
            done = hook.result.current.decide(contribution(), 'reject');
        });
        expect(hook.result.current.working).toBe('c1');
        await act(async () => {
            finish();
            await done;
        });
    });

    it('says why a proposal could not be applied and tells the server nothing', async () => {
        const edition = makeEdition();
        for (let number = 17; number <= 32; number++) {
            edition.elements[`card.chance.${String(number)}`] = { added: true };
        }
        const { hook, resolve } = mount(undefined, edition);

        await act(() =>
            hook.result.current.decide(
                contribution({
                    elementKey: 'newcard.chance',
                    field: 'text',
                    value: 'Je wint',
                    open: ['text'],
                }),
                'accept',
            ),
        );

        expect(hook.result.current.problem).toEqual({
            element: 'newcard.chance',
            text: 'Deze stapel heeft al 32 kaarten. Haal eerst een extra kaart weg.',
        });
        expect(hook.result.current.note).toBeNull();
        expect(resolve).not.toHaveBeenCalled();
    });

    it('fetches the photo of a proposal with the owner secret', async () => {
        const fake = stubFetch(() => new Response('nope', { status: 403 }));
        const { hook } = mount();

        await act(() =>
            hook.result.current.decide(
                contribution({
                    open: ['photo'],
                    hasPhoto: true,
                    photoUrl: '/photo/c1',
                }),
                'accept',
            ),
        );

        const { url, init } = requestOf(fake);
        expect(hook.result.current.problem?.text).toBe(
            'Toepassen lukte niet. Probeer het nog eens.',
        );
        expect(url).toBe('/photo/c1');
        expect(new Headers(init.headers).get('X-Box-Owner')).toBe('owner');
    });

    it('says when the server could not take an accept or a reject', async () => {
        const { hook } = mount(
            vi.fn<Resolve>(() => Promise.reject(new Error('offline'))),
        );

        await act(() => hook.result.current.decide(contribution(), 'reject'));
        expect(hook.result.current.problem?.text).toBe(
            'Weigeren lukte niet. Probeer het nog eens.',
        );

        await act(() => hook.result.current.decide(contribution(), 'accept'));
        expect(hook.result.current.problem?.text).toBe(
            'Toepassen lukte niet. Probeer het nog eens.',
        );
        expect(hook.result.current.note?.text).toBe('Toegepast op Beukenlaan.');
    });

    it('clears the line when the owner moves on', async () => {
        const { hook } = mount();
        await act(() => hook.result.current.decide(contribution(), 'accept'));

        act(() => hook.result.current.clear());

        expect(hook.result.current.note).toBeNull();
        expect(hook.result.current.problem).toBeNull();
    });
});
