import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CropMarks, NoteSheet, PanelStack, TextSheet } from './table-sheets';

describe('the printed sheets on the table', () => {
    it('puts four crop marks around what it holds', () => {
        const { container } = render(
            <CropMarks>
                <span>Proef</span>
            </CropMarks>,
        );

        expect(container.textContent).toBe('Proef');
        expect(
            container.querySelectorAll('span[aria-hidden="true"]'),
        ).toHaveLength(4);
    });

    it('lays six notes on a money sheet and four lettered panels in a stack', () => {
        const notes = render(<NoteSheet width={320} />).container;
        const panels = render(<PanelStack size={160} />).container;

        expect(notes.querySelectorAll('[data-element="banknote"]').length).toBe(
            6,
        );
        expect(panels.textContent).toContain('A');
        expect(panels.textContent).toContain('D');
    });

    it('draws a text sheet with a heading and the lines asked for', () => {
        const { container } = render(<TextSheet lines={4} />);

        expect(container.querySelectorAll('.bg-ink\\/25')).toHaveLength(4);
        expect(container.querySelector('.bg-ink')).not.toBeNull();
    });
});
