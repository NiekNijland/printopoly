import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CardTextToken } from '@/lib/edition/card-text';
import {
    deleteChipAtCaret,
    insertPlainText,
    insertToken,
    readFrom,
    renderInto,
    updateChips,
    type ChipView,
} from './card-text-dom';

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

function caretAt(node: Node, offset: number): void {
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
}

beforeEach(() => {
    root = document.createElement('div');
    root.contentEditable = 'true';
    document.body.append(root);
});

afterEach(() => {
    root.remove();
});

describe('card text surface', () => {
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

    it('removes the whole chip with Backspace after it', () => {
        renderInto(root, 'Naar {space:24}', describe_);
        const anchor = root.lastChild as Text;
        caretAt(anchor, anchor.length);

        expect(deleteChipAtCaret(root, 'Backspace')).toBe(true);
        expect(readFrom(root)).toBe('Naar ');
    });

    it('removes the whole chip with Delete before it', () => {
        renderInto(root, 'Naar {space:24} toe', describe_);
        const before = root.firstChild as Text;
        caretAt(before, before.length);

        expect(deleteChipAtCaret(root, 'Delete')).toBe(true);
        expect(readFrom(root)).toBe('Naar  toe');
    });

    it('leaves Backspace alone in the middle of text', () => {
        renderInto(root, 'Naar {space:24} toe', describe_);
        const after = root.lastChild as Text;
        caretAt(after, 3);

        expect(deleteChipAtCaret(root, 'Backspace')).toBe(false);
        expect(readFrom(root)).toBe('Naar {space:24} toe');
    });

    it('steps over a chip standing against another chip', () => {
        renderInto(root, '{space:24}{space:39}', describe_);
        const anchor = root.lastChild as Text;
        caretAt(anchor, 1);

        expect(deleteChipAtCaret(root, 'Backspace')).toBe(true);
        expect(readFrom(root)).toBe('{space:24}');
        expect(deleteChipAtCaret(root, 'Backspace')).toBe(true);
        expect(readFrom(root)).toBe('');
    });

    it('inserts a chip at the caret and puts the caret behind it', () => {
        renderInto(root, 'Naar  toe', describe_);
        const text = root.firstChild as Text;
        caretAt(text, 5);

        insertToken(root, { type: 'space', position: 39 }, describe_);

        expect(readFrom(root)).toBe('Naar {space:39} toe');

        insertPlainText(root, 'X');

        expect(readFrom(root)).toBe('Naar {space:39}X toe');
    });

    it('inserts at the end when there is no caret in the field', () => {
        renderInto(root, 'Naar ', describe_);
        document.getSelection()?.removeAllRanges();

        insertToken(root, { type: 'currency' }, describe_);

        expect(readFrom(root)).toBe('Naar {currency}');
    });

    it('inserts plain text and line breaks', () => {
        renderInto(root, 'ab', describe_);
        caretAt(root.firstChild as Text, 1);

        insertPlainText(root, '\n');

        expect(readFrom(root)).toBe('a\nb');
    });
});
