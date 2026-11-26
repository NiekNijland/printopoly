import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditionBus } from '@/features/edition/bus';
import {
    menuButton,
    setup,
} from '@/features/edition/editor/testing/element-panel-setup';
import { EditionSession } from '@/features/edition/session';
import type { CheckIssue } from '@/lib/render/checks-types';
import { setElement } from '@/lib/render/edition-changes';
import { resolveEdition } from '@/lib/render/edition-resolve';
import { MemoryEditionStorage } from '@/lib/render/edition-storage';
import { templateEdition } from '@/lib/render/edition-templates';
import type { Edition, ElementOverride } from '@/lib/render/edition-types';
import { PhotoCache } from '@/lib/render/editor-photo-cache';
import { installMemoryServices } from '@/testing/editions';
import { mediaQueryList } from '@/testing/media-query';
import { renderWithI18n } from '@/testing/render';

import { ElementPanel, type ElementPanelProps } from './element-panel';

const headings = () =>
    screen
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent);

describe('ElementPanel', () => {
    it('shows the message about the pawns on every pawn it is about (R5-09)', async () => {
        const message = 'Pionnen zonder foto worden lege staanders.';
        const { props } = await setup('pawn.03', {
            issues: [
                {
                    id: 'pawns.no-photo|pawn.02|photo',
                    code: 'pawns.no-photo',
                    elementKey: 'pawn.02',
                    field: 'photo',
                    severity: 'warning',
                    icon: 'triangle-alert',
                    severityLabel: { nl: 'Waarschuwing', en: 'Warning' },
                    message: { nl: message, en: message },
                    alsoKeys: ['pawn.03'],
                    about: { nl: 'Pionnen', en: 'Pawns' },
                },
            ],
        });

        renderWithI18n(<ElementPanel {...props} />);
        expect(screen.getAllByText(message).length).toBeGreaterThan(0);
    });

    it('shows the fields of a space: name, photo, amounts and group', async () => {
        const { props } = await setup('space.01');

        renderWithI18n(<ElementPanel {...props} />);

        expect(screen.getByRole('radio', { name: 'Geen' })).toBeChecked();
        expect(screen.getByLabelText('Naam')).toHaveValue('Molenweg');
        expect(screen.getByLabelText('Prijs')).toHaveValue(60);
        expect(
            // A scale from lowest to highest, and one line about the standard (Niek, 22 nov).
            screen.getByLabelText('Prijs'),
        ).toHaveAccessibleDescription('Standaard bedrag. Kies 48 tot 72.');
        expect(screen.getByLabelText('Hypotheek')).toHaveValue(30);
        expect(screen.getByText('Groepskleur')).toBeInTheDocument();
        // Town and colour are group fields: they say how far they reach.
        expect(
            screen.getAllByText('geldt voor alle 2 bruine straten'),
        ).toHaveLength(2);
    });

    it('shows the warning of the Controle list at the field, with an icon word', async () => {
        const issue: CheckIssue = {
            id: 'x',
            code: 'photo.low-resolution',
            elementKey: 'space.01',
            field: 'photo',
            severity: 'warning',
            icon: 'triangle-alert',
            severityLabel: { nl: 'Waarschuwing', en: 'Warning' },
            message: {
                nl: 'De foto heeft 112 dpi.',
                en: 'The photo has 112 dpi.',
            },
        };
        const { props } = await setup('space.01', {
            withPhoto: true,
            issues: [issue],
        });

        renderWithI18n(<ElementPanel {...props} />);

        expect(screen.getByText('Waarschuwing:')).toBeInTheDocument();
        expect(screen.getByText(/De foto heeft 112 dpi\./)).toBeInTheDocument();
    });

    it('shows the fixed sections a street has, and only those a pawn has', async () => {
        const street = await setup('space.01');
        const first = renderWithI18n(<ElementPanel {...street.props} />);
        expect(headings()).toEqual([
            'Tekst',
            'Afbeelding',
            'Bedragen',
            'Stijl',
        ]);
        first.unmount();

        const pawn = await setup('pawn.03');
        renderWithI18n(<ElementPanel {...pawn.props} title="Pion 3" />);
        // Stijl holds the style of all pawns (B271), without the free layers a pawn does not draw.
        expect(headings()).toEqual(['Tekst', 'Afbeelding', 'Stijl']);
        expect(screen.queryByText('Extra lagen')).not.toBeInTheDocument();
        expect(screen.getByText('Pion 3 van 8')).toBeInTheDocument();
    });

    it('counts a pawn among the pawns that are in the set', async () => {
        const pawn = await setup('pawn.03', {
            elements: {
                'pawn.01': { hidden: true },
                'pawn.07': { hidden: true },
                'pawn.08': { hidden: true },
            },
        });
        renderWithI18n(<ElementPanel {...pawn.props} title="Pion 3" />);
        expect(screen.getByText('Pion 2 van 5')).toBeInTheDocument();
    });

    it('shows Standaard at a field only when it differs, and it puts the field back', async () => {
        const user = userEvent.setup();
        const plain = await setup('space.01');
        const first = renderWithI18n(<ElementPanel {...plain.props} />);
        expect(
            screen.queryByRole('button', { name: /terug naar standaard/ }),
        ).toBeNull();
        first.unmount();

        const { props, session } = await setup('space.01', { named: true });
        renderWithI18n(<ElementPanel {...props} />);
        await user.click(
            screen.getByRole('button', { name: 'Naam terug naar standaard' }),
        );

        expect(session.edition.elements['space.01']).toBeUndefined();
    });

    it('shows no keyboard hints on a touch screen, and folds the sections there (bug 10, §3.6)', async () => {
        const user = userEvent.setup();
        const media = vi
            .spyOn(window, 'matchMedia')
            .mockImplementation((query: string) =>
                mediaQueryList(query, query.includes('coarse')),
            );
        const { props } = await setup('space.01');

        renderWithI18n(<ElementPanel {...props} />);

        expect(screen.queryByText(/plakken met/)).toBeNull();
        expect(
            screen.getByRole('button', { name: /Tekst/, expanded: true }),
        ).toBeInTheDocument();
        const image = screen.getByRole('button', {
            name: /Afbeelding/,
            expanded: false,
        });
        expect(screen.queryByRole('radio', { name: 'Foto' })).toBeNull();
        await user.click(image);
        expect(screen.getByRole('radio', { name: 'Foto' })).toBeVisible();
        media.mockRestore();
    });

    it('shows the keyboard hint with a mouse and keyboard', async () => {
        const media = vi
            .spyOn(window, 'matchMedia')
            .mockImplementation((query: string) =>
                mediaQueryList(query, query.includes('min-width')),
            );
        const { props } = await setup('space.01');

        renderWithI18n(<ElementPanel {...props} />);

        expect(screen.getByText(/plakken met/)).toBeInTheDocument();
        media.mockRestore();
    });
});

