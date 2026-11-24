import type * as InertiaReact from '@inertiajs/react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { CollectionBox } from '@/hooks/use-collection-box';
import type { BoxContributionData, OwnerBox } from '@/lib/boxes/types';
import { EditionBus } from '@/lib/edition/bus';
import { EditionSession } from '@/lib/edition/session';
import type { Edition } from '@/lib/edition/types';
import { installMemoryServices, sampleEdition } from '@/testing/editions';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

import { EditorWorkspace } from './editor-workspace';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof InertiaReact>()),
    usePage: () => fakePage({ auth: { googleLoginEnabled: true } }),
}));

const contributions: BoxContributionData[] = [];

function contribution(
    id: string,
    elementKey: string,
    firstName: string,
): BoxContributionData {
    return {
        id,
        elementKey,
        firstName,
        field: 'name',
        value: 'Voorstel',
        amount: null,
        open: ['name'],
        hasPhoto: false,
        width: null,
        height: null,
        photoUrl: null,
        createdAt: null,
    };
}

vi.mock('@/hooks/use-collection-box', () => ({
    useCollectionBox: (): CollectionBox => {
        const box: OwnerBox | null =
            contributions.length === 0
                ? null
                : {
                      id: 'b1',
                      editionId: 'sample-edition-1',
                      url: 'https://printopoly.test/box/abc',
                      status: 'open',
                      expiresAt: Date.UTC(2026, 11, 21),
                      accepted: 0,
                      rejected: 0,
                      cardsHidden: false,
                      channel: 'box.b1',
                      contributions: [...contributions],
                  };

        return {
            box,
            loaded: true,
            busy: false,
            error: false,
            errorReason: null,
            start: () => Promise.resolve(),
            refresh: () => Promise.resolve(),
            close: () => Promise.resolve(),
            renew: () => Promise.resolve(),
            remove: () => Promise.resolve(),
            resolve: () => Promise.resolve(),
            hideCards: () => Promise.resolve(),
            secret: null,
        };
    },
}));

async function open(elements: Edition['elements'] = {}) {
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

describe('Van vrienden in the editor (B146)', () => {
    afterEach(() => {
        contributions.length = 0;
    });

    it('shows no row and no dot while nothing waits', async () => {
        renderWithI18n(<EditorWorkspace session={await open()} />);

        expect(
            screen.queryByRole('button', { name: /Van vrienden/ }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Menu van Zaterdagclub' }),
        ).toBeInTheDocument();
    });

    it('shows the row and the dot when something waits, and each press goes to the next element (bug 30)', async () => {
        contributions.push(
            contribution('c1', 'card.chance.03', 'Anna'),
            contribution('c2', 'space.05', 'Bram'),
        );
        const user = userEvent.setup();
        renderWithI18n(<EditorWorkspace session={await open()} />);

        expect(
            screen.getByRole('button', {
                name: 'Menu van Zaterdagclub, er wachten bijdragen van vrienden',
            }),
        ).toBeInTheDocument();
        const row = screen.getByRole('button', {
            name: 'Van vrienden, 2 wachten. Naar de volgende.',
        });
        await user.click(row);

        expect(
            screen.getByRole('heading', { name: 'Kans 3' }),
        ).toBeInTheDocument();
        const friends = screen.getByRole('region', { name: /Van vrienden/ });
        expect(within(friends).getByText(/van Anna/)).toBeInTheDocument();
        expect(
            within(friends).getByRole('button', { name: 'Toepassen' }),
        ).toBeInTheDocument();

        await user.click(
            screen.getByRole('button', {
                name: 'Van vrienden, 2 wachten. Naar de volgende.',
            }),
        );
        expect(
            screen.getByRole('heading', { name: 'Station Noord' }),
        ).toBeInTheDocument();
        await user.click(
            screen.getByRole('button', {
                name: 'Van vrienden, 2 wachten. Naar de volgende.',
            }),
        );
        expect(
            screen.getByRole('heading', { name: 'Kans 3' }),
        ).toBeInTheDocument();
    });

    it('shows a proposal for an extra card at that card, and applies it there (B135)', async () => {
        contributions.push({
            ...contribution('c1', 'card.chance.17', 'Anna'),
            field: 'text',
            value: 'Je wint de bingo.',
            open: ['text'],
        });
        const user = userEvent.setup();
        const session = await open({
            'card.chance.17': { added: true },
        });
        renderWithI18n(<EditorWorkspace session={session} />);

        await user.click(
            screen.getByRole('button', {
                name: 'Van vrienden, 1 wacht. Openen.',
            }),
        );

        const friends = screen.getByRole('region', { name: /Van vrienden/ });
        expect(within(friends).getByText(/van Anna/)).toBeInTheDocument();
        expect(
            within(friends).getByText(/Je wint de bingo\./),
        ).toBeInTheDocument();

        await user.click(
            within(friends).getByRole('button', { name: 'Toepassen' }),
        );

        await waitFor(() => {
            expect(session.edition.elements['card.chance.17']).toEqual({
                added: true,
                text: 'Je wint de bingo.',
            });
        });
    });

    it('opens Samen maken in the edition panel from the name menu, with the count', async () => {
        contributions.push(contribution('c1', 'group.brown', 'Anna'));
        const user = userEvent.setup();
        renderWithI18n(<EditorWorkspace session={await open()} />);

        await user.click(
            screen.getByRole('button', { name: /^Menu van Zaterdagclub/ }),
        );
        await user.click(
            await screen.findByRole('menuitem', {
                name: /Samen maken.*1 nieuw/,
            }),
        );

        const together = within(
            screen.getByRole('complementary', { name: 'Overzicht' }),
        ).getByRole('region', { name: 'Samen maken' });
        expect(within(together).getByText(/van Anna/)).toBeInTheDocument();

        await user.click(
            within(together).getByRole('button', { name: 'Naar Molenweg' }),
        );
        expect(
            screen.getByRole('heading', { name: 'Molenweg' }),
        ).toBeInTheDocument();
    });
});
