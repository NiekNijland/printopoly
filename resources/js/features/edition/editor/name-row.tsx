import {
    useState,
    type HTMLAttributes,
    type KeyboardEvent,
    type ReactNode,
} from 'react';

import { ChevronLeftIcon, WarningIcon } from '@/components/ui/icons';
import { editElement } from '@/features/edition/editor/edit';
import {
    pasteNames,
    type PastedNames,
} from '@/features/edition/editor/name-list';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation, useTranslationChoice } from '@/hooks/use-translation';
import { baselineOf } from '@/lib/render/edition-baseline';
import { MAX_NAME_LENGTH } from '@/lib/render/edition-schema';
import type { Edition } from '@/lib/render/edition-types';
import { elementLabel, isCustomized } from '@/lib/render/editor-catalogue';
import { isNamedSpaceKey } from '@/lib/render/editor-clear-names';
import { cn } from '@/lib/utils';
import type { Locale } from '@/types/game';

/** The list rows a person can type names in: Tab, Enter and the arrow keys walk them in order (B161). */
const NAME_INPUT = 'input[data-name-input]';

function moveFocus(from: HTMLInputElement, step: 1 | -1): boolean {
    const inputs = [
        ...(from
            .closest('[data-name-list]')
            ?.querySelectorAll<HTMLInputElement>(NAME_INPUT) ?? []),
    ];
    const next = inputs[inputs.indexOf(from) + step];
    if (next === undefined) {
        return false;
    }
    next.focus();
    next.select();

    return true;
}

/** What a paste of several lines did, for the flash under the editor: filled, passed over and left over. */
export function usePasteSummary(): (pasted: PastedNames) => string {
    const tc = useTranslationChoice();

    return (pasted) =>
        [
            tc('editor.list_pasted', pasted.keys.length),
            pasted.skipped > 0
                ? tc('editor.list_pasted_skipped', pasted.skipped)
                : null,
            pasted.left > 0 ? tc('editor.list_pasted_left', pasted.left) : null,
        ]
            .filter((line) => line !== null)
            .join(' ');
}

interface NameRowProps {
    elementKey: string;
    edition: Edition;
    interfaceLanguage: Locale;
    session: EditionSession;
    selected: boolean;
    warned: boolean;
    /** The swatch or token in front of the name. */
    leading: ReactNode;
    /** Opens the element: on a phone its own screen. */
    onOpen: (key: string) => void;
    /** Typing in a row shows that element in the editor, without leaving the list. */
    onFocusRow: (key: string) => void;
    /** Says what a paste of several lines did. */
    onAnnounce: (text: string) => void;
    /** After the name: the photo of the space, which can be dragged to another row (B238). */
    trailing?: ReactNode;
    /** The row as a place to drop a photo on (B238), and whether one hovers over it now. */
    drop?: HTMLAttributes<HTMLDivElement>;
    dropping?: boolean;
}

/**
 * A row of the left list with the name as a field (B161): type the name in place, Tab or Enter goes to the next
 * row, and several lines pasted fill this row and the next ones of the same kind in one undo step. The swatch in
 * front opens the element, as the whole row did before; on a phone the arrow at the end does the same.
 */
