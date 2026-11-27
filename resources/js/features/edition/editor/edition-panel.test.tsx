import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { CollectionBox } from '@/features/edition/boxes/use-collection-box';
import { EditionBus } from '@/features/edition/bus';
import { EditionSession } from '@/features/edition/session';
import { fakeCollect, openBox } from '@/features/edition/testing/collect';
import { useSessionSnapshot } from '@/features/edition/use-edition-session';
import { resolveEdition } from '@/lib/render/edition-resolve';
import { MemoryEditionStorage } from '@/lib/render/edition-storage';
import type { Edition } from '@/lib/render/edition-types';
import { installMemoryServices, sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { EditionPanel } from './edition-panel';

const setup = async (
    edition: Edition = sampleEdition(),
    collect: CollectionBox = fakeCollect(),
) => {
    installMemoryServices();
    const storage = new MemoryEditionStorage();
    await storage.createEdition(edition);
    const session = new EditionSession(edition, {
        storage,
        bus: new EditionBus(null, 'w'),
        now: () => 5,
        debounceMs: 1000,
    });
    const onOpenElement = vi.fn();

    const Harness = () => {
        const { edition: current } = useSessionSnapshot(session);

        return (
            <EditionPanel
                session={session}
                edition={current}
                resolved={resolveEdition(current)}
                interfaceLanguage="nl"
                issues={[]}
                collect={collect}
                onOpenElement={onOpenElement}
                request={null}
            />
        );
    };

    renderWithI18n(<Harness />);

    return { session, onOpenElement, user: userEvent.setup() };
};

const section = (name: string) => screen.getByRole('region', { name });

const jump = (name: string) =>
    within(
        screen.getByRole('navigation', { name: 'Secties van de editie' }),
    ).getByRole('button', { name });

const must = <T,>(value: T | null | undefined): T => {
    if (value === null || value === undefined) {
        throw new Error('The element is missing.');
    }

    return value;
};

describe('EditionPanel (B145)', () => {
    it('has the sections in a fixed order, with jump links', async () => {
        await setup();

        const links = within(
            screen.getByRole('navigation', { name: 'Secties van de editie' }),
        ).getAllByRole('button');
        expect(links.map((link) => link.textContent)).toEqual([
            'Algemeen',
            'Uiterlijk',
            'Woorden',
            'Bordmaat',
        ]);
        // The section in sight is marked (vindbaarheid point 4), and a link moves the mark along.
        expect(links[0]).toHaveAttribute('aria-current', 'location');
        await userEvent.setup().click(jump('Woorden'));
        expect(links[2]).toHaveAttribute('aria-current', 'location');
        expect(links[0]).not.toHaveAttribute('aria-current');
    });

    it('takes an own board size on leaving the field, never halfway or when it is wrong, and marks only the wrong field (Lukas, R5-19)', async () => {
        const { session, user } = await setup();
        const board = section('Bordmaat');

        await user.click(
            within(board).getByRole('radio', { name: /Andere maat/ }),
        );
        const before = session.edition.boardProfile;
        const corner = within(board).getByLabelText(/B: hoekvak/);
        await user.clear(corner);
        await user.type(corner, '200');

        // Typing went through 2 and 20; the board kept its size.
        expect(session.edition.boardProfile).toEqual(before);
        expect(corner).toHaveAttribute('aria-invalid', 'true');
        expect(within(board).getByLabelText(/A: buitenmaat/)).toHaveAttribute(
            'aria-invalid',
            'false',
        );
        expect(within(board).getByRole('alert')).toHaveTextContent(
            /Hoekvak plus 9 vakken past niet/,
        );
        await user.tab();
        expect(session.edition.boardProfile).toEqual(before);

        await user.clear(corner);
        await user.type(corner, '70{Enter}');
        expect(session.edition.boardProfile.corner).toBe(70);
    });

    it('has no Onderdelen: what goes into the set is chosen on the print page (B198)', async () => {
        await setup();

        expect(
            screen.queryByRole('region', { name: 'Onderdelen' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('checkbox', { name: /Dobbelstenen/ }),
        ).toBeNull();
    });

    describe('Uiterlijk', () => {
        it('ignores a stored accent, and puts the group colours back with the section reset', async () => {
            const { session, user } = await setup({
                ...sampleEdition(),
                elements: {
                    theme_accent: { color: '#7B4B94' },
                    'group.red': { color: '#F7941D' },
                },
            });
            const look = section('Uiterlijk');
            expect(within(look).queryByText('#7B4B94')).toBeNull();

            await user.click(
                within(look).getByRole('button', {
                    name: 'Alles in deze sectie terug naar standaard',
                }),
            );
            expect(session.edition.elements['group.red']).toBeUndefined();
            expect(
                within(look).queryByRole('button', {
                    name: 'Alles in deze sectie terug naar standaard',
                }),
            ).not.toBeInTheDocument();
        });
    });

    describe('Woorden', () => {
        it('puts one word back with Standaard, and the whole section with the reset', async () => {
            const { session, user } = await setup({
                ...sampleEdition(),
                elements: {
                    'words.house': { name: 'hut' },
                    'words.bank': { name: 'De club' },
                },
            });
            const words = section('Woorden');

            const standards = within(words).getAllByRole('button', {
                name: /Standaard/,
            });
            expect(standards).toHaveLength(2);
            await user.click(must(standards[0]));
            expect(session.edition.elements['words.house']).toBeUndefined();

            await user.click(
                within(words).getByRole('button', {
                    name: 'Alles in deze sectie terug naar standaard',
                }),
            );
            expect(session.edition.elements['words.bank']).toBeUndefined();
        });
    });

    describe('Samen maken (B146)', () => {
        it('is not offered to an edition without a link: Samen maken is frozen (B202, R5-16)', async () => {
            await setup(sampleEdition(), fakeCollect());

            expect(
                screen.queryByRole('region', { name: 'Samen maken' }),
            ).not.toBeInTheDocument();
            expect(
                screen.queryByRole('button', { name: 'Maak een link' }),
            ).not.toBeInTheDocument();
        });

        it('stays the last section, with its jump link, for an edition that has a link', async () => {
            await setup(sampleEdition(), fakeCollect(openBox()));

            expect(
                within(
                    screen.getByRole('navigation', {
                        name: 'Secties van de editie',
                    }),
                )
                    .getAllByRole('button')
                    .map((link) => link.textContent),
            ).toEqual([
                'Algemeen',
                'Uiterlijk',
                'Woorden',
                'Bordmaat',
                'Samen maken',
            ]);
        });

        it('keeps the jump link that was chosen lit, also when its section is too short to reach the top (Lukas)', async () => {
            const { user } = await setup(
                sampleEdition(),
                fakeCollect(openBox()),
            );
            const links = within(
                screen.getByRole('navigation', {
                    name: 'Secties van de editie',
                }),
            ).getAllByRole('button');

            await user.click(jump('Bordmaat'));
            // The panel scrolls to the end, where the last section would count.
            const scroller = must(
                screen
                    .getByRole('region', { name: 'Bordmaat' })
                    .closest('.overflow-auto'),
            );
            Object.defineProperty(scroller, 'scrollHeight', { value: 400 });
            Object.defineProperty(scroller, 'clientHeight', { value: 400 });
            scroller.scrollTop = 1;
            fireEvent.scroll(scroller);

            expect(links[3]).toHaveAttribute('aria-current', 'location');
            expect(links[4]).not.toHaveAttribute('aria-current');
        });
    });
});
