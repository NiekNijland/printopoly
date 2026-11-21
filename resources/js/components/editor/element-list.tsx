import { useMemo, type ReactNode } from 'react';

import { WarningIcon } from '@/components/icons';
import { useTranslation } from '@/hooks/use-translation';
import {
    BOX_LID_KEY,
    THEME_ACCENT_KEY,
    DICE_KEY,
    FOLD_MODELS_KEY,
    HOUSE_RULES_KEY,
    INVITATION_KEY,
    PAWN_COUNT,
    RULES_BOOKLET_KEY,
    MAX_DECK_SIZE,
    cardBackKey,
    deckCardKeys,
    noteKey,
    pawnKey,
} from '@/lib/edition/keys';
import { resolveEdition } from '@/lib/edition/resolve';
import type { EditionSession } from '@/lib/edition/session';
import type { Edition } from '@/lib/edition/types';
import {
    deckLabel,
    elementLabel,
    isCustomized,
    type EditorTab,
} from '@/lib/editor/catalogue';
import { editElement } from '@/lib/editor/edit';
import { addCardChange, nextExtraCardKey } from '@/lib/editor/extra-cards';
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

/** The first words of a card text, for its tile in the list. */
export function firstWords(text: string, count = 6): string {
    const words = text
        .trim()
        .split(/\s+/)
        .filter((word) => word !== '');

    return words.length <= count
        ? words.join(' ')
        : `${words.slice(0, count).join(' ')}…`;
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
    // The first words of every card, so a tile says what is on the card and not only its number.
    const texts = useMemo(() => resolveEdition(edition).decks, [edition]);

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
                            {heading(
                                deckLabel(edition, deck, interfaceLanguage),
                            )}
                            <ul className="m-0 grid list-none grid-cols-3 gap-1 p-0 min-[480px]:grid-cols-4">
                                {deckCardKeys(edition.elements, deck).map(
                                    (key) => {
                                        const number = Number(
                                            key.split('.')[2],
                                        );
                                        const text = texts?.[deck].find(
                                            (card) => `card.${card.id}` === key,
                                        )?.text;

                                        return (
                                            <li key={key}>
                                                <button
                                                    type="button"
                                                    aria-current={
                                                        selected === key
                                                    }
                                                    aria-label={elementLabel(
                                                        key,
                                                        edition,
                                                        interfaceLanguage,
                                                    )}
                                                    onClick={() =>
                                                        onSelect(key)
                                                    }
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
                                                    <span className="absolute top-1 left-1.5 font-mono text-[10px] leading-none text-ink-soft">
                                                        {number}
                                                    </span>
                                                    <span
                                                        aria-hidden="true"
                                                        className="line-clamp-4 px-1.5 pt-4 text-left text-[10px] leading-tight font-medium break-words"
                                                    >
                                                        {firstWords(text ?? '')}
                                                    </span>
                                                    {warned.has(key) && (
                                                        <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border-2 border-ink bg-warning">
                                                            <WarningIcon
                                                                size={10}
                                                            />
                                                        </span>
                                                    )}
                                                    {edition.elements[key] !==
                                                        undefined && (
                                                        <span className="absolute right-1 bottom-1 size-2.5 rounded-full bg-ink" />
                                                    )}
                                                </button>
                                            </li>
                                        );
                                    },
                                )}
                                {session !== undefined &&
                                    nextExtraCardKey(edition, deck) !==
                                        undefined && (
                                        <li>
                                            <button
                                                type="button"
                                                data-add-card={deck}
                                                onClick={() => {
                                                    const added = addCardChange(
                                                        session.edition,
                                                        deck,
                                                    );
                                                    if (added !== null) {
                                                        session.apply([
                                                            added.change,
                                                        ]);
                                                        onSelect(added.key);
                                                    }
                                                }}
                                                className="flex aspect-[63/88] w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-control border-2 border-ink bg-card px-1 text-center text-xs leading-tight font-semibold text-ink hover:bg-paper"
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className="text-xl leading-none"
                                                >
                                                    +
                                                </span>
                                                {t('editor.card_add')}
                                            </button>
                                        </li>
                                    )}
                            </ul>
                            {nextExtraCardKey(edition, deck) === undefined && (
                                <p className="m-0 px-2 text-xs text-ink-soft">
                                    {t('editor.deck_full', {
                                        count: MAX_DECK_SIZE,
                                    })}
                                </p>
                            )}
                            <ul className="m-0 list-none p-0">
                                {row(cardBackKey(deck))}
                            </ul>
                        </div>
                    ))}
                {edition.parts.deeds && (
                    <div className="flex flex-col gap-1">
                        {heading(deckLabel(edition, 'deed', interfaceLanguage))}
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

    const extraKeys = [
        edition.parts.rulesBooklet ? RULES_BOOKLET_KEY : null,
        edition.parts.foldModels ? FOLD_MODELS_KEY : null,
        edition.parts.dice ? DICE_KEY : null,
        edition.parts.invitation ? INVITATION_KEY : null,
    ].filter((key): key is string => key !== null);
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
            {extraKeys.length > 0 && (
                <ul className="m-0 list-none border-t border-line p-0 pt-2">
                    {extraKeys.map((key) => row(key))}
                </ul>
            )}
        </div>
    );
}
