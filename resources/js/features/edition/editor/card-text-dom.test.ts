import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CardTextToken } from '@/lib/render/edition-card-text';
import {
    deleteAcrossAnchor,
    deleteChipAtCaret,
    deleteSelection,
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

const textOf = (node: Node | null | undefined): Text => {
    if (!(node instanceof Text)) {
        throw new Error('expected a text node');
    }

    return node;
};

const caretAt = (node: Node, offset: number): void => {
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
};

beforeEach(() => {
    root = document.createElement('div');
    root.contentEditable = 'true';
    document.body.append(root);
});

afterEach(() => {
    root.remove();
});

const select = (
    start: Node,
    startOffset: number,
    end: Node,
    endOffset: number,
): void => {
    const range = document.createRange();
    range.setStart(start, startOffset);
    range.setEnd(end, endOffset);
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
};

describe('deleting a selection over chips (bug 5, ronde 4)', () => {
    it('empties the field when everything is selected and deleted, chips too', () => {
        renderInto(root, '{space:24} betaal {space:39}', describe_);
        const chips = root.querySelectorAll('[data-token]');
        // Safari put the ends of a select-all inside the chips' own text.
        select(
            textOf(chips[0]?.firstChild),
            3,
            textOf(chips[1]?.firstChild),
            4,
        );

        expect(deleteSelection(root)).toBe(true);
        expect(readFrom(root)).toBe('');
        expect(root.querySelector('[data-token]')).toBeNull();
    });

    it('takes a chip that is half selected out whole, and keeps the rest', () => {
        renderInto(root, 'Ga naar {space:24} nu.', describe_);
        const chip = root.querySelector('[data-token]');
        select(textOf(root.firstChild), 3, textOf(chip?.firstChild), 2);

        expect(deleteSelection(root)).toBe(true);
        expect(readFrom(root)).toBe('Ga  nu.');
    });

    it('does nothing with only a caret', () => {
        renderInto(root, 'Ga naar {space:24}.', describe_);
        caretAt(textOf(root.firstChild), 2);

        expect(deleteSelection(root)).toBe(false);
        expect(readFrom(root)).toBe('Ga naar {space:24}.');
    });
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
        const anchor = textOf(root.lastChild);
        caretAt(anchor, anchor.length);

        expect(deleteChipAtCaret(root, 'Backspace')).toBe(true);
        expect(readFrom(root)).toBe('Naar ');
    });

    it('removes the whole chip with Delete before it', () => {
        renderInto(root, 'Naar {space:24} toe', describe_);
        const before = textOf(root.firstChild);
        caretAt(before, before.length);

        expect(deleteChipAtCaret(root, 'Delete')).toBe(true);
        expect(readFrom(root)).toBe('Naar  toe');
    });

    it('leaves Backspace alone in the middle of text', () => {
        renderInto(root, 'Naar {space:24} toe', describe_);
        const after = textOf(root.lastChild);
        caretAt(after, 3);

        expect(deleteChipAtCaret(root, 'Backspace')).toBe(false);
        expect(readFrom(root)).toBe('Naar {space:24} toe');
    });

    it('steps over a chip standing against another chip', () => {
        renderInto(root, '{space:24}{space:39}', describe_);
        const anchor = textOf(root.lastChild);
        caretAt(anchor, 1);

        expect(deleteChipAtCaret(root, 'Backspace')).toBe(true);
        expect(readFrom(root)).toBe('{space:24}');
        expect(deleteChipAtCaret(root, 'Backspace')).toBe(true);
        expect(readFrom(root)).toBe('');
    });

    it('inserts a chip at the caret and puts the caret behind it', () => {
        renderInto(root, 'Naar  toe', describe_);
        const text = textOf(root.firstChild);
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
        caretAt(textOf(root.firstChild), 1);

        insertPlainText(root, '\n');

        expect(readFrom(root)).toBe('a\nb');
    });

    // Bug 10 (ronde 3): Enter, type, Enter, type glued every other line onto the one before, because Chrome
    // moved a caret that sat right after a line break with nothing behind it back to the line before.
    it('keeps the caret on the new line after Enter at the end, every time', () => {
        renderInto(root, 'Regel een', describe_);

        for (const line of ['twee', 'drie', 'vier']) {
            const text = textOf(root.lastChild);
            caretAt(text, text.length);
            insertPlainText(root, '\n');

            const caret = document.getSelection()?.getRangeAt(0);
            const node = textOf(caret?.startContainer);
            // The caret sits behind an anchor on the new line, never directly after the line break.
            expect(node.data.slice(0, caret?.startOffset)).toBe('\n​');
            node.insertData(caret?.startOffset ?? 0, line);
        }

        expect(readFrom(root)).toBe('Regel een\ntwee\ndrie\nvier');
    });

    it('removes a line break with one Backspace, anchor included', () => {
        renderInto(root, 'Zes', describe_);
        const text = textOf(root.lastChild);
        caretAt(text, text.length);
        insertPlainText(root, '\n');

        expect(deleteAcrossAnchor(root, 'Backspace')).toBe(true);
        expect(readFrom(root)).toBe('Zes');
    });

    it('leaves Backspace to the browser when no anchor is in the way', () => {
        renderInto(root, 'Zes', describe_);
        caretAt(textOf(root.lastChild), 3);

        expect(deleteAcrossAnchor(root, 'Backspace')).toBe(false);
        expect(readFrom(root)).toBe('Zes');
    });
});
