import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { renderWithI18n } from '@/testing/render';

import { InvitationCount } from './invitation-count';

type Change = (count: number) => void;

const mount = (value: number, onChange = vi.fn<Change>(), disabled = false) => {
    renderWithI18n(
        <InvitationCount
            value={value}
            onChange={onChange}
            disabled={disabled}
            note="Dat is 5 keer het vel met 4 kaarten."
        />,
    );

    return onChange;
};

const field = () =>
    screen.getByRole('textbox', { name: 'Hoeveel uitnodigingen?' });

describe('InvitationCount', () => {
    it('shows the number, the buttons and what the number means', () => {
        mount(20);

        expect(field()).toHaveValue('20');
        expect(
            screen.getByRole('group', { name: 'Hoeveel uitnodigingen?' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Dat is 5 keer het vel met 4 kaarten.'),
        ).toHaveAttribute('aria-live', 'polite');
    });

    it('counts one down or up with the buttons', async () => {
        const user = userEvent.setup();
        const onChange = mount(20);

        await user.click(
            screen.getByRole('button', { name: 'Een uitnodiging minder' }),
        );
        await user.click(
            screen.getByRole('button', { name: 'Een uitnodiging meer' }),
        );

        expect(onChange.mock.calls).toEqual([[19], [21]]);
    });

    it('goes no lower than one', () => {
        mount(1);
        expect(
            screen.getByRole('button', { name: 'Een uitnodiging minder' }),
        ).toBeDisabled();
    });

    it('stops at five hundred', () => {
        mount(500);

        expect(
            screen.getByRole('button', { name: 'Een uitnodiging meer' }),
        ).toBeDisabled();
    });

    it('keeps a typed number on Enter, digits only and within the limits', async () => {
        const user = userEvent.setup();
        const onChange = mount(20);

        await user.clear(field());
        await user.type(field(), '8a0{Enter}');
        expect(field()).toHaveValue('80');

        await user.clear(field());
        await user.type(field(), '9999');
        await user.tab();

        expect(onChange.mock.calls).toEqual([[80], [500]]);
        expect(field()).toHaveValue('500');
    });

    it('puts the number back when the field is left empty or unchanged', async () => {
        const user = userEvent.setup();
        const onChange = mount(20);

        await user.clear(field());
        await user.tab();
        expect(field()).toHaveValue('20');

        await user.click(field());
        await user.keyboard('{Enter}');

        expect(onChange).not.toHaveBeenCalled();
    });

    it('follows a number that changed elsewhere', async () => {
        const user = userEvent.setup();
        const Harness = () => {
            const [value, setValue] = useState(4);

            return (
                <>
                    <button type="button" onClick={() => setValue(12)}>
                        Server
                    </button>
                    <InvitationCount
                        value={value}
                        onChange={setValue}
                        note=""
                    />
                </>
            );
        };
        renderWithI18n(<Harness />);

        await user.click(screen.getByRole('button', { name: 'Server' }));

        expect(field()).toHaveValue('12');
    });

    it('can be switched off', () => {
        mount(20, vi.fn<Change>(), true);

        expect(field()).toBeDisabled();
        expect(
            screen.getByRole('button', { name: 'Een uitnodiging meer' }),
        ).toBeDisabled();
    });
});
