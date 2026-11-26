import {
    parseCardText,
    serializeToken,
    type CardTextToken,
} from '@/lib/render/edition-card-text';

/**
 * The editable surface of a card text (B131): text nodes with atomic chips for the variables. The
 * stored string is plain text with tokens, so reading it back is a walk over the nodes.
 */

/** How a chip looks and what a screen reader says about it. */
export type ChipView = {
    text: string;
    label: string;
    /** Marks a chip that cannot be filled in. */
    broken: boolean;
};

export type DescribeToken = (token: CardTextToken) => ChipView;

/** Keeps the caret next to a chip. It is never part of the stored text. */
const CARET_ANCHOR = '​';

const CHIP_CLASS =
    'mx-px inline-block cursor-default select-none rounded-full border-2 border-ink bg-table px-2 text-sm font-semibold leading-6 text-ink aria-[invalid=true]:border-dashed aria-[invalid=true]:border-press';

const isChip = (node: Node | null): node is HTMLElement => {
    return node instanceof HTMLElement && node.dataset['token'] !== undefined;
};

const isBlank = (node: Node | null): boolean => {
    return (
        node instanceof Text && node.data.split(CARET_ANCHOR).join('') === ''
    );
};

const paintChip = (
    chip: HTMLElement,
    token: CardTextToken,
    describe: DescribeToken,
): void => {
    const view = describe(token);
    chip.textContent = view.text;
    chip.setAttribute('aria-label', view.label);
    chip.setAttribute('aria-invalid', view.broken ? 'true' : 'false');
};

const createChip = (
    doc: Document,
    token: CardTextToken,
    describe: DescribeToken,
): HTMLElement => {
    const chip = doc.createElement('span');
    chip.contentEditable = 'false';
    chip.dataset['token'] = serializeToken(token);
    chip.setAttribute('role', 'img');
    chip.className = CHIP_CLASS;
    paintChip(chip, token, describe);

    return chip;
};

const tokenOfChip = (chip: HTMLElement): CardTextToken | undefined => {
    const [segment] = parseCardText(chip.dataset['token'] ?? '');

    return segment === undefined || segment.type === 'text'
        ? undefined
        : segment;
};

/** Fills the editor with a stored text. */
export const renderInto = (
    root: HTMLElement,
    template: string,
    describe: DescribeToken,
): void => {
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
};

/** Refreshes the names on the chips, for when a space was renamed while the text stayed. */
export const updateChips = (
    root: HTMLElement,
    describe: DescribeToken,
): void => {
    for (const chip of root.querySelectorAll<HTMLElement>('[data-token]')) {
        const token = tokenOfChip(chip);
        if (token !== undefined) {
            paintChip(chip, token, describe);
        }
    }
};

const readNode = (node: Node, root: HTMLElement): string => {
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
};

/** The stored text of what is in the editor. */
export const readFrom = (root: HTMLElement): string => {
    const text = [...root.childNodes]
        .map((child) => readNode(child, root))
        .join('');

    // A block the browser added in front of the first line is not a line break.
    return root.firstElementChild instanceof HTMLElement &&
        ['DIV', 'P'].includes(root.firstElementChild.tagName) &&
        root.firstChild === root.firstElementChild
        ? text.replace(/^\n/, '')
        : text;
};

const selectionRange = (root: HTMLElement): Range | null => {
    const selection = root.ownerDocument.getSelection();
    if (selection === null || selection.rangeCount === 0) {
        return null;
    }
    const range = selection.getRangeAt(0);

    return root.contains(range.startContainer) ? range : null;
};

const placeCaret = (root: HTMLElement, range: Range): void => {
    const selection = root.ownerDocument.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
};

/** The node on the given side of the caret, looking past empty text. `null` when the caret is mid-text. */
const neighbour = (
    range: Range,
    direction: 'before' | 'after',
): Node | null | undefined => {
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
};

/** The chip a node sits in (its own text), or `null`. */
const chipAround = (node: Node, root: HTMLElement): HTMLElement | null => {
    for (
        let at: Node | null = node;
        at !== null && at !== root;
        at = at.parentNode
    ) {
        if (isChip(at)) {
            return at;
        }
    }

    return null;
};

/**
 * Widens a selection that starts or ends inside a chip to the whole chip, so deleting it never leaves half a
 * chip behind ("Sta", a bare "€") that then reads back as text (bug 5, ronde 4).
 */
