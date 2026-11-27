import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { templateEdition } from '@/lib/render/edition-templates';
import { renderWithI18n } from '@/testing/render';

import {
    EMPTY_SPACES,
    TemplatePicker,
    templateSpaces,
    type TemplateChoice,
} from './template-picker';

const mount = (value: TemplateChoice = null) => {
    const onChange = vi.fn<(choice: TemplateChoice) => void>();
    renderWithI18n(
        <TemplatePicker
            value={value}
            onChange={onChange}
            locale="nl"
            blankName="Mijn editie"
        />,
    );

    return onChange;
};

const radio = (value: string): HTMLElement => {
    const found = document.querySelector(`[role="radio"][value="${value}"]`);
    if (!(found instanceof HTMLElement)) {
        throw new Error(`no choice ${value}`);
    }

    return found;
};

describe('TemplatePicker', () => {
    it('offers Standaard, Leeg and the six templates, each with a link to its preview', async () => {
        const user = userEvent.setup();
        const onChange = mount('village');

        expect(document.querySelectorAll('[role="radio"]')).toHaveLength(8);
        expect(radio('village')).toBeChecked();
        expect(radio('village').closest('label')).toHaveTextContent(
            'Dorp of wijk',
        );
        expect(radio('blank')).not.toBeChecked();
        expect(
            screen.getByText('Begin met…', { selector: 'legend' }),
        ).toBeInTheDocument();
        expect(
            screen.getByLabelText('Bekijk het sjabloon Feest'),
        ).toHaveAttribute('href', '/nl/editions/sample?template=party');
        expect(document.querySelectorAll('a[href]')).toHaveLength(6);

        await user.click(radio('blank'));
        expect(onChange).toHaveBeenCalledExactlyOnceWith(null);
    });

    it('starts on Standaard and gives the choice back as a template or Leeg', async () => {
        const user = userEvent.setup();
        const onChange = mount();
        expect(radio('blank')).toBeChecked();
        expect(radio('blank').closest('label')).toHaveTextContent(/Standaard/);
        expect(
            screen.getByText(
                'De gewone straatnamen en kaarten. Pas aan wat je wilt.',
            ),
        ).toBeInTheDocument();

        await user.click(radio('village'));
        await user.click(radio('empty'));

        expect(onChange.mock.calls).toEqual([['village'], ['empty']]);
    });
});

describe('templateSpaces', () => {
    it('takes the own street names of a template', () => {
        const edition = templateEdition('village', 'nl');
        const spaces = templateSpaces(edition);

        expect(spaces[1]?.name).toBe(edition?.elements['space.01']?.name);
        expect(Object.keys(spaces).length).toBeGreaterThan(10);
    });

    it('has no names without a template', () => {
        expect(templateSpaces(undefined)).toEqual({});
    });

    it('empties every space that has a name on an empty start', () => {
        expect(EMPTY_SPACES[1]).toEqual({ name: '' });
        expect(EMPTY_SPACES[2]).toBeUndefined();
    });
});
