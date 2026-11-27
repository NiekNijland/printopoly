import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithI18n } from '@/testing/render';

import { useTranslation, useTranslationChoice } from './use-translation';

const Text = ({ k, count }: { k: string; count?: number }) => {
    const t = useTranslation();

    return <p>{t(k, count === undefined ? undefined : { count })}</p>;
};

const Count = ({ k, count }: { k: string; count: number }) => {
    const tChoice = useTranslationChoice();

    return <p>{tChoice(k, count)}</p>;
};

describe('useTranslation', () => {
    it('reads the Dutch catalogue', () => {
        renderWithI18n(<Text k="nav.my_editions" />);

        expect(screen.getByText('Mijn edities')).toBeInTheDocument();
    });

    it('fills in a replacement from the English catalogue', () => {
        renderWithI18n(<Text k="editor.history_many" count={4} />, 'en');

        expect(screen.getByText('4 items')).toBeInTheDocument();
    });

    it('answers the key itself when the catalogue does not know it', () => {
        renderWithI18n(<Text k="no.such.key" />);

        expect(screen.getByText('no.such.key')).toBeInTheDocument();
    });
});

describe('useTranslationChoice', () => {
    it('picks the singular form for one', () => {
        renderWithI18n(<Count k="editor.list_pasted" count={1} />);

        expect(screen.getByText('1 naam ingevuld.')).toBeInTheDocument();
    });

    it('picks the plural form and fills in the count', () => {
        renderWithI18n(<Count k="editor.list_pasted" count={3} />, 'en');

        expect(screen.getByText('3 names filled in.')).toBeInTheDocument();
    });
});
