/**
 * The editor's keyboard shortcuts in one place: the handler, the "Sneltoetsen" dialog and the
 * tooltips (`title`, `aria-keyshortcuts`) all read this list so they cannot drift apart.
 *
 * Single letters can clash with screen readers, so they can be switched off (WCAG 2.1.4). The
 * shortcuts with a modifier, F2, Enter on the page itself and `?` stay on.
 */
export type ShortcutId =
    | 'help'
    | 'next'
    | 'previous'
    | 'check'
    | 'focusName'
    | 'photo'
    | 'rotate'
    | 'grayscale'
    | 'paste'
    | 'swap'
    | 'preview'
    | 'edition'
    | 'zoomIn'
    | 'zoomOut'
    | 'tabs'
    | 'nudge'
    | 'undo'
    | 'redo'
    | 'save'
    | 'print'
    | 'close';

export type ShortcutGroup = 'navigate' | 'photo' | 'edit' | 'general';

export interface ShortcutDefinition {
    id: ShortcutId;
    group: ShortcutGroup;
    /** Key labels as shown; `Mod` becomes Ctrl or Cmd. Alternatives are separate entries. */
    keys: string[][];
    /** The WAI-ARIA `aria-keyshortcuts` value (`Control+Z`, space separated alternatives). */
    aria: string;
}

export const SHORTCUTS: ShortcutDefinition[] = [
    { id: 'next', group: 'navigate', keys: [['J'], [']']], aria: 'J ]' },
    { id: 'previous', group: 'navigate', keys: [['K'], ['[']], aria: 'K [' },
    {
        id: 'tabs',
        group: 'navigate',
        keys: [['1…4'], ['Alt', '1…4']],
        aria: '1 2 3 4 Alt+1 Alt+2 Alt+3 Alt+4',
    },
    { id: 'check', group: 'navigate', keys: [['C']], aria: 'C' },
    {
        id: 'focusName',
        group: 'navigate',
        keys: [['F2'], ['Enter']],
        aria: 'F2 Enter',
    },
    { id: 'photo', group: 'photo', keys: [['P']], aria: 'P' },
    { id: 'rotate', group: 'photo', keys: [['R']], aria: 'R' },
    { id: 'grayscale', group: 'photo', keys: [['B']], aria: 'B' },
    { id: 'preview', group: 'navigate', keys: [['V']], aria: 'V' },
    { id: 'edition', group: 'navigate', keys: [['E']], aria: 'E' },
    {
        id: 'swap',
        group: 'navigate',
        keys: [['W']],
        aria: 'W',
    },
    {
        id: 'paste',
        group: 'photo',
        keys: [['Mod', 'V']],
        aria: 'Control+V Meta+V',
    },
    { id: 'zoomIn', group: 'photo', keys: [['+']], aria: '+ =' },
    { id: 'zoomOut', group: 'photo', keys: [['−']], aria: '-' },
    {
        id: 'nudge',
        group: 'photo',
        keys: [['←', '↑', '→', '↓']],
        aria: 'ArrowLeft ArrowUp ArrowRight ArrowDown',
    },
    {
        id: 'undo',
        group: 'edit',
        keys: [['Mod', 'Z']],
        aria: 'Control+Z Meta+Z',
    },
    {
        id: 'redo',
        group: 'edit',
        keys: [
            ['Mod', 'Shift', 'Z'],
            ['Ctrl', 'Y'],
        ],
        aria: 'Control+Shift+Z Meta+Shift+Z Control+Y',
    },
    {
        id: 'save',
        group: 'general',
        keys: [['Mod', 'S']],
        aria: 'Control+S Meta+S',
    },
    {
        id: 'print',
        group: 'general',
        keys: [['Mod', 'P']],
        aria: 'Control+P Meta+P',
    },
    { id: 'help', group: 'general', keys: [['?']], aria: 'Shift+/' },
    { id: 'close', group: 'general', keys: [['Esc']], aria: 'Escape' },
];

const BY_ID = new Map(SHORTCUTS.map((shortcut) => [shortcut.id, shortcut]));

/** True on Apple platforms, where the modifier is Cmd instead of Ctrl. */
function isApple(): boolean {
    return (
        typeof navigator !== 'undefined' &&
        /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
    );
}

export function keyLabel(key: string): string {
    if (key === 'Mod') {
        return isApple() ? '⌘' : 'Ctrl';
    }
    if (key === 'Shift' && isApple()) {
        return '⇧';
    }

    return key;
}

/** The keys of a shortcut for running text: `Ctrl+V` or `⌘V`. */
export function shortcutKeys(id: ShortcutId): string {
    return shortcutText(id);
}

/** `Ctrl+Z`-style text for tooltips: the first combination of the shortcut. */
function shortcutText(id: ShortcutId): string {
    const first = BY_ID.get(id)?.keys[0] ?? [];

    return first.map(keyLabel).join(isApple() ? '' : '+');
}

