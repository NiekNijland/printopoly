import { fireEvent, screen } from '@testing-library/react';

import { makeEdition } from '@/testing/edition-test-utils';
import { renderWithI18n } from '@/testing/render';

import { PrintHeader } from './print-header';

describe('PrintHeader', () => {
    it('names the edition, links back and switches the set (B185, B199)', () => {
        const onSet = vi.fn();
        renderWithI18n(
            <PrintHeader
                edition={makeEdition({ id: 'e1' })}
                photos={new Map()}
                editorHref="/nl/editor/e1"
                name="Zaterdagclub"
                parts={5}
                cards={60}
                set="home"
                onSet={onSet}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Zaterdagclub printen' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /Terug naar de editor/ }),
        ).toHaveAttribute('href', '/nl/editor/e1');
        expect(screen.getAllByRole('tab')[0]).toHaveAccessibleName(
            'Thuisprint-set',
        );
        const printer = screen.getByRole('tab', { name: 'Drukkerij-set' });
        fireEvent.mouseDown(printer);
        fireEvent.click(printer);
        expect(onSet).toHaveBeenCalledWith('printer');
    });

    it('says only print without a name', () => {
        renderWithI18n(
            <PrintHeader
                edition={makeEdition({ id: 'e1' })}
                photos={new Map()}
                editorHref="/nl/editions"
                name=""
                parts={0}
                cards={0}
                set="printer"
                onSet={vi.fn()}
            />,
        );

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Hoe ga je printen?',
        );
    });
});
