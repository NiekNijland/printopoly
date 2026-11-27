import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { EditionSummary } from '@/lib/render/edition-types';
import { installMemoryServices } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import {
    CardButtons,
    CardMenu,
    CardSummary,
    CardThumbnail,
} from './edition-card-parts';

const edition: EditionSummary = {
    id: 'e1',
    name: 'Zaterdagclub',
    language: 'nl',
    theme: 'classic',
    revision: 1,
    updatedAt: 1,
    createdAt: 1,
    customizedSpaces: 0,
    customizedElements: 0,
    customizedPercent: 0,
};

describe('CardSummary', () => {
    it('says how much is your own and where the edition is kept', () => {
        renderWithI18n(
            <CardSummary
                edition={{ ...edition, customizedPercent: 40 }}
                inAccount
                edited="3 mrt"
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Zaterdagclub' }),
        ).toHaveClass('text-xl');
        expect(
            screen.getByText('40% aangepast · bewerkt 3 mrt'),
        ).toBeInTheDocument();
    });

    it('leaves the share out at 0 and makes a long name smaller', () => {
        const name = 'Een hele lange naam voor een editie van de club';
        renderWithI18n(
            <CardSummary
                edition={{ ...edition, name }}
                inAccount={false}
                edited="3 mrt"
            />,
        );

        expect(screen.getByRole('heading', { name })).toHaveClass('text-lg');
        expect(screen.getByText('Bewerkt 3 mrt')).toBeInTheDocument();
    });
});

describe('CardThumbnail and CardButtons', () => {
    it('open the editor and the print page, and duplicate', async () => {
        installMemoryServices();
        const user = userEvent.setup();
        const onDuplicate = vi.fn();
        renderWithI18n(
            <>
                <CardThumbnail edition={edition} />
                <CardButtons
                    edition={edition}
                    busy={false}
                    onDuplicate={onDuplicate}
                />
            </>,
        );

        expect(
            screen.getByRole('link', { name: 'Zaterdagclub openen' }),
        ).toHaveAttribute('href', '/nl/editor/e1');
        expect(
            screen.getByRole('link', { name: 'Zaterdagclub printen' }),
        ).toHaveAttribute('href', '/nl/editions/e1/print');
        await user.click(
            screen.getByRole('button', {
                name: 'Dupliceer Zaterdagclub als nieuwe editie',
            }),
        );
        expect(onDuplicate).toHaveBeenCalledTimes(1);
    });
});

describe('CardMenu', () => {
    it('offers Dupliceren, Naam wijzigen and Verwijderen', async () => {
        const user = userEvent.setup();
        const onRename = vi.fn();
        const onDelete = vi.fn();
        renderWithI18n(
            <CardMenu
                name="Zaterdagclub"
                busy={false}
                onDuplicate={vi.fn()}
                onRename={onRename}
                onDelete={onDelete}
            />,
        );

        await user.click(
            screen.getByRole('button', {
                name: 'Meer opties voor Zaterdagclub',
            }),
        );
        expect(
            screen.getByRole('menuitem', { name: 'Dupliceren' }),
        ).toBeInTheDocument();
        await user.click(
            screen.getByRole('menuitem', { name: 'Naam wijzigen' }),
        );
        expect(onRename).toHaveBeenCalledTimes(1);

        await user.click(
            screen.getByRole('button', {
                name: 'Meer opties voor Zaterdagclub',
            }),
        );
        await user.click(screen.getByRole('menuitem', { name: 'Verwijderen' }));
        expect(onDelete).toHaveBeenCalledTimes(1);
    });
});