/** Props for a control: `title` gets the shortcut after the label, plus `aria-keyshortcuts`. */
export function shortcutProps(
    id: ShortcutId,
    label?: string,
): { title?: string; 'aria-keyshortcuts': string } {
    return {
        ...(label === undefined
            ? {}
            : { title: `${label} (${shortcutText(id)})` }),
        'aria-keyshortcuts': BY_ID.get(id)?.aria ?? '',
    };
}

const NON_TYPING_INPUTS = [
    'checkbox',
    'radio',
    'range',
    'button',
    'submit',
    'file',
    'color',
];

/** A typing target: text-like inputs, textareas, selects and editable content. */
export function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }
    if (target.isContentEditable) {
        return true;
    }
    if (target instanceof HTMLInputElement) {
        return !NON_TYPING_INPUTS.includes(target.type);
    }

    return target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
}

/** Enter on these does its own thing (press, follow); it must not jump to the name field. */
export function isInteractiveTarget(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLElement &&
        target.closest(
            'a[href], button, input, select, textarea, summary, [role="button"], [role="tab"], [role="option"], [role="menuitem"], [tabindex="0"]',
        ) !== null
    );
}

const PLAIN_KEY = 'printopoly.shortcuts.plain';

export function readPlainEnabled(): boolean {
    try {
        return window.localStorage.getItem(PLAIN_KEY) !== 'off';
    } catch {
        return true;
    }
}

export function writePlainEnabled(enabled: boolean): void {
    try {
        window.localStorage.setItem(PLAIN_KEY, enabled ? 'on' : 'off');
    } catch {
        // Storage can be blocked; the setting then lasts until the page closes.
    }
}

export type ShortcutAction =
    { type: Exclude<ShortcutId, 'tabs'> } | { type: 'tab'; index: number };

/**
 * Map a key press to an action, or null. Pure, so it is easy to test; the caller decides what
 * to do and whether a dialog blocks it.
 */
export function actionForKey(
    event: Pick<
        KeyboardEvent,
        'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'
    >,
    options: { plain: boolean; typing: boolean; interactive: boolean },
): ShortcutAction | null {
    const mod = event.ctrlKey || event.metaKey;
    const letter = event.key.toLowerCase();

    if (mod && !event.altKey) {
        if (letter === 's' && !event.shiftKey) {
            return { type: 'save' };
        }
        if (letter === 'p' && !event.shiftKey) {
            return { type: 'print' };
        }

        return null;
    }
    if (event.altKey && !mod && /^Digit[1-9]$/.test(event.code)) {
        return { type: 'tab', index: Number(event.code.slice(5)) - 1 };
    }
    if (event.altKey || options.typing) {
        return null;
    }
    if (event.key === 'F2') {
        return { type: 'focusName' };
    }
    if (event.key === '?') {
        return { type: 'help' };
    }
    if (event.key === 'Enter' && !event.shiftKey && !options.interactive) {
        return { type: 'focusName' };
    }
    if (!options.plain || (event.shiftKey && event.key !== '+')) {
        return null;
    }
    if (/^[1-9]$/.test(event.key)) {
        return { type: 'tab', index: Number(event.key) - 1 };
    }
    switch (letter) {
        case 'j':
        case ']':
            return { type: 'next' };
        case 'k':
        case '[':
            return { type: 'previous' };
        case 'c':
            return { type: 'check' };
        case 'v':
            return { type: 'preview' };
        case 'e':
            return { type: 'edition' };
        case 'p':
            return { type: 'photo' };
        case 'r':
            return { type: 'rotate' };
        case 'b':
            return { type: 'grayscale' };
        case '+':
        case '=':
            return { type: 'zoomIn' };
        case '-':
        case '_':
            return { type: 'zoomOut' };
        default:
            return null;
    }
}

/**
 * Escape leaves any text field, and Enter leaves a single-line one, so the keys that follow (J, K, 1 to 4)
 * are shortcuts again instead of text. Focus goes back to the selected space of the board, or just away
 * from the field when the board is not on screen. Returns true when the key was used.
 */
export function leaveField(event: KeyboardEvent): boolean {
    const target = event.target;

    if (!(target instanceof HTMLElement) || !isTypingTarget(target)) {
        return false;
    }

    const singleLine =
        target instanceof HTMLInputElement &&
        !NON_TYPING_INPUTS.includes(target.type);
    const escape = event.key === 'Escape';
    const enter =
        event.key === 'Enter' &&
        singleLine &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey;

    if (!escape && !enter) {
        return false;
    }

    event.preventDefault();
    target.blur();

    const cell = [
        ...document.querySelectorAll<HTMLElement>('[data-key][tabindex="0"]'),
    ].find((candidate) => candidate.offsetParent !== null);

    cell?.focus();

    return true;
}
