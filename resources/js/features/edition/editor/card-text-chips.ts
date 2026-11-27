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
export const CARET_ANCHOR = '​';

const CHIP_CLASS =
    'mx-px inline-block cursor-default select-none rounded-full border-2 border-ink bg-table px-2 text-sm font-semibold leading-6 text-ink aria-[invalid=true]:border-dashed aria-[invalid=true]:border-press';

export const chipOf = (node: Node | null): HTMLElement | null => {
    return node instanceof HTMLElement && node.dataset['token'] !== undefined
        ? node
        : null;
};

export const isChip = (node: Node | null): boolean => chipOf(node) !== null;

export const isBlank = (node: Node | null): boolean => {
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

export const createChip = (
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
