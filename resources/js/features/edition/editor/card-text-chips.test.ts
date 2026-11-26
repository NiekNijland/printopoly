import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CardTextToken } from '@/lib/render/edition-card-text';

import {
    readFrom,
    renderInto,
    updateChips,
    type ChipView,
} from './card-text-chips';

const names: Record<number, string> = { 24: 'Jalinkhof', 39: 'Kroonplein' };

const describe_ = (token: CardTextToken): ChipView =>
    token.type === 'space'
        ? {
              text: names[token.position] ?? '',
              label: `Straat: ${names[token.position] ?? ''}`,
              broken: false,
          }
        : { text: '?', label: 'Onbekend', broken: token.type === 'unknown' };

let root: HTMLDivElement;

beforeEach(() => {
    root = document.createElement('div');
    root.contentEditable = 'true';
    document.body.append(root);
});

afterEach(() => {
    root.remove();
});

describe('card text chips', () => {
    it('shows a token as an atomic chip with a screen reader label', () => {
        renderInto(root, 'Ga naar {space:24}.', describe_);

        const chip = root.querySelector<HTMLElement>('[data-token]');

        expect(chip?.textContent).toBe('Jalinkhof');
        expect(chip?.getAttribute('aria-label')).toBe('Straat: Jalinkhof');
        expect(chip?.contentEditable).toBe('false');
        expect(chip?.getAttribute('role')).toBe('img');
    });

    it('reads the stored text back, tokens included', () => {
        for (const text of [
            '',
            'plain',
            'Ga naar {space:24}.',
            '{space:24}{space:39}',
            'a\nb {foo}',
            '{space:24}',
            'regel\n',
        ]) {
            renderInto(root, text, describe_);

            expect(readFrom(root)).toBe(text);
        }
    });

    it('refreshes the names on the chips without touching the text', () => {
        renderInto(root, 'Naar {space:24}', describe_);
        names[24] = 'Hernoemd';
        updateChips(root, describe_);

        expect(root.querySelector('[data-token]')?.textContent).toBe(
            'Hernoemd',
        );
        expect(readFrom(root)).toBe('Naar {space:24}');
        names[24] = 'Jalinkhof';
    });

    it('reads blocks the browser added as lines, but not the first one', () => {
        root.innerHTML = '<div>een</div><div>twee<br></div><p>drie</p>';

        expect(readFrom(root)).toBe('een\ntwee\n\ndrie');
    });

    it('marks a token that cannot be filled in', () => {
        renderInto(root, '{nonsense}', describe_);

        expect(
            root.querySelector('[data-token]')?.getAttribute('aria-invalid'),
        ).toBe('true');
    });
});
