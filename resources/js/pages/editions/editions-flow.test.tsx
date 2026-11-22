import type * as InertiaReact from '@inertiajs/react';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TemplatePicker } from '@/components/editions/template-picker';
import { DEFAULT_PARTS } from '@/lib/edition/types';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';
import { installMemoryServices } from '@/testing/editions';
import { fakePage } from '@/testing/page-props';
import { renderWithI18n } from '@/testing/render';

import EditionsCreate from './create';
import EditionsSample from './sample';
import EditionsIndex from './index';

const visit = vi.hoisted(() => vi.fn());

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof InertiaReact>()),
    usePage: () => fakePage(),
    router: { visit },
    Head: () => null,
}));

async function seed(names: string[]) {
    const services = installMemoryServices();
    for (const name of names) {
        await services.repository.create({
            name,
            language: 'nl',
            theme: 'classic',
            boardProfile: DEFAULT_BOARD_PROFILE,
        });
    }

    return services;
}

describe('Mijn edities flow', () => {
    it('selects the name when the rename dialog opens', async () => {
        const user = userEvent.setup();
        await seed(['Zaterdagclub']);
        renderWithI18n(<EditionsIndex />);

        await user.click(
            await screen.findByRole('button', {
                name: 'Meer opties voor Zaterdagclub',
            }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: 'Naam wijzigen' }),
        );

        const field = await screen.findByLabelText<HTMLInputElement>('Naam');
        await waitFor(() => expect(field).toHaveFocus());
        expect(field.selectionEnd).toBe('Zaterdagclub'.length);
    });

    it('says a copy was made', async () => {
        const user = userEvent.setup();
        await seed(['Zaterdagclub']);
        renderWithI18n(<EditionsIndex />);

        await user.click(
            await screen.findByRole('button', {
                name: 'Dupliceer Zaterdagclub als nieuwe editie',
            }),
        );

        expect(
            await screen.findByText('Zaterdagclub (kopie) is gemaakt.'),
        ).toBeInTheDocument();
    });

    it('moves the focus to the next card after a delete', async () => {
        const user = userEvent.setup();
        await seed(['Eerste', 'Tweede']);
        renderWithI18n(<EditionsIndex />);

        await user.click(
            await screen.findByRole('button', {
                name: 'Meer opties voor Tweede',
            }),
        );
        await user.click(
            await screen.findByRole('menuitem', { name: 'Verwijderen' }),
        );
        await user.click(
            await screen.findByRole('button', { name: 'Verwijderen' }),
        );

        expect(await screen.findByText('Editie verwijderd.')).toBeVisible();
        await waitFor(() =>
            expect(document.activeElement).toHaveAttribute('data-edition-link'),
        );
    });
});

