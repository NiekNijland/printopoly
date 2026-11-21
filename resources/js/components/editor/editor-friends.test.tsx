import type * as InertiaReact from '@inertiajs/react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { CollectionBox } from '@/hooks/use-collection-box';
import type { BoxContributionData, OwnerBox } from '@/lib/boxes/types';
import { EditionBus } from '@/lib/edition/bus';
import { EditionSession } from '@/lib/edition/session';
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
                      channel: 'box.b1',
                      contributions: [...contributions],
                  };

        return {
            box,
            loaded: true,
            busy: false,
            error: false,
            start: () => Promise.resolve(),
            refresh: () => Promise.resolve(),
            close: () => Promise.resolve(),
            renew: () => Promise.resolve(),
            remove: () => Promise.resolve(),
            resolve: () => Promise.resolve(),
            secret: null,
        };
    },
}));

async function open() {
    const services = installMemoryServices();
    const edition = sampleEdition();
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

    it('shows the row and the dot when something waits, and jumps to the first element', async () => {
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
            name: 'Van vrienden, 2 wachten. Naar de eerste.',
        });
        await user.click(row);

        expect(
            screen.getByRole('heading', { name: 'Kans 3' }),
        ).toBeInTheDocument();
        const friends = screen.getByRole('region', { name: /Van vrienden/ });
        expect(within(friends).getByText('Van Anna')).toBeInTheDocument();
        expect(
            within(friends).getByRole('button', { name: 'Toepassen' }),
        ).toBeInTheDocument();
    });

    it('opens Samen maken in the edition panel from the name menu, with the count', async () => {
        contributions.push(contribution('c1', 'group.brown', 'Anna'));
        const user = userEvent.setup();
        renderWithI18n(<EditorWorkspace session={await open()} />);

        await user.click(
            screen.getByRole('button', { name: /^Menu van Zaterdagclub/ }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: /Samen maken.*1 nieuw/ }),
        );

        const together = within(
            screen.getByRole('complementary', { name: 'Editie' }),
        ).getByRole('region', { name: 'Samen maken' });
        expect(within(together).getByText(/Van Anna/)).toBeInTheDocument();

        await user.click(within(together).getByText(/Van Anna/));
        expect(
            screen.getByRole('heading', { name: 'Molenweg' }),
        ).toBeInTheDocument();
    });
});
