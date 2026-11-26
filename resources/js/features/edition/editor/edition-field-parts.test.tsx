import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LiveEdition, memorySession } from '@/features/edition/testing/session';
import { sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { FieldHead, StandardButton, WordInput } from './edition-field-parts';

describe('FieldHead', () => {
    it('labels a field, with where it shows or its Standaard on the right', () => {
        const { unmount } = renderWithI18n(
            <FieldHead htmlFor="x" label="Naam" where="Op de doos" />,
        );
        expect(screen.getByText('Naam').tagName).toBe('LABEL');
        expect(screen.getByText('Op de doos')).toBeInTheDocument();
        unmount();

        renderWithI18n(
            <FieldHead
                label="Kleuren"
                where="Op het bord"
                standard={<StandardButton onClick={() => undefined} />}
            />,
        );
        expect(screen.getByText('Kleuren').tagName).toBe('SPAN');
        expect(screen.queryByText('Op het bord')).toBeNull();
        expect(
            screen.getByRole('button', { name: /Standaard/ }),
        ).toBeInTheDocument();
    });
});

describe('StandardButton', () => {
    it('puts the field back, named for a screen reader when asked', async () => {
        const user = userEvent.setup();
        const onClick = vi.fn<() => void>();
        renderWithI18n(<StandardButton onClick={onClick} label="Huis terug" />);

        await user.click(screen.getByRole('button', { name: 'Huis terug' }));
        expect(onClick).toHaveBeenCalledOnce();
    });
});

describe('WordInput', () => {
    it('stores a word, shows the standard word grey while empty, and empties with Standaard', async () => {
        const user = userEvent.setup();
        const session = memorySession(sampleEdition());
        renderWithI18n(
            <LiveEdition session={session}>
                {(edition) => (
                    <WordInput
                        session={session}
                        edition={edition}
                        elementKey="words.house"
                        field="name"
                        label="Huis"
                        placeholder="huis"
                    />
                )}
            </LiveEdition>,
        );
        const input = screen.getByLabelText('Huis');

        expect(input).toHaveAttribute('placeholder', 'huis');
        await user.type(input, 'hut');
        expect(session.edition.elements['words.house']).toEqual({
            name: 'hut',
        });
        await user.click(screen.getByRole('button', { name: /Standaard/ }));
        expect(session.edition.elements['words.house']).toBeUndefined();
        expect(input).toHaveValue('');
    });
});