const coverChips = (range: Range, root: HTMLElement): void => {
    const start = chipAround(range.startContainer, root);
    if (start !== null) {
        range.setStartBefore(start);
    }
    const end = chipAround(range.endContainer, root);
    if (end !== null) {
        range.setEndAfter(end);
    }
};

/**
 * Backspace, Delete, cut or typing over a selection: removes the selected text and every chip it touches,
 * whole. Returns whether there was a selection to remove, so the caller can stop the browser's own edit,
 * which in Safari split chips and left the rest in the stored text (bug 5, ronde 4).
 */
export const deleteSelection = (root: HTMLElement): boolean => {
    const range = selectionRange(root);
    if (
        range === null ||
        range.collapsed ||
        !root.contains(range.endContainer)
    ) {
        return false;
    }
    coverChips(range, root);
    range.deleteContents();
    if (readFrom(root) === '') {
        root.replaceChildren();
    }
    const caret = root.ownerDocument.createRange();
    if (root.contains(range.startContainer)) {
        caret.setStart(range.startContainer, range.startOffset);
    } else {
        caret.selectNodeContents(root);
    }
    caret.collapse(true);
    placeCaret(root, caret);

    return true;
};

/**
 * Backspace and Delete next to a chip remove the whole chip. Returns whether it did, so the caller
 * can stop the browser from doing its own edit.
 */
export const deleteChipAtCaret = (
    root: HTMLElement,
    key: 'Backspace' | 'Delete',
): boolean => {
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
};

/** Puts a token where the caret is (or at `fallback`, or the end) and the caret after it. */
export const insertToken = (
    root: HTMLElement,
    token: CardTextToken,
    describe: DescribeToken,
    fallback: Range | null = null,
): void => {
    const doc = root.ownerDocument;
    let range = selectionRange(root) ?? fallback;
    if (range === null || !root.contains(range.startContainer)) {
        range = doc.createRange();
        range.selectNodeContents(root);
        range.collapse(false);
    }
    coverChips(range, root);
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
};

/**
 * Inserts plain text at the caret: for paste and for Enter. A text that ends in a line break gets a caret
 * anchor after it, and the caret goes behind the anchor (bug 10, ronde 3). Without it Chrome put a caret
 * that sits right after a line break with nothing behind it back at the end of the line before, so every
 * other Enter glued the next line onto the previous one.
 */
export const insertPlainText = (root: HTMLElement, text: string): void => {
    const doc = root.ownerDocument;
    let range = selectionRange(root);
    if (range === null) {
        range = doc.createRange();
        range.selectNodeContents(root);
        range.collapse(false);
    }
    coverChips(range, root);
    range.deleteContents();
    const node = doc.createTextNode(
        text.endsWith('\n') ? `${text}${CARET_ANCHOR}` : text,
    );
    range.insertNode(node);
    const caret = doc.createRange();
    caret.setStart(node, node.length);
    caret.collapse(true);
    placeCaret(root, caret);
};

const isLowSurrogate = (code: number): boolean => {
    return code >= 0xdc00 && code <= 0xdfff;
};

/**
 * Backspace or Delete next to a caret anchor: takes the anchor away together with the character the person
 * sees, in one key press. Returns whether it did, so the caller can stop the browser (which would put the
 * caret back at the end of the line before and delete the wrong character, bug 10).
 */
export const deleteAcrossAnchor = (
    root: HTMLElement,
    key: 'Backspace' | 'Delete',
): boolean => {
    const range = selectionRange(root);
    if (
        range === null ||
        !range.collapsed ||
        !(range.startContainer instanceof Text)
    ) {
        return false;
    }
    const node = range.startContainer;
    const data = node.data;
    let from = range.startOffset;
    let to = range.startOffset;
    if (key === 'Backspace') {
        while (from > 0 && data[from - 1] === CARET_ANCHOR) {
            from--;
        }
        if (from === to || from === 0) {
            return false;
        }
        from -= isLowSurrogate(data.charCodeAt(from - 1)) && from > 1 ? 2 : 1;
    } else {
        while (to < data.length && data[to] === CARET_ANCHOR) {
            to++;
        }
        if (from === to || to === data.length) {
            return false;
        }
        to += isLowSurrogate(data.charCodeAt(to + 1)) ? 2 : 1;
    }
    node.deleteData(from, to - from);
    const caret = root.ownerDocument.createRange();
    caret.setStart(node, from);
    caret.collapse(true);
    placeCaret(root, caret);

    return true;
};
