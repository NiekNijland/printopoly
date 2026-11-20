import {
    parseCardText,
    serializeToken,
    type CardTextToken,
} from '@/lib/edition/card-text';

/**
 * The editable surface of a card text (B131): text nodes with atomic chips for the variables. The
 * stored string is plain text with tokens, so reading it back is a walk over the nodes.
 */

/** How a chip looks and what a screen reader says about it. */
export interface ChipView {
    text: string;
    label: string;
    /** Marks a chip that cannot be filled in. */
    broken: boolean;
}

export type DescribeToken = (token: CardTextToken) => ChipView;

/** Keeps the caret next to a chip. It is never part of the stored text. */
const CARET_ANCHOR = '​';

const CHIP_CLASS =
    'mx-px inline-block cursor-default select-none rounded-full border-2 border-ink bg-table px-2 text-sm font-semibold leading-6 text-ink aria-[invalid=true]:border-dashed aria-[invalid=true]:border-press';

function isChip(node: Node | null): node is HTMLElement {
    return node instanceof HTMLElement && node.dataset['token'] !== undefined;
}

function isBlank(node: Node | null): boolean {
    return (
        node instanceof Text && node.data.split(CARET_ANCHOR).join('') === ''
    );
}

function paintChip(
    chip: HTMLElement,
    token: CardTextToken,
    describe: DescribeToken,
): void {
    const view = describe(token);
    chip.textContent = view.text;
    chip.setAttribute('aria-label', view.label);
    chip.setAttribute('aria-invalid', view.broken ? 'true' : 'false');
}

function createChip(
    doc: Document,
    token: CardTextToken,
    describe: DescribeToken,
): HTMLElement {
    const chip = doc.createElement('span');
    chip.contentEditable = 'false';
    chip.dataset['token'] = serializeToken(token);
    chip.setAttribute('role', 'img');
    chip.className = CHIP_CLASS;
    paintChip(chip, token, describe);

    return chip;
}

function tokenOfChip(chip: HTMLElement): CardTextToken | undefined {
    const [segment] = parseCardText(chip.dataset['token'] ?? '');

    return segment === undefined || segment.type === 'text'
        ? undefined
        : segment;
}

/** Fills the editor with a stored text. */
export function renderInto(
    root: HTMLElement,
    template: string,
    describe: DescribeToken,
): void {
    const doc = root.ownerDocument;
    const nodes: Node[] = [];

    for (const segment of parseCardText(template)) {
        if (segment.type === 'text') {
            nodes.push(doc.createTextNode(segment.text));
            continue;
        }
        if (isChip(nodes[nodes.length - 1] ?? null)) {
            nodes.push(doc.createTextNode(CARET_ANCHOR));
        }
        nodes.push(createChip(doc, segment, describe));
    }
    if (isChip(nodes[nodes.length - 1] ?? null)) {
        nodes.push(doc.createTextNode(CARET_ANCHOR));
    }
    if (template.endsWith('\n')) {
        nodes.push(doc.createElement('br'));
    }
    root.replaceChildren(...nodes);
}

/** Refreshes the names on the chips, for when a space was renamed while the text stayed. */
export function updateChips(root: HTMLElement, describe: DescribeToken): void {
    for (const chip of root.querySelectorAll<HTMLElement>('[data-token]')) {
        const token = tokenOfChip(chip);
        if (token !== undefined) {
            paintChip(chip, token, describe);
        }
    }
}

function readNode(node: Node, root: HTMLElement): string {
    if (node instanceof Text) {
        return node.data.split(CARET_ANCHOR).join('');
    }
    if (!(node instanceof HTMLElement)) {
        return '';
    }
    const token = node.dataset['token'];
    if (token !== undefined) {
        return token;
    }
    if (node.tagName === 'BR') {
        return node.parentNode === root && node === root.lastChild ? '' : '\n';
    }
    const inner = [...node.childNodes]
        .map((child) => readNode(child, root))
        .join('');

    return node.tagName === 'DIV' || node.tagName === 'P'
        ? `\n${inner}`
        : inner;
}

