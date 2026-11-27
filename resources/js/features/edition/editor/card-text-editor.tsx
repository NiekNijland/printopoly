import {
    useCallback,
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
    type ClipboardEvent,
    type KeyboardEvent,
    type RefObject,
} from 'react';

import { Button } from '@/components/ui/button';
import {
    readFrom,
    renderInto,
    updateChips,
    type ChipView,
} from '@/features/edition/editor/card-text-chips';
import {
    deleteChipAtCaret,
    deleteAcrossAnchor,
    deleteSelection,
    insertPlainText,
    insertToken,
} from '@/features/edition/editor/card-text-dom';
import { CardTextInsertDialog } from '@/features/edition/editor/card-text-insert-dialog';
import { describeToken } from '@/features/edition/editor/card-text-tokens';
import { StandardButton } from '@/features/edition/editor/panel/panel-parts';
import { useTranslation } from '@/hooks/use-translation';
import type { CardTextToken } from '@/lib/render/edition-card-text';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import { cn } from '@/lib/utils';

export type CardTextEditorProps = {
    label: string;
    /** The stored text, with variables. */
    value: string;
    onChange: (text: string) => void;
    resolved: ResolvedEdition;
    /** Amount of the card, when it has one. */
    amount: number | undefined;
    invalid?: boolean;
    /** Shows the "Standaard" button in the label: the text differs from the standard card (B142). */
    onStandard?: () => void;
    /** The line under the field; by default how the variables work on a card. */
    hint?: string;
    /** Offers the amount of the card as a variable; a text without an amount, such as the house rules, has none. */
    withAmount?: boolean;
};

const useBlockFormatting = (
    root: RefObject<HTMLDivElement | null>,
    emitRef: RefObject<() => void>,
): void => {
    // No bold or italic in a card text. React's onBeforeInput is Chrome's textInput event, which has no
    // inputType, so listen to the native beforeinput event instead.
    useEffect(() => {
        const element = root.current;
        if (element === null) {
            return undefined;
        }
        const blockFormatting = (event: InputEvent): void => {
            if (event.inputType.startsWith('format')) {
                event.preventDefault();
            } else if (
                // A selection that is deleted or typed over goes through our own code, also on a touch
                // keyboard that sends no Backspace key: the browser split chips in half (bug 5, ronde 4).
                (event.inputType.startsWith('delete') ||
                    event.inputType === 'insertText' ||
                    event.inputType === 'insertReplacementText') &&
                deleteSelection(element)
            ) {
                event.preventDefault();
                const typed =
                    event.inputType === 'insertText' ||
                    event.inputType === 'insertReplacementText'
                        ? (event.data ??
                          event.dataTransfer?.getData('text/plain') ??
                          '')
                        : '';
                if (typed !== '') {
                    insertPlainText(element, typed);
                }
                emitRef.current();
            }
        };
        element.addEventListener('beforeinput', blockFormatting);

        return () =>
            element.removeEventListener('beforeinput', blockFormatting);
    }, [root, emitRef]);
};

const caretRange = (element: HTMLElement): Range | null => {
    const selection = element.ownerDocument.getSelection();

    return selection !== null && selection.rangeCount > 0
        ? selection.getRangeAt(0).cloneRange()
        : null;
};

const rangeInside = (element: HTMLElement): Range | null => {
    const selection = element.ownerDocument.getSelection();

    return selection !== null &&
        selection.rangeCount > 0 &&
        element.contains(selection.anchorNode)
        ? selection.getRangeAt(0).cloneRange()
        : null;
};

const selectRange = (element: HTMLElement, range: Range): void => {
    const selection = element.ownerDocument.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
};

const editByKey = (
    element: HTMLElement,
    event: KeyboardEvent<HTMLDivElement>,
): boolean => {
    if (event.nativeEvent.isComposing) {
        return false;
    }
    if (
        (event.key === 'Backspace' || event.key === 'Delete') &&
        (deleteSelection(element) ||
            deleteChipAtCaret(element, event.key) ||
            deleteAcrossAnchor(element, event.key))
    ) {
        event.preventDefault();

        return true;
    }
    if (event.key === 'Enter') {
        event.preventDefault();
        insertPlainText(element, '\n');

        return true;
    }

    return false;
};

const useTextSync = (
    root: RefObject<HTMLDivElement | null>,
    value: string,
    describe: (token: CardTextToken) => ChipView,
    onChange: (text: string) => void,
) => {
    // The latest `emit`, for the native beforeinput listener that is added once.
    const emitRef = useRef<() => void>(() => undefined);
    // Clearing the field falls back to the standard text; keep showing the empty field until blur.
    const emptied = useRef(false);

    useBlockFormatting(root, emitRef);

    // Bring the field in line with the stored text after every render: an outside change (undo,
    // restore) rebuilds it, and a rename refreshes the names on the chips.
    useLayoutEffect(() => {
        const element = root.current;
        if (element === null) {
            return;
        }
        const shown = readFrom(element);
        if (shown !== value && !(emptied.current && shown === '')) {
            renderInto(element, value, describe);
        } else {
            updateChips(element, describe);
        }
    });

    const emit = (): void => {
        const element = root.current;
        if (element === null) {
            return;
        }
        const next = readFrom(element);
        emptied.current = next === '';
        onChange(next);
    };
    useLayoutEffect(() => {
        emitRef.current = emit;
    });

    return {
        emit,
        release: (): void => {
            emptied.current = false;
        },
    };
};