describe('starting points on the new edition screen (B127, B201)', () => {
    it('starts blank and offers the six templates with a preview link', () => {
        installMemoryServices();
        renderWithI18n(<EditionsCreate />);

        const group = screen.getByRole('radiogroup', { name: 'Begin met…' });
        expect(screen.getByRole('radio', { name: /^Leeg/ })).toBeChecked();
        for (const label of [
            'Dorp of wijk',
            'Familie',
            'Vrienden',
            'Feest',
            'Bruiloft',
            'Groep',
        ]) {
            expect(
                screen.getByRole('radio', { name: new RegExp(`^${label}`) }),
            ).toBeInTheDocument();
        }
        expect(within(group).getAllByRole('radio')).toHaveLength(7);
        expect(
            screen.getByRole('link', {
                name: 'Bekijk het sjabloon Bruiloft',
            }),
        ).toHaveAttribute('href', expect.stringContaining('template=wedding'));
    });

    it('moves between the starts with the arrow keys', async () => {
        const user = userEvent.setup();
        installMemoryServices();
        renderWithI18n(<EditionsCreate />);

        screen.getByRole('radio', { name: /^Leeg/ }).focus();
        await user.keyboard('{ArrowRight}');
        const village = screen.getByRole('radio', { name: /^Dorp of wijk/ });
        expect(village).toHaveFocus();
        await user.keyboard(' ');

        expect(village).toBeChecked();
        expect(
            screen.getByLabelText<HTMLInputElement>('Naam van je editie').value,
        ).toBe('Ons dorp');
    });

    it('fills in name and theme, and makes an edition with the same set as every edition (B225)', async () => {
        const user = userEvent.setup();
        const services = installMemoryServices();
        visit.mockClear();
        renderWithI18n(<EditionsCreate />);

        await user.click(screen.getByRole('radio', { name: /^Feest/ }));

        expect(
            screen.getByLabelText<HTMLInputElement>('Naam van je editie').value,
        ).toBe('Het Feestspel');
        expect(screen.getByRole('button', { name: /Thema/ })).toHaveTextContent(
            'Riso',
        );

        await user.click(screen.getByRole('button', { name: 'Editie maken' }));
        await waitFor(() => expect(visit).toHaveBeenCalled());

        const [summary] = await services.repository.list();
        const edition = await services.repository.get(summary?.id ?? '');
        expect(edition?.name).toBe('Het Feestspel');
        expect(edition?.template).toBe('party');
        expect(edition?.parts).toEqual({ ...DEFAULT_PARTS, houseRules: true });
        expect(edition?.elements['card.chance.01']?.text).toBeDefined();
        expect(edition?.elements['card.chest.02']?.amount).toBe(160);
        expect(edition?.elements.house_rules?.text?.split('\n')).toHaveLength(
            3,
        );
    });

    it('keeps a name the visitor typed, and swaps the texts to the chosen language', async () => {
        const user = userEvent.setup();
        const services = installMemoryServices();
        visit.mockClear();
        renderWithI18n(<EditionsCreate template="friends" />);

        const field =
            screen.getByLabelText<HTMLInputElement>('Naam van je editie');
        expect(field.value).toBe('Het Vriendenspel');

        await user.click(screen.getByRole('radio', { name: 'English' }));
        expect(field.value).toBe('The Friends Game');

        await user.clear(field);
        await user.type(field, 'Onze groep');
        await user.click(screen.getByRole('radio', { name: /^Groep/ }));
        expect(field.value).toBe('Onze groep');
        await user.click(screen.getByRole('radio', { name: /^Vrienden/ }));

        await user.click(screen.getByRole('button', { name: 'Editie maken' }));
        await waitFor(() => expect(visit).toHaveBeenCalled());

        const [summary] = await services.repository.list();
        const edition = await services.repository.get(summary?.id ?? '');
        expect(edition?.name).toBe('Onze groep');
        expect(edition?.language).toBe('en');
        expect(edition?.elements['space.01']?.name).toBe('Where it all began');
    });

    it('goes back to the standard edition with Leeg', async () => {
        const user = userEvent.setup();
        const services = installMemoryServices();
        visit.mockClear();
        renderWithI18n(<EditionsCreate template="wedding" />);

        await user.click(screen.getByRole('radio', { name: /^Leeg/ }));
        expect(
            screen.getByLabelText<HTMLInputElement>('Naam van je editie').value,
        ).toBe('Onze editie');

        await user.click(screen.getByRole('button', { name: 'Editie maken' }));
        await waitFor(() => expect(visit).toHaveBeenCalled());

        const [summary] = await services.repository.list();
        const edition = await services.repository.get(summary?.id ?? '');
        expect(edition?.elements).toEqual({});
        expect(edition?.parts.houseRules).toBe(false);
    });
});

