import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import EditorLayout from '@/features/edition/editor/editor-layout';
import { mediaQueryList } from '@/testing/media-query';
import { renderWithI18n } from '@/testing/render';

const shell = (): HTMLElement => {
    const main = screen.getByRole('main');
    if (main.parentElement === null) {
        throw new Error('no shell');
    }

    return main.parentElement;
};

describe('EditorLayout', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('puts the header with the edition name above the workspace', () => {
        renderWithI18n(
            <EditorLayout editionName="Zaterdagclub">
                <p>Werkblad</p>
            </EditorLayout>,
        );
        const main = screen.getByRole('main');

        expect(screen.getAllByText('Zaterdagclub')).not.toHaveLength(0);
        expect(main).toHaveAttribute('id', 'content');
        expect(main).toHaveClass('overflow-clip');
        expect(main).toHaveTextContent('Werkblad');
        expect(shell()).toHaveClass('h-dvh');
        expect(shell()).not.toHaveAttribute('data-keyboard');
        expect(shell().style.height).toBe('');
    });

    it('shrinks to the visible height while an on-screen keyboard is open', () => {
        const viewport = Object.assign(new EventTarget(), {
            height: 800,
            offsetTop: 0,
        });
        vi.stubGlobal('visualViewport', viewport);
        vi.stubGlobal('innerHeight', 800);
        vi.stubGlobal('matchMedia', (query: string) =>
            mediaQueryList(query, true),
        );
        renderWithI18n(
            <EditorLayout editionName="Zaterdagclub">Werkblad</EditorLayout>,
        );

        Object.assign(viewport, { height: 420 });
        act(() => {
            viewport.dispatchEvent(new Event('resize'));
        });

        expect(shell()).toHaveAttribute('data-keyboard', 'open');
        expect(shell().style.height).toBe('420px');
    });
});