export function NameRow({
    elementKey: key,
    edition,
    interfaceLanguage,
    session,
    selected,
    warned,
    leading,
    onOpen,
    onFocusRow,
    onAnnounce,
    trailing,
    drop,
    dropping = false,
}: NameRowProps) {
    const t = useTranslation();
    const summary = usePasteSummary();
    // What is typed while the field is empty, so clearing it does not jump to the standard name at once.
    const [draft, setDraft] = useState<string | null>(null);
    const label = elementLabel(key, edition, interfaceLanguage);
    const standard = elementLabel(
        key,
        { ...edition, elements: { ...baselineOf(edition).elements } },
        interfaceLanguage,
    );
    // After "Namen leegmaken" the name is empty on purpose (B214): the field stays empty and the list label
    // ("Vak 6, nog zonder naam") is only its placeholder, so typing starts a new name.
    const emptied = edition.elements[key]?.name === '';
    const customized = isCustomized(edition, key);
    const describe = [
        label,
        ...(customized ? [t('editor.customized')] : []),
        ...(warned ? [t('editor.has_warning')] : []),
    ].join(', ');

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
        if (event.nativeEvent.isComposing) {
            return;
        }
        if (
            (event.key === 'Enter' && !event.shiftKey) ||
            event.key === 'ArrowDown'
        ) {
            event.preventDefault();
            if (!moveFocus(event.currentTarget, 1) && event.key === 'Enter') {
                // The last row (or the only hit of a search) keeps the focus on its row, never on the page (bug 15).
                event.currentTarget
                    .closest('li')
                    ?.querySelector<HTMLElement>('[data-row-open]')
                    ?.focus();
            }
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            moveFocus(event.currentTarget, -1);
        }
    };

    return (
        <li>
            <div
                {...drop}
                className={cn(
                    'flex min-h-11 items-center gap-1 rounded-control pr-1',
                    selected
                        ? 'bg-card shadow-[inset_4px_0_0_var(--color-press)]'
                        : 'hover:bg-card/60',
                    dropping &&
                        'bg-card outline-2 -outline-offset-2 outline-press outline-dashed',
                )}
            >
                <button
                    type="button"
                    tabIndex={-1}
                    aria-current={selected}
                    aria-label={describe}
                    data-row-open={key}
                    onClick={() => onOpen(key)}
                    className="flex h-11 w-9 flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 pl-1 pointer-coarse:w-11"
                >
                    {leading}
                </button>
                <input
                    type="text"
                    data-name-input={key}
                    aria-label={t('editor.list_name', { name: label })}
                    value={draft ?? (emptied ? '' : label)}
                    // An empty name shows the name it would have had, in grey (R6 Aisha, Sara; B258).
                    placeholder={standard}
                    maxLength={MAX_NAME_LENGTH}
                    autoComplete="off"
                    spellCheck
                    onFocus={() => onFocusRow(key)}
                    onBlur={() => setDraft(null)}
                    onKeyDown={onKeyDown}
                    onChange={(event) => {
                        const next = event.target.value;
                        setDraft(next);
                        // A street, station or utility you empty stays empty (B258): the standard name does not come
                        // back when you leave the field. "Standaard" in its menu brings it back.
                        editElement(
                            session,
                            key,
                            {
                                name:
                                    next === ''
                                        ? isNamedSpaceKey(key)
                                            ? ''
                                            : undefined
                                        : next,
                            },
                            `name:${key}`,
                        );
                    }}
                    onPaste={(event) => {
                        const pasted = pasteNames(
                            session.edition,
                            key,
                            event.clipboardData.getData('text/plain'),
                        );
                        if (pasted === null) {
                            return;
                        }
                        event.preventDefault();
                        setDraft(null);
                        session.apply(pasted.changes);
                        onAnnounce(summary(pasted));
                        const last = pasted.keys[pasted.keys.length - 1];
                        const list =
                            event.currentTarget.closest('[data-name-list]');
                        requestAnimationFrame(() =>
                            list
                                ?.querySelector<HTMLInputElement>(
                                    `input[data-name-input="${last ?? key}"]`,
                                )
                                ?.focus(),
                        );
                    }}
                    className={cn(
                        'h-10 min-w-0 flex-1 rounded-control border-2 border-transparent bg-transparent px-2 text-base text-ellipsis text-ink outline-none placeholder:text-ink-soft hover:border-line focus:border-ink focus:bg-card pointer-coarse:h-11',
                        selected && 'font-semibold',
                    )}
                />
                {trailing}
                {customized && (
                    <span
                        aria-hidden="true"
                        className="size-2 flex-none rounded-full bg-ink"
                    />
                )}
                {warned && (
                    <WarningIcon
                        size={18}
                        aria-hidden="true"
                        className="flex-none"
                    />
                )}
                <button
                    type="button"
                    tabIndex={-1}
                    aria-hidden="true"
                    onClick={() => onOpen(key)}
                    className="flex size-11 flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-ink-soft md:hidden"
                >
                    <ChevronLeftIcon className="rotate-180" />
                </button>
            </div>
        </li>
    );
}