describe('the currency of a new edition (R5-22)', () => {
    beforeEach(() => window.localStorage.clear());

    async function made(services: ReturnType<typeof installMemoryServices>) {
        const [summary] = await services.repository.list();

        return services.repository.get(summary?.id ?? '');
    }

    it.each([undefined, 'party'] as const)(
        'keeps M when it is picked, blank or from a template (%s)',
        async (start) => {
            const user = userEvent.setup();
            const services = installMemoryServices();
            visit.mockClear();
            renderWithI18n(<EditionsCreate template={start} />);

            await user.click(screen.getByRole('button', { name: /Munt/ }));
            await user.click(
                screen.getByRole('radio', { name: 'M (geen echte munt)' }),
            );
            await user.click(screen.getByRole('radio', { name: 'English' }));
            await user.click(
                screen.getByRole('button', { name: 'Editie maken' }),
            );
            await waitFor(() => expect(visit).toHaveBeenCalled());

            expect((await made(services))?.currency).toBe('play');
        },
    );

    it('starts the next new edition with the currency picked last, in any language', async () => {
        const user = userEvent.setup();
        installMemoryServices();
        visit.mockClear();
        const first = renderWithI18n(<EditionsCreate />);

        await user.click(screen.getByRole('button', { name: /Munt/ }));
        await user.click(screen.getByRole('radio', { name: '$ dollar' }));
        await user.click(screen.getByRole('button', { name: 'Editie maken' }));
        await waitFor(() => expect(visit).toHaveBeenCalled());
        first.unmount();

        const services = installMemoryServices();
        visit.mockClear();
        renderWithI18n(<EditionsCreate template="group" />);

        expect(
            await screen.findByRole('button', { name: /Munt/ }),
        ).toHaveTextContent('$ dollar, zoals de vorige keer');
        await user.click(screen.getByRole('radio', { name: 'English' }));
        await user.click(screen.getByRole('button', { name: 'Editie maken' }));
        await waitFor(() => expect(visit).toHaveBeenCalled());

        expect((await made(services))?.currency).toBe('usd');
    });

    it('remembers nothing when the currency only followed the language', async () => {
        const user = userEvent.setup();
        installMemoryServices();
        visit.mockClear();
        renderWithI18n(<EditionsCreate />);

        await user.click(screen.getByRole('radio', { name: 'English' }));
        await user.click(screen.getByRole('button', { name: 'Editie maken' }));
        await waitFor(() => expect(visit).toHaveBeenCalled());

        expect(window.localStorage.getItem('printopoly.lastCurrency')).toBe(
            null,
        );
    });

    it('lets a long template name break inside its card (R5-22)', () => {
        renderWithI18n(
            <TemplatePicker
                value={null}
                onChange={() => undefined}
                locale="en"
                blankName="Our edition"
            />,
            'en',
        );

        const label = screen.getByText('Village or neighbourhood');
        expect(label).toHaveClass('min-w-0', 'hyphens-auto');
    });
});

describe('preview of a template (B127)', () => {
    it('shows the template read-only and copies it as a base', async () => {
        const user = userEvent.setup();
        const services = installMemoryServices();
        visit.mockClear();
        renderWithI18n(<EditionsSample template="village" />);

        expect(
            screen.getByRole('heading', { name: 'Voorbeeld: Dorp of wijk' }),
        ).toBeInTheDocument();

        await user.click(screen.getByRole('tab', { name: 'Kans' }));
        expect(screen.getByText('Kaart 1 van 16')).toBeInTheDocument();
        await user.click(
            screen.getByRole('button', { name: 'Volgende kaart' }),
        );
        expect(screen.getByText('Kaart 2 van 16')).toBeInTheDocument();
        await user.click(screen.getByRole('tab', { name: 'Huisregels' }));

        await user.click(
            screen.getByRole('button', { name: 'Begin met deze als basis' }),
        );
        await waitFor(() => expect(visit).toHaveBeenCalled());

        const [summary] = await services.repository.list();
        const edition = await services.repository.get(summary?.id ?? '');
        expect(edition?.name).toBe('Ons dorp');
        expect(edition?.elements['space.11']?.name).toBe('Jullie stamkroeg');
    });
});

describe('the bar with the button on a phone (R5-21)', () => {
    let seen: ((entries: { isIntersecting: boolean }[]) => void) | null = null;

    beforeEach(() => {
        seen = null;
        vi.stubGlobal(
            'IntersectionObserver',
            class {
                constructor(
                    callback: (entries: { isIntersecting: boolean }[]) => void,
                ) {
                    seen = callback;
                }
                observe() {}
                disconnect() {}
            },
        );
    });

    afterEach(() => vi.unstubAllGlobals());

    const bar = () => screen.getByRole('complementary', { name: 'Je editie' });

    it('comes in only once the starting points were in sight', () => {
        installMemoryServices();
        renderWithI18n(<EditionsCreate />);

        expect(bar()).toHaveAttribute('data-bar-shown', 'false');
        act(() => seen?.([{ isIntersecting: true }]));
        expect(bar()).toHaveAttribute('data-bar-shown', 'true');
        expect(bar()).toHaveTextContent('Begin: Leeg');
    });

    it('is there at once when a template was chosen on the landing', () => {
        installMemoryServices();
        renderWithI18n(<EditionsCreate template="party" />);

        expect(bar()).toHaveAttribute('data-bar-shown', 'true');
        expect(bar()).toHaveTextContent('Begin: Feest');
    });
});
