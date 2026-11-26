import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { updateElement } from '@/lib/render/edition-changes';
import { resolveEdition } from '@/lib/render/edition-resolve';
import { sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { CardTextEditor } from './card-text-editor';

function Harness({
    initial,
    amount,
    renamed,
    onChange,
}: {
    initial: string;
    amount?: number;
    renamed?: Record<string, string>;
    onChange: (text: string) => void;
}) {
    const [value, setValue] = useState(initial);
    let edition = sampleEdition();
    for (const [key, name] of Object.entries(renamed ?? {})) {
        edition = updateElement(edition, key, { name }).edition;
    }

    return (
        <CardTextEditor
            label="Verhaal"
            value={value}
            amount={amount}
            resolved={resolveEdition(edition)}
            onChange={(text) => {
                setValue(text);
                onChange(text);
            }}
        />
    );
}

function field(): HTMLElement {
    return screen.getByRole('textbox', { name: 'Verhaal' });
}

function placeCaret(node: Node, offset: number): void {
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
}

describe('CardTextEditor (B131)', () => {
    it('shows variables as chips with a label for screen readers', () => {
        renderWithI18n(
            <Harness
                initial="Ga naar {space:24} voor {currency}{amount}."
                amount={20}
                renamed={{ 'space.24': 'Jalinkhof' }}
                onChange={vi.fn()}
            />,
        );

        expect(screen.getByLabelText('Straat: Jalinkhof')).toHaveTextContent(
            'Jalinkhof',
        );
        expect(screen.getByLabelText('Munteenheid: Euro')).toHaveTextContent(
            '€',
        );
        expect(
            screen.getByLabelText('Bedrag van de kaart: 20'),
        ).toBeInTheDocument();
        expect(field()).toHaveTextContent(/^Ga naar .*Jalinkhof.* voor/);
    });

    it('shows the word of the edition as a chip and inserts one from the list (B177)', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderWithI18n(
            <Harness
                initial="Ga naar het dichtstbijzijnde {station}. "
                renamed={{ 'words.station': 'Bushalte' }}
                onChange={onChange}
            />,
        );

        expect(screen.getByLabelText('Woord: Bushalte')).toHaveTextContent(
            'Bushalte',
        );
        expect(field()).not.toHaveTextContent('{station}');

        placeCaret(field().lastChild as Text, 2);
        await user.click(screen.getByRole('button', { name: 'Invoegen' }));
        await user.type(
            screen.getByLabelText('Zoek een vak of woord'),
            'gevangenis',
        );
        await user.click(
            screen.getByRole('button', { name: /^de gevangenis/ }),
        );

        expect(onChange).toHaveBeenLastCalledWith(
            'Ga naar het dichtstbijzijnde {station}. {jail}',
        );
    });

    it('marks unknown variables and an amount that is not set', () => {
        renderWithI18n(<Harness initial="{foo} {amount}" onChange={vi.fn()} />);

        expect(
            screen.getByLabelText('Onbekende variabele: {foo}'),
        ).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText('Bedrag niet ingevuld')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
    });

    it('deletes a whole chip with Backspace', () => {
        const onChange = vi.fn();
        renderWithI18n(
            <Harness initial="Naar {space:24}" onChange={onChange} />,
        );
        placeCaret(field().lastChild as Text, 1);

        fireEvent.keyDown(field(), { key: 'Backspace' });

        expect(onChange).toHaveBeenLastCalledWith('Naar ');
        expect(screen.queryByLabelText(/^Straat:/)).toBeNull();
    });

    it('inserts a street from the searchable list at the caret', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderWithI18n(<Harness initial="Ga naar ." onChange={onChange} />);
        placeCaret(field().firstChild as Text, 'Ga naar '.length);

        await user.click(screen.getByRole('button', { name: 'Invoegen' }));
        await user.type(
            screen.getByLabelText('Zoek een vak of woord'),
            'kroon',
        );

        expect(screen.queryByRole('button', { name: /Molenweg/ })).toBeNull();

        await user.click(screen.getByRole('button', { name: /Kroonplein/ }));

        expect(onChange).toHaveBeenLastCalledWith('Ga naar {space:39}.');
        await waitFor(() =>
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
        );
        expect(screen.getByLabelText('Straat: Kroonplein')).toBeInTheDocument();
    });

    it('lists the current names, and says when the amount is not set', async () => {
        const user = userEvent.setup();
        renderWithI18n(
            <Harness
                initial=""
                renamed={{ 'space.24': 'Jalinkhof' }}
                onChange={vi.fn()}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Invoegen' }));

        expect(
            screen.getByRole('button', { name: /Jalinkhof/ }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /Raadhuisplein/ }),
        ).toBeNull();
        expect(
            screen.getByRole('button', { name: /Bedrag van de kaart/ }),
        ).toHaveTextContent('Vul eerst een bedrag in.');

        await user.type(screen.getByLabelText('Zoek een vak of woord'), 'zzz');

        expect(screen.getByText('Geen vak gevonden.')).toBeInTheDocument();
    });

    it('inserts the currency', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderWithI18n(<Harness initial="" onChange={onChange} />);

        await user.click(screen.getByRole('button', { name: 'Invoegen' }));
        await user.click(screen.getByRole('button', { name: /Munteenheid/ }));

        expect(onChange).toHaveBeenLastCalledWith('{currency}');
    });

    it('blocks bold and italic, and survives typing events without an inputType', () => {
        renderWithI18n(<Harness initial="Hallo" onChange={vi.fn()} />);

        const bold = new InputEvent('beforeinput', {
            inputType: 'formatBold',
            cancelable: true,
        });
        field().dispatchEvent(bold);
        expect(bold.defaultPrevented).toBe(true);

        const typed = new InputEvent('beforeinput', {
            inputType: 'insertText',
            data: 'a',
            cancelable: true,
        });
        field().dispatchEvent(typed);
        expect(typed.defaultPrevented).toBe(false);

        // Chrome's textInput event (React's onBeforeInput) has no inputType.
        expect(() =>
            field().dispatchEvent(new Event('textInput', { bubbles: true })),
        ).not.toThrow();
    });

    it('turns Enter into a line break and keeps pasted text plain', () => {
        const onChange = vi.fn();
        renderWithI18n(<Harness initial="ab" onChange={onChange} />);
        placeCaret(field().firstChild as Text, 1);

        fireEvent.keyDown(field(), { key: 'Enter' });

        expect(onChange).toHaveBeenLastCalledWith('a\nb');

        act(() => {
            fireEvent.paste(field(), {
                clipboardData: {
                    getData: (type: string) =>
                        type === 'text/plain' ? '<b>x</b>' : '<b>x</b>',
                },
            });
        });

        expect(onChange).toHaveBeenLastCalledWith('a\n<b>x</b>b');
    });
});
