import {
    useCallback,
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
    type ClipboardEvent,
    type KeyboardEvent,
} from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    deleteChipAtCaret,
    deleteAcrossAnchor,
    deleteSelection,
    insertPlainText,
    insertToken,
    readFrom,
    renderInto,
    updateChips,
    type ChipView,
} from '@/features/edition/editor/card-text-dom';
import { StandardButton } from '@/features/edition/editor/panel/panel-parts';
import { useTranslation } from '@/hooks/use-translation';
import {
    AMOUNT_TOKEN,
    CURRENCY_TOKEN,
    spaceToken,
    tokenValue,
    cardTextContext,
    parseCardText,
    wordOf,
    wordToken,
    type CardTextToken,
    type CardTextWord,
} from '@/lib/render/edition-card-text';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import { cn } from '@/lib/utils';

/** Space types a card text can name. Chance and Community Chest spaces have no name of their own. */
const NAMEABLE = new Set(['street', 'station', 'utility', 'corner', 'tax']);

/** The words the insert list offers (B177); plurals stay as typed tokens, they come with the standard texts. */
const OFFERED_WORDS: readonly CardTextWord[] = [
    'station',
    'utility',
    'house',
    'hotel',
    'jail',
];

export interface CardTextEditorProps {
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
}

/**
 * The text field of a card (B131). Variables show as chips that act as one character: arrow keys
 * step over them and Backspace or Delete removes the whole chip. The field reports the stored
 * text, in which a chip is its token.
 */
