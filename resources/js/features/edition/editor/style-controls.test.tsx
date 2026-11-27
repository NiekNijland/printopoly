import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { setup } from '@/features/edition/editor/testing/element-panel-setup';
import { resolveEdition } from '@/lib/render/edition-resolve';
import { sampleEdition } from '@/testing/editions';
import { renderWithI18n } from '@/testing/render';

import { ColorField, GroupColorField, PatternPicker } from './style-controls';

describe('ColorField', () => {
    it('takes a colour of the palette or a typed hex, and puts it back with Standaard', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();

        renderWithI18n(
            <ColorField
                id="test"
                label="Kleur"
                value="#123456"
                custom
                edition={sampleEdition()}
                onChange={onChange}
            />,
        );
        const palette = screen.getByRole('group', {
            name: 'Kleuren van dit thema',
        });
        const [first] = [...palette.querySelectorAll('button')];
        if (first === undefined) {
            throw new Error('no swatch');
        }
        await user.click(first);
        fireEvent.change(screen.getByRole('textbox', { name: 'Kleur: hex' }), {
            target: { value: '#2a6f4b' },
        });
        await user.click(
            screen.getByRole('button', { name: 'Kleur terug naar standaard' }),
        );

        expect(onChange).toHaveBeenCalledTimes(3);
        expect(onChange.mock.calls[1]).toEqual(['#2A6F4B']);
        expect(onChange.mock.calls[2]).toEqual([undefined]);
    });

    it('tones down a colour print ink cannot make, and says so', () => {
        const onChange = vi.fn();

        renderWithI18n(
            <ColorField
                id="test"
                label="Kleur"
                value="#123456"
                custom={false}
                edition={sampleEdition()}
                onChange={onChange}
            />,
        );
        fireEvent.change(screen.getByLabelText('Kleur: kleurkiezer'), {
            target: { value: '#00ff00' },
        });

        expect(onChange).toHaveBeenCalledWith(
            expect.not.stringMatching(/^#00FF00$/),
        );
        expect(screen.getByRole('status')).toHaveTextContent(
            'Die kleur is feller dan drukinkt kan maken.',
        );
    });
});

describe('GroupColorField', () => {
    it('writes the colour of a street group', async () => {
        const user = userEvent.setup();
        const { session } = await setup('space.01');

        renderWithI18n(
            <GroupColorField
                session={session}
                edition={session.edition}
                resolved={resolveEdition(session.edition)}
                group="brown"
                label="Groepskleur"
            />,
        );
        const palette = screen.getByRole('group', {
            name: 'Kleuren van dit thema',
        });
        const last = [...palette.querySelectorAll('button')].at(-1);
        if (last === undefined) {
            throw new Error('no swatch');
        }
        await user.click(last);

        expect(session.edition.elements['group.brown']?.color).toMatch(
            /^#[0-9A-F]{6}$/,
        );
    });
});

describe('PatternPicker', () => {
    it('chooses a pattern', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();

        renderWithI18n(
            <PatternPicker
                label="Patroon op de achterkant"
                value={undefined}
                color="#c0392b"
                onChange={onChange}
            />,
        );
        const [, pattern] = screen.getAllByRole('radio');
        if (pattern === undefined) {
            throw new Error('no pattern');
        }
        await user.click(pattern);

        expect(onChange).toHaveBeenCalledWith(expect.any(String));
    });
});