describe('ElementPanel on an edition from a template (B152)', () => {
    const fromTemplate = async (
        key: string,
        changes: Record<string, ElementOverride | undefined>,
    ) => {
        installMemoryServices();
        const storage = new MemoryEditionStorage();
        const template = templateEdition('village', 'nl');
        if (template === undefined) {
            throw new Error('no template');
        }
        let edition: Edition = { ...template, id: 'tpl' };
        for (const [elementKey, override] of Object.entries(changes)) {
            edition = setElement(edition, elementKey, override).edition;
        }
        await storage.createEdition(edition);
        const session = new EditionSession(edition, {
            storage,
            bus: new EditionBus(null, 'w'),
            now: () => 5,
            debounceMs: 1000,
        });
        const props: ElementPanelProps = {
            session,
            edition,
            resolved: resolveEdition(edition),
            editKey: key,
            title: 'Waar het allemaal begon',
            context: null,
            onAct: vi.fn(),
            cache: new PhotoCache(() => Promise.resolve(undefined)),
            issues: [],
            siblings: ['space.03'],
        };

        return { template, session, props };
    };

    it('shows no Standaard and no dot while a field still has the template value', async () => {
        const { props } = await fromTemplate('space.01', {});

        renderWithI18n(<ElementPanel {...props} />);
        expect(
            screen.queryByRole('button', { name: /terug naar standaard/ }),
        ).toBeNull();
        expect(screen.queryByText('aangepast')).toBeNull();
    });

    it('does not call an untouched template card with an amount "1 aangepast" (R6 Aisha)', async () => {
        const template = templateEdition('village', 'nl');
        const key = Object.entries(template?.elements ?? {}).find(
            ([name, override]) =>
                name.startsWith('card.') && override?.amount !== undefined,
        )?.[0];
        expect(key).toBeDefined();
        const { props, session } = await fromTemplate(key ?? '', {});
        // A phone: the sections fold and a folded one says what changed in it.
        const media = vi
            .spyOn(window, 'matchMedia')
            .mockImplementation((query: string) =>
                mediaQueryList(query, false),
            );
        const summaries = (): string[] =>
            [...document.querySelectorAll('[data-section-summary]')].map(
                (node) => node.textContent ?? '',
            );

        const first = renderWithI18n(<ElementPanel {...props} />);
        expect(summaries().length).toBeGreaterThan(0);
        expect(summaries().join(' ')).not.toContain('aangepast');

        // A real change still counts.
        const amount = session.edition.elements[key ?? '']?.amount ?? 0;
        first.unmount();
        const changed = setElement(session.edition, key ?? '', {
            ...session.edition.elements[key ?? ''],
            amount: amount + Math.sign(amount),
        }).edition;
        renderWithI18n(
            <ElementPanel
                {...props}
                edition={changed}
                resolved={resolveEdition(changed)}
            />,
        );
        expect(summaries().join(' ')).toContain('1 aangepast');
        media.mockRestore();
    });

    it('puts a renamed street back to the template name, with Standaard and with the menu', async () => {
        const user = userEvent.setup();
        const first = await fromTemplate('space.01', {
            'space.01': { name: 'Kerkpad' },
        });
        const name = first.template.elements['space.01']?.name;

        const view = renderWithI18n(<ElementPanel {...first.props} />);
        await user.click(
            screen.getByRole('button', { name: 'Naam terug naar standaard' }),
        );
        expect(first.session.edition.elements['space.01']?.name).toBe(name);
        view.unmount();

        const second = await fromTemplate('space.01', {
            'space.01': { name: 'Kerkpad', amounts: { price: 62 } },
        });
        renderWithI18n(<ElementPanel {...second.props} />);
        await user.click(menuButton('Meer voor Waar het allemaal begon'));
        await user.click(
            screen.getByRole('menuitem', { name: 'Terug naar standaard' }),
        );
        expect(second.session.edition.elements['space.01']).toEqual({ name });
    });

    it('puts a card back to the template text and amount, and folds the template text under the story', async () => {
        const user = userEvent.setup();
        const { template, session, props } = await fromTemplate(
            'card.chest.03',
            { 'card.chest.03': { text: 'Eigen verhaal', amount: -55 } },
        );
        const card = template.elements['card.chest.03'];
        const amount = Math.abs(card?.amount ?? 0);

        renderWithI18n(<ElementPanel {...props} />);
        expect(
            screen.getByLabelText('Bedrag op de kaart'),
        ).toHaveAccessibleDescription(
            // The money is written with a no-break space after the sign.
            new RegExp(
                `€\\s${String(Math.abs(amount - 55))} ${amount > 55 ? 'lager' : 'hoger'} dan standaard \\(€\\s${String(amount)}\\)\\. Kies 40 tot 60\\.`,
            ),
        );
        await user.click(
            screen.getByRole('button', {
                name: 'Bedrag op de kaart terug naar standaard',
            }),
        );
        expect(session.edition.elements['card.chest.03']?.amount).toBe(
            card?.amount,
        );

        await user.click(screen.getByText('Standaardtekst'));
        expect(
            screen.getByText(/vuilnisbak/, { selector: 'span' }),
        ).toBeVisible();
        await user.click(
            screen.getByRole('button', {
                name: 'Tekst van de kaart terug naar standaard',
            }),
        );
        expect(session.edition.elements['card.chest.03']).toEqual(card);
    });
});
