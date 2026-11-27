import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import EditionsCreate from '@/pages/editions/create';
import { installMemoryServices } from '@/testing/editions';
import { visit } from '@/testing/inertia';
import { renderWithI18n } from '@/testing/render';

const submitButton = () => screen.getByRole('button', { name: 'Editie maken' });

describe('EditionsCreate', () => {
    it('heads the page Nieuwe editie', () => {
        installMemoryServices();

        renderWithI18n(<EditionsCreate />);

        expect(
            screen.getByRole('heading', { level: 1, name: 'Nieuwe editie' }),
        ).toBeInTheDocument();
    });

    it('makes nothing without a name', async () => {
        const user = userEvent.setup();
        const { repository } = installMemoryServices();
        renderWithI18n(<EditionsCreate />);

        await user.clear(screen.getByLabelText('Naam van je editie'));
        await user.type(screen.getByLabelText('Naam van je editie'), '   ');

        expect(submitButton()).toBeDisabled();

        await user.type(screen.getByLabelText('Naam van je editie'), '{Enter}');

        expect(await repository.list()).toHaveLength(0);
        expect(visit).not.toHaveBeenCalled();
    });

    it('trims the name and opens the new edition in the editor', async () => {
        const user = userEvent.setup();
        const { repository } = installMemoryServices();
        renderWithI18n(<EditionsCreate />);

        await user.clear(screen.getByLabelText('Naam van je editie'));
        await user.type(
            screen.getByLabelText('Naam van je editie'),
            '  Kerst  ',
        );
        await user.click(submitButton());

        await waitFor(() => expect(visit).toHaveBeenCalledOnce());
        const [made] = await repository.list();
        expect(made?.name).toBe('Kerst');
        expect(visit).toHaveBeenCalledExactlyOnceWith({
            method: 'get',
            url: `/nl/editor/${made?.id ?? ''}`,
        });
    });

    it('says so and lets you try again when a blank edition cannot be saved', async () => {
        const user = userEvent.setup();
        const { repository } = installMemoryServices();
        vi.spyOn(repository, 'create').mockRejectedValue(new Error('full'));
        renderWithI18n(<EditionsCreate />);

        await user.click(submitButton());

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'De editie kon niet worden bewaard in deze browser. Probeer het nog een keer.',
        );
        expect(submitButton()).toBeEnabled();
        expect(visit).not.toHaveBeenCalled();
    });

    it('says so too when a copy of a template cannot be saved', async () => {
        const user = userEvent.setup();
        const { repository } = installMemoryServices();
        const createFrom = vi
            .spyOn(repository, 'createFrom')
            .mockRejectedValue(new Error('full'));
        renderWithI18n(<EditionsCreate template="party" />);

        await user.click(submitButton());

        expect(await screen.findByRole('alert')).toBeInTheDocument();
        expect(createFrom).toHaveBeenCalledOnce();
        expect(submitButton()).toBeEnabled();
    });

    it('folds a line again with a second click and opens one line at a time', async () => {
        const user = userEvent.setup();
        installMemoryServices();
        renderWithI18n(<EditionsCreate />);
        const theme = screen.getByRole('button', { name: /Thema/ });
        const currency = screen.getByRole('button', { name: /Munt/ });

        await user.click(theme);
        expect(theme).toHaveAttribute('aria-expanded', 'true');

        await user.click(currency);
        expect(currency).toHaveAttribute('aria-expanded', 'true');
        expect(theme).toHaveAttribute('aria-expanded', 'false');

        await user.click(currency);
        expect(currency).toHaveAttribute('aria-expanded', 'false');
    });

    it('keeps a language chosen when it is clicked again', async () => {
        const user = userEvent.setup();
        installMemoryServices();
        renderWithI18n(<EditionsCreate />);

        await user.click(screen.getByRole('radio', { name: 'Nederlands' }));

        expect(screen.getByRole('radio', { name: 'Nederlands' })).toBeChecked();
        expect(
            screen.getByRole('radio', { name: 'English' }),
        ).not.toBeChecked();
    });
});