/** The stored text of what is in the editor. */
export function readFrom(root: HTMLElement): string {
    const text = [...root.childNodes]
        .map((child) => readNode(child, root))
        .join('');

    // A block the browser added in front of the first line is not a line break.
    return root.firstElementChild instanceof HTMLElement &&
        ['DIV', 'P'].includes(root.firstElementChild.tagName) &&
        root.firstChild === root.firstElementChild
        ? text.replace(/^\n/, '')
        : text;
}

function selectionRange(root: HTMLElement): Range | null {
    const selection = root.ownerDocument.getSelection();
    if (selection === null || selection.rangeCount === 0) {
        return null;
    }
    const range = selection.getRangeAt(0);

    return root.contains(range.startContainer) ? range : null;
}

function placeCaret(root: HTMLElement, range: Range): void {
    const selection = root.ownerDocument.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
}

/** The node on the given side of the caret, looking past empty text. `null` when the caret is mid-text. */
function neighbour(
    range: Range,
    direction: 'before' | 'after',
): Node | null | undefined {
    const { startContainer: container, startOffset: offset } = range;
    let node: Node | null;

    if (container instanceof Text) {
        const data = container.data;
        let i = offset;
        if (direction === 'before') {
            while (i > 0 && data[i - 1] === CARET_ANCHOR) {
                i--;
            }
            if (i > 0) {
                return undefined;
            }
            node = container.previousSibling;
        } else {
            while (i < data.length && data[i] === CARET_ANCHOR) {
                i++;
            }
            if (i < data.length) {
                return undefined;
            }
            node = container.nextSibling;
        }
    } else {
        node =
            direction === 'before'
                ? (container.childNodes[offset - 1] ?? null)
                : (container.childNodes[offset] ?? null);
    }
    while (node !== null && isBlank(node)) {
        node = direction === 'before' ? node.previousSibling : node.nextSibling;
    }

    return node;
}

/**
 * Backspace and Delete next to a chip remove the whole chip. Returns whether it did, so the caller
 * can stop the browser from doing its own edit.
 */
export function deleteChipAtCaret(
    root: HTMLElement,
    key: 'Backspace' | 'Delete',
): boolean {
    const range = selectionRange(root);
    if (range === null || !range.collapsed) {
        return false;
    }
    const target =
        neighbour(range, key === 'Backspace' ? 'before' : 'after') ?? null;
    if (!isChip(target)) {
        return false;
    }
    const parent = target.parentNode;
    if (parent === null) {
        return false;
    }
    const at = [...parent.childNodes].indexOf(target);
    target.remove();
    const caret = root.ownerDocument.createRange();
    caret.setStart(parent, at);
    caret.collapse(true);
    placeCaret(root, caret);

    return true;
}

/** Puts a token where the caret is (or at `fallback`, or the end) and the caret after it. */
export function insertToken(
    root: HTMLElement,
    token: CardTextToken,
    describe: DescribeToken,
    fallback: Range | null = null,
): void {
    const doc = root.ownerDocument;
    let range = selectionRange(root) ?? fallback;
    if (range === null || !root.contains(range.startContainer)) {
        range = doc.createRange();
        range.selectNodeContents(root);
        range.collapse(false);
    }
    range.deleteContents();

    const chip = createChip(doc, token, describe);
    const after = doc.createTextNode(CARET_ANCHOR);
    range.insertNode(chip);
    chip.after(after);
    if (isChip(chip.previousSibling)) {
        chip.before(doc.createTextNode(CARET_ANCHOR));
    }
    const caret = doc.createRange();
    caret.setStart(after, 1);
    caret.collapse(true);
    placeCaret(root, caret);
}

/** Inserts plain text at the caret: for paste and for Enter. */
export function insertPlainText(root: HTMLElement, text: string): void {
    const doc = root.ownerDocument;
    let range = selectionRange(root);
    if (range === null) {
        range = doc.createRange();
        range.selectNodeContents(root);
        range.collapse(false);
    }
    range.deleteContents();
    const node = doc.createTextNode(text);
    range.insertNode(node);
    // Browsers show a line break at the very end only when something follows it.
    if (text.endsWith('\n') && node.nextSibling === null) {
        root.append(doc.createElement('br'));
    }
    const caret = doc.createRange();
    caret.setStart(node, node.length);
    caret.collapse(true);
    placeCaret(root, caret);
}
