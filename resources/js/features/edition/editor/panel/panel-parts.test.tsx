import { act, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithI18n } from '@/testing/render';

import {
    CheckField,
    Field,
    FieldLabel,
    chooseFrom,
    useDraft,
} from './panel-parts';

describe('useDraft', () => {
    it('keeps what is typed for its element until the field ends', () => {
        const { result, rerender } = renderHook(
            ({ scope }) => useDraft('Molenweg', scope),
            { initialProps: { scope: 'space.01' } },
        );

        act(() => result.current.set(''));

        expect(result.current.shown).toBe('');

        rerender({ scope: 'space.03' });

        expect(result.current.shown).toBe('Molenweg');

        rerender({ scope: 'space.01' });
        act(() => result.current.end());

        expect(result.current.shown).toBe('Molenweg');
    });
});

describe('Field', () => {
    it('labels its control and offers Standaard when the field differs', async () => {
        const user = userEvent.setup();
        const onStandard = vi.fn();

        renderWithI18n(
            <Field
                label="Naam"
                hint="Een hint"
                tag="drie straten"
                onStandard={onStandard}
            >
                {(id) => <input id={id} />}
            </Field>,
        );
        await user.click(
            screen.getByRole('button', { name: 'Naam terug naar standaard' }),
        );

        expect(screen.getByLabelText('Naam')).toBeInTheDocument();
        expect(screen.getByText('Een hint')).toBeInTheDocument();
        expect(screen.getByText('drie straten')).toBeInTheDocument();
        expect(onStandard).toHaveBeenCalled();
    });

    it('shows a title without a control as a plain title', () => {
        renderWithI18n(<FieldLabel label="Kleur" />);

        expect(screen.getByText('Kleur')).toBeInTheDocument();
        expect(screen.queryByRole('button')).toBeNull();
    });
});

describe('CheckField', () => {
    it('ticks the box from its words', async () => {
        const user = userEvent.setup();
        const onCheckedChange = vi.fn();

        renderWithI18n(
            <CheckField
                label="Titel tonen"
                checked={false}
                field="title-hidden"
                onCheckedChange={onCheckedChange}
            />,
        );
        await user.click(screen.getByText('Titel tonen'));

        expect(onCheckedChange).toHaveBeenCalledWith(true);
    });
});

describe('chooseFrom', () => {
    it('passes on a known choice and ignores the empty value of a cleared group', () => {
        const chosen: string[] = [];
        const choose = chooseFrom(
            [{ id: 'framed' }, { id: 'full' }] as const,
            (next) => chosen.push(next),
        );

        choose('full');
        choose('');
        choose('other');

        expect(chosen).toEqual(['full']);
    });
});
