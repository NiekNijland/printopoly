import type { ReactNode } from 'react';

import { WarningIcon } from '@/components/icons';
import { useTranslation } from '@/hooks/use-translation';
import {
    BOX_LID_KEY,
    THEME_ACCENT_KEY,
    HOUSE_RULES_KEY,
    PAWN_COUNT,
    cardBackKey,
    cardKey,
    noteKey,
    pawnKey,
} from '@/lib/edition/keys';
import type { EditionSession } from '@/lib/edition/session';
import type { Edition } from '@/lib/edition/types';
import {
    deckName,
    elementLabel,
    isCustomized,
    type EditorTab,
} from '@/lib/editor/catalogue';
import { editElement } from '@/lib/editor/edit';
import { standardEdition } from '@/lib/game/standard-edition';
import type { Locale } from '@/lib/game/types';
import { THEMES } from '@/lib/render/themes';
import { cn } from '@/lib/utils';

interface ElementListProps {
    tab: Exclude<EditorTab, 'board'>;
    edition: Edition;
    interfaceLanguage: Locale;
    selected: string;
    onSelect: (key: string) => void;
    warned: ReadonlySet<string>;
    /** Needed to add a pawn back to the set. */
    session?: EditionSession;
}

/** The elements of the Kaarten, Geld and Doos tabs, as lists next to the preview (B93). */
export function ElementList({
    tab,
    edition,
    interfaceLanguage,
    selected,
    onSelect,
    warned,
    session,
}: ElementListProps) {
    const t = useTranslation();

    const row = (key: string, label?: string, leading?: ReactNode) => (
        <li key={key}>
            <button
                type="button"
                aria-current={selected === key}
                onClick={() => onSelect(key)}
                className={cn(
                    'flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-control border-0 bg-transparent px-2 text-left text-base',
                    selected === key
                        ? 'bg-card font-semibold shadow-[inset_4px_0_0_var(--color-press)]'
                        : 'hover:bg-card/60',
                )}
            >
                {leading}
                <span className="flex-1">
                    {label ?? elementLabel(key, edition, interfaceLanguage)}
                </span>
                {isCustomized(edition, key) && (
                    <span
                        aria-label={t('editor.customized')}
                        className="size-2 rounded-full bg-ink"
                    />
                )}
                {warned.has(key) && (
                    <WarningIcon
                        size={18}
                        aria-label={t('editor.has_warning')}
                    />
                )}
            </button>
        </li>
    );

    const heading = (text: string) => (
        <span className="px-2 py-1 text-sm font-semibold text-ink-soft">
            {text}
        </span>
    );

    if (tab === 'cards') {
        return (
            <div className="flex flex-col gap-4">
                {edition.parts.cards &&
                    (['chance', 'chest'] as const).map((deck) => (
                        <div key={deck} className="flex flex-col gap-1">
                            {heading(deckName(deck, interfaceLanguage))}
                            <ul className="m-0 grid list-none grid-cols-4 gap-1 p-0">
                                {standardEdition.decks[deck].map((_, index) => {
                                    const key = cardKey(deck, index + 1);

                                    return (
                                        <li key={key}>
                                            <button
                                                type="button"
                                                aria-current={selected === key}
                                                aria-label={elementLabel(
                                                    key,
                                                    edition,
                                                    interfaceLanguage,
                                                )}
                                                onClick={() => onSelect(key)}
                                                className={cn(
                                                    'relative flex aspect-[63/88] w-full cursor-pointer items-center justify-center rounded-control text-sm font-semibold text-ink',
                                                    deck === 'chance'
                                                        ? 'bg-print-chance'
                                                        : 'bg-print-chest',
                                                    selected === key
                                                        ? 'border-2 border-press shadow-[inset_0_0_0_1px_var(--color-press)]'
                                                        : edition.elements[
                                                                key
                                                            ] !== undefined
                                                          ? 'border-2 border-ink'
                                                          : 'border border-line-strong',
                                                )}
                                            >
                                                {index + 1}
                                                {warned.has(key) && (
                                                    <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border-2 border-ink bg-warning">
                                                        <WarningIcon
                                                            size={10}
                                                        />
                                                    </span>
                                                )}
                                                {edition.elements[key] !==
                                                    undefined && (
                                                    <span className="absolute right-1 bottom-1 size-1.5 rounded-full bg-ink" />
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                            <ul className="m-0 list-none p-0">
                                {row(cardBackKey(deck))}
                            </ul>
                        </div>
                    ))}
                {edition.parts.deeds && (
                    <div className="flex flex-col gap-1">
                        {heading(deckName('deed', interfaceLanguage))}
                        <ul className="m-0 list-none p-0">
                            {row(cardBackKey('deed'))}
                        </ul>
                    </div>
                )}
            </div>
        );
    }

    if (tab === 'style') {
        const swatch = (color: string) => (
            <span
                aria-hidden
                className="rounded-sm size-4 flex-none border border-ink"
                style={{ background: color }}
            />
        );

        return (
            <ul className="m-0 list-none p-0">
                {row(
                    THEME_ACCENT_KEY,
                    undefined,
                    swatch(
                        edition.elements[THEME_ACCENT_KEY]?.color ??
                            THEMES[edition.theme].accent,
                    ),
                )}
            </ul>
        );
    }

    if (tab === 'money') {
        return (
            <ul className="m-0 list-none p-0">
                {standardEdition.money.notes.map((note) =>
                    row(
                        noteKey(note.value),
                        undefined,
                        <span
                            aria-hidden
                            className="rounded-sm h-4 w-7 flex-none border border-ink"
                            style={{
                                background:
                                    edition.elements[noteKey(note.value)]
                                        ?.color ?? note.color,
                            }}
                        />,
                    ),
                )}
            </ul>
        );
    }

    const visiblePawns = Array.from({ length: PAWN_COUNT }, (_, i) =>
        pawnKey(i + 1),
    ).filter((key) => edition.elements[key]?.hidden !== true);
    const hiddenPawn = Array.from({ length: PAWN_COUNT }, (_, i) =>
        pawnKey(i + 1),
    ).find((key) => edition.elements[key]?.hidden === true);

    return (
        <div className="flex flex-col gap-3">
            {edition.parts.boxLid && (
                <ul className="m-0 list-none p-0">{row(BOX_LID_KEY)}</ul>
            )}
            {edition.parts.pawns && (
                <div className="flex flex-col gap-1">
                    {heading(
                        t('editor.pawns_count', {
                            count: visiblePawns.length,
                            total: PAWN_COUNT,
                        }),
                    )}
                    <ul className="m-0 list-none p-0">
                        {visiblePawns.map((key) =>
                            row(
                                key,
                                undefined,
                                <span
                                    aria-hidden
                                    className="size-7 flex-none rounded-full border-2 border-ink bg-board-photo"
                                />,
                            ),
                        )}
                        {hiddenPawn !== undefined && session !== undefined && (
                            <li>
                                <button
                                    type="button"
                                    onClick={() => {
                                        editElement(session, hiddenPawn, {
                                            hidden: undefined,
                                        });
                                        onSelect(hiddenPawn);
                                    }}
                                    className="min-h-11 w-full cursor-pointer border-0 bg-transparent px-2 text-left text-sm font-semibold underline underline-offset-4"
                                >
                                    {t('editor.pawn_add')}
                                </button>
                            </li>
                        )}
                    </ul>
                </div>
            )}
            {edition.parts.houseRules && (
                <ul className="m-0 list-none border-t border-line p-0 pt-2">
                    {row(HOUSE_RULES_KEY)}
                </ul>
            )}
        </div>
    );
}