const useCardTextField = (
    value: string,
    onChange: (text: string) => void,
    describe: (token: CardTextToken) => ChipView,
) => {
    const root = useRef<HTMLDivElement>(null);
    const saved = useRef<Range | null>(null);
    const resume = useRef<Range | null>(null);
    const [open, setOpen] = useState(false);

    const { emit, release } = useTextSync(root, value, describe, onChange);

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
        const element = root.current;
        if (element !== null && editByKey(element, event)) {
            emit();
        }
    };

    const onPaste = (event: ClipboardEvent<HTMLDivElement>): void => {
        const element = root.current;
        if (element === null) {
            return;
        }
        event.preventDefault();
        insertPlainText(
            element,
            event.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n'),
        );
        emit();
    };

    const pick = (token: CardTextToken): void => {
        const element = root.current;
        if (element === null) {
            return;
        }
        insertToken(element, token, describe, saved.current);
        resume.current = caretRange(element);
        emit();
        setOpen(false);
    };

    const onBlur = (): void => {
        const element = root.current;
        const range = element === null ? null : rangeInside(element);
        if (range !== null) {
            saved.current = range;
        }
        release();
    };

    const restore = (event: Event): void => {
        event.preventDefault();
        const element = root.current;
        element?.focus();
        const range = resume.current;
        resume.current = null;
        if (element !== null && range !== null) {
            selectRange(element, range);
        }
    };

    return {
        root,
        open,
        setOpen,
        emit,
        onKeyDown,
        onPaste,
        onBlur,
        pick,
        restore,
    };
};

type InsertRowProps = {
    hintId: string;
    hint: string | undefined;
    onInsert: () => void;
};

const InsertRow = ({ hintId, hint, onInsert }: InsertRowProps) => {
    const t = useTranslation();

    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Button type="button" variant="secondary" onClick={onInsert}>
                {t('editor.card_text_insert')}
            </Button>
            <span
                id={hintId}
                className="min-w-0 flex-1 text-xs font-normal text-ink-soft"
            >
                {hint ?? t('editor.card_text_hint')}
            </span>
        </div>
    );
};

/**
 * The text field of a card (B131). Variables show as chips that act as one character: arrow keys
 * step over them and Backspace or Delete removes the whole chip. The field reports the stored
 * text, in which a chip is its token.
 */
export const CardTextEditor = ({
    label,
    value,
    onChange,
    resolved,
    amount,
    invalid = false,
    onStandard,
    hint,
    withAmount = true,
}: CardTextEditorProps) => {
    const t = useTranslation();
    const labelId = useId();
    const hintId = useId();
    const describe = useCallback(
        (token: CardTextToken): ChipView =>
            describeToken(token, resolved, amount, t),
        [resolved, amount, t],
    );
    const {
        root,
        open,
        setOpen,
        emit,
        onKeyDown,
        onPaste,
        onBlur,
        pick,
        restore,
    } = useCardTextField(value, onChange, describe);

    return (
        <div className="flex flex-col gap-1 text-sm font-semibold">
            <div className="flex min-h-8 items-center justify-between gap-2">
                <span id={labelId}>{label}</span>
                {onStandard !== undefined && (
                    <StandardButton label={label} onClick={onStandard} />
                )}
            </div>
            <div
                ref={root}
                data-field="text"
                role="textbox"
                aria-multiline="true"
                aria-labelledby={labelId}
                aria-describedby={hintId}
                aria-invalid={invalid}
                contentEditable
                suppressContentEditableWarning
                spellCheck
                tabIndex={0}
                onInput={emit}
                onKeyDown={onKeyDown}
                onPaste={onPaste}
                onDrop={(event) => event.preventDefault()}
                onBlur={onBlur}
                className={cn(
                    'min-h-28 w-full rounded-control border-2 border-ink bg-card px-3 py-2 text-base leading-8 font-normal break-words whitespace-pre-wrap text-ink aria-invalid:border-press',
                )}
            />
            <InsertRow
                hintId={hintId}
                hint={hint}
                onInsert={() => setOpen(true)}
            />

            <CardTextInsertDialog
                open={open}
                onOpenChange={setOpen}
                onCloseAutoFocus={restore}
                resolved={resolved}
                amount={amount}
                withAmount={withAmount}
                onPick={pick}
            />
        </div>
    );
};