export function CardTextEditor({
    label,
    value,
    onChange,
    resolved,
    amount,
    invalid = false,
    onStandard,
    hint,
    withAmount = true,
}: CardTextEditorProps) {
    const t = useTranslation();
    const labelId = useId();
    const hintId = useId();
    const root = useRef<HTMLDivElement>(null);
    const saved = useRef<Range | null>(null);
    const resume = useRef<Range | null>(null);
    // The latest `emit`, for the native beforeinput listener that is added once.
    const emitRef = useRef<() => void>(() => undefined);
    // Clearing the field falls back to the standard text; keep showing the empty field until blur.
    const emptied = useRef(false);
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

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
    }, []);

    const describe = useCallback(
        (token: CardTextToken): ChipView => {
            const context = cardTextContext(
                {
                    elements: {},
                    language: resolved.language,
                    currency: resolved.currency.id,
                },
                amount,
            );
            switch (token.type) {
                case 'space': {
                    const space = resolved.spaces.find(
                        (candidate) => candidate.position === token.position,
                    );
                    const name =
                        space === undefined
                            ? ''
                            : space.name.trim() ||
                              space.base.name[resolved.language];
                    const kind = t(
                        space?.base.type === 'street' ||
                            space?.base.type === 'station' ||
                            space?.base.type === 'utility'
                            ? `editor.token_${space.base.type}`
                            : 'editor.token_space',
                    );

                    return {
                        text: name,
                        label: `${kind}: ${name}`,
                        broken: space === undefined,
                    };
                }
                case 'currency':
                    return {
                        text: resolved.currency.symbol,
                        label: `${t('editor.token_currency')}: ${resolved.currency.name[resolved.language]}`,
                        broken: false,
                    };
                case 'amount': {
                    const shown = tokenValue(token, context);

                    return {
                        text: shown ?? t('editor.token_amount_unset'),
                        label:
                            shown === undefined
                                ? t('editor.token_amount_unset')
                                : `${t('editor.token_amount')}: ${shown}`,
                        broken: shown === undefined,
                    };
                }
                case 'word': {
                    const word = wordOf(resolved.words, token.word);

                    return {
                        text: word,
                        label: `${t('editor.token_word')}: ${word}`,
                        broken: false,
                    };
                }
                case 'unknown':
                    return {
                        text: token.raw,
                        label: `${t('editor.token_unknown')}: ${token.raw}`,
                        broken: true,
                    };
            }
        },
        [resolved, amount, t],
    );

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

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
        const element = root.current;
        if (element === null || event.nativeEvent.isComposing) {
            return;
        }
        if (
            (event.key === 'Backspace' || event.key === 'Delete') &&
            (deleteSelection(element) ||
                deleteChipAtCaret(element, event.key) ||
                deleteAcrossAnchor(element, event.key))
        ) {
            event.preventDefault();
            emit();
        } else if (event.key === 'Enter') {
            event.preventDefault();
            insertPlainText(element, '\n');
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
        const selection = element.ownerDocument.getSelection();
        resume.current =
            selection !== null && selection.rangeCount > 0
                ? selection.getRangeAt(0).cloneRange()
                : null;
        emit();
        setOpen(false);
    };

    const needle = search.trim().toLowerCase();
    const items = resolved.spaces
        .filter((space) => NAMEABLE.has(space.base.type))
        .map((space) => ({
            position: space.position,
            name: space.name.trim() || space.base.name[resolved.language],
            kind: t(
                space.base.type === 'street' ||
                    space.base.type === 'station' ||
                    space.base.type === 'utility'
                    ? `editor.token_${space.base.type}`
                    : 'editor.token_space',
            ),
        }))
        .filter(
            (item) =>
                needle === '' ||
                item.name.toLowerCase().includes(needle) ||
                item.kind.toLowerCase().includes(needle),
        );
    const wordKind = t('editor.token_word');
    const words = OFFERED_WORDS.map((word) => ({
        word,
        name: wordOf(resolved.words, word),
    })).filter(
        (item) =>
            needle === '' ||
            item.name.toLowerCase().includes(needle) ||
            wordKind.toLowerCase().includes(needle),
    );

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
                onBlur={() => {
                    const element = root.current;
                    const selection = element?.ownerDocument.getSelection();
                    if (
                        element !== null &&
                        selection !== null &&
                        selection !== undefined &&
                        selection.rangeCount > 0 &&
                        element.contains(selection.anchorNode)
                    ) {
                        saved.current = selection.getRangeAt(0).cloneRange();
                    }
                    emptied.current = false;
                }}
                className={cn(
                    'min-h-28 w-full rounded-control border-2 border-ink bg-card px-3 py-2 text-base leading-8 font-normal break-words whitespace-pre-wrap text-ink aria-invalid:border-press',
                )}
            />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                        setSearch('');
                        setOpen(true);
                    }}
                >
                    {t('editor.card_text_insert')}
                </Button>
                <span
                    id={hintId}
                    className="min-w-0 flex-1 text-xs font-normal text-ink-soft"
                >
                    {hint ?? t('editor.card_text_hint')}
                </span>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent
                    onCloseAutoFocus={(event) => {
                        event.preventDefault();
                        const element = root.current;
                        element?.focus();
                        const range = resume.current;
                        resume.current = null;
                        if (element !== null && range !== null) {
                            const selection =
                                element.ownerDocument.getSelection();
                            selection?.removeAllRanges();
                            selection?.addRange(range);
                        }
                    }}
                >
                    <DialogTitle>
                        {t('editor.card_text_insert_title')}
                    </DialogTitle>
                    <DialogDescription>
                        {t(
                            withAmount
                                ? 'editor.card_text_insert_hint'
                                : 'editor.card_text_insert_hint_names',
                        )}
                    </DialogDescription>
                    <div className="mt-4 flex flex-col gap-3">
                        <Input
                            type="search"
                            aria-label={t('editor.card_text_search')}
                            placeholder={t('editor.card_text_search')}
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                        <ul className="m-0 flex max-h-72 list-none flex-col gap-1 overflow-auto p-0">
                            <li>
                                <ChoiceButton
                                    onClick={() =>
                                        pick(parseOnly(CURRENCY_TOKEN))
                                    }
                                    name={`${t('editor.card_text_currency_item')} (${resolved.currency.symbol})`}
                                />
                            </li>
                            {withAmount && (
                                <li>
                                    <ChoiceButton
                                        onClick={() =>
                                            pick(parseOnly(AMOUNT_TOKEN))
                                        }
                                        name={t('editor.card_text_amount_item')}
                                        note={
                                            amount === undefined
                                                ? t(
                                                      'editor.card_text_amount_unset',
                                                  )
                                                : undefined
                                        }
                                    />
                                </li>
                            )}
                            {words.map((item) => (
                                <li key={item.word}>
                                    <ChoiceButton
                                        onClick={() =>
                                            pick(
                                                parseOnly(wordToken(item.word)),
                                            )
                                        }
                                        name={item.name}
                                        note={wordKind}
                                    />
                                </li>
                            ))}
                            {items.map((item) => (
                                <li key={item.position}>
                                    <ChoiceButton
                                        onClick={() =>
                                            pick(
                                                parseOnly(
                                                    spaceToken(item.position),
                                                ),
                                            )
                                        }
                                        name={item.name}
                                        note={item.kind}
                                    />
                                </li>
                            ))}
                            {items.length === 0 && words.length === 0 && (
                                <li
                                    role="status"
                                    className="px-3 py-2 text-base font-normal text-ink-soft"
                                >
                                    {t('editor.card_text_no_results')}
                                </li>
                            )}
                        </ul>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function parseOnly(token: string): CardTextToken {
    const [segment] = parseCardText(token);

    if (segment === undefined || segment.type === 'text') {
        throw new RangeError(`Not a token: ${token}`);
    }

    return segment;
}

function ChoiceButton({
    name,
    note,
    onClick,
}: {
    name: string;
    note?: string | undefined;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-control border-0 bg-transparent px-3 py-2 text-left text-base font-semibold text-ink hover:bg-table"
        >
            <span>{name}</span>
            {note !== undefined && (
                <span className="text-sm font-normal text-ink-soft">
                    {note}
                </span>
            )}
        </button>
    );
}
