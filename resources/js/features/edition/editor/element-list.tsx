import { Link } from '@inertiajs/react';
import { useMemo, type ReactNode } from 'react';

import { WarningIcon } from '@/components/icons';
import { editElement } from '@/features/edition/editor/edit';
import { matchesQuery } from '@/features/edition/editor/name-list';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import {
    BOX_LID_KEY,
    HOUSE_RULES_KEY,
    INVITATION_KEY,
    PAWN_COUNT,
    MAX_DECK_SIZE,
    cardBackKey,
    deckCardKeys,
    noteKey,
    pawnKey,
} from '@/lib/render/edition-keys';
import { resolveEdition } from '@/lib/render/edition-resolve';
import type { Edition, PartId } from '@/lib/render/edition-types';
import {
    deckLabel,
    elementLabel,
    isCustomized,
    type EditorTab,
} from '@/lib/render/editor-catalogue';
import {
    addCardChange,
    nextExtraCardKey,
} from '@/lib/render/editor-extra-cards';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import { setPartOf } from '@/lib/render/print-selection';
import { standardEdition } from '@/lib/render/standard-edition';
import { cn } from '@/lib/utils';
import { print as editionsPrint } from '@/routes/editions';
import type { Locale } from '@/types/game';

import { NameRow } from './name-row';

type ElementListProps = {
    tab: Exclude<EditorTab, 'board'>;
    edition: Edition;
    interfaceLanguage: Locale;
    selected: string;
    onSelect: (key: string) => void;
    warned: ReadonlySet<string>;
    /** Needed to add a pawn back to the set, and to type pawn names in the list (B161). */
    session?: EditionSession;
    /** The search above the list: only cards that hold it (B161). */
    query?: string;
    /**
     * The parts of the set chosen last on the print page (B198). The others still show, faded with "niet in je
     * set", so you find them and can make them anyway. Without it every part is in the set.
     */
    inSet?: ReadonlySet<PartId>;
    /** Typing a pawn name in its row shows the pawn, without leaving the list. */
    onFocusRow?: (key: string) => void;
    onAnnounce?: (text: string) => void;
    /** The photos of this browser: a pawn with a photo shows it in its round token (R6 Sara, Kees). */
    photos?: PhotoInfos;
};

/** The first words of a card text, for its tile in the list. */
export const firstWords = (text: string, count = 6): string => {
    const words = text
        .trim()
        .split(/\s+/)
        .filter((word) => word !== '');

    return words.length <= count
        ? words.join(' ')
        : `${words.slice(0, count).join(' ')}…`;
};

/** The elements of the Kaarten, Geld and Doos tabs, as lists next to the preview (B93). */
export const ElementList = ({
    tab,
    edition,
    interfaceLanguage,
    selected,
    onSelect,
    warned,
    session,
    query = '',
    inSet,
    onFocusRow = onSelect,
    onAnnounce = () => undefined,
    photos,
}: ElementListProps) => {
    const t = useTranslation();
    const out = (part: PartId): boolean =>
        inSet !== undefined && !inSet.has(part);
    // A part that is not in the set: lighter, with a word that says why (vindbaarheid point 1, B198).
    // A tap on it goes to the row of the part on the print page, where you put it in the set (R6 Kees).
    const outTag = (part: PartId) => {
        if (!out(part)) {
            return null;
        }
        const row = setPartOf(part);

        return (
            <Link
                href={
                    editionsPrint(
                        { locale: interfaceLanguage, edition: edition.id },
                        row === undefined ? {} : { query: { part: row } },
                    ).url
                }
                data-not-in-set={part}
                aria-label={t('editor.not_in_set_link')}
                className="group/out -my-1.5 inline-flex min-h-11 flex-none items-center no-underline focus-visible:outline-none"
            >
                <span className="rounded-full border border-line-strong bg-paper px-2 py-0.5 font-sans text-xs font-semibold text-ink-soft group-hover/out:border-ink group-hover/out:text-ink group-focus-visible/out:outline-3 group-focus-visible/out:outline-offset-2 group-focus-visible/out:outline-ink">
                    {t('editor.not_in_set')}
                </span>
            </Link>
        );
    };
    const outClass = (part: PartId) =>
        out(part)
            ? 'opacity-60 hover:opacity-100 focus-within:opacity-100'
            : '';
    // The first words of every card, so a tile says what is on the card and not only its number.
    const texts = useMemo(() => resolveEdition(edition).decks, [edition]);

    const row = (
        key: string,
        label?: string,
        leading?: ReactNode,
        part?: PartId,
    ) => (
        <li
            key={key}
            className={cn(
                'flex items-center gap-2',
                part !== undefined && outClass(part),
            )}
        >
            <button
                type="button"
                aria-current={selected === key}
                onClick={() => onSelect(key)}
                className={cn(
                    'flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-control border-0 bg-transparent px-2 text-left text-base',
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
            {part !== undefined && outTag(part)}
        </li>
    );

    const heading = (text: string, part?: PartId) => (
        <span className="flex items-center gap-2 px-2 py-1 text-sm font-semibold text-ink-soft">
            <span className="min-w-0 flex-1">{text}</span>
            {part !== undefined && outTag(part)}
        </span>
    );

    if (tab === 'cards') {
        const searching = query.trim() !== '';
        const shows = (key: string, text?: string): boolean =>
            matchesQuery(
                query,
                elementLabel(key, edition, interfaceLanguage),
                text,
            );
        const decks = (['chance', 'chest'] as const).filter(
            (deck) =>
                !searching ||
                [
                    ...deckCardKeys(edition.elements, deck),
                    cardBackKey(deck),
                ].some((key) =>
                    shows(
                        key,
                        texts?.[deck].find((card) => `card.${card.id}` === key)
                            ?.text,
                    ),
                ),
        );
        const deedBack = shows(cardBackKey('deed'));

        if (searching && decks.length === 0 && !deedBack) {
            return (
                <p
                    role="status"
                    className="m-0 px-2 py-3 text-base text-ink-soft"
                >
                    {t('editor.search_none', { query: query.trim() })}
                </p>
            );
        }

        return (
            <div className="flex flex-col gap-4">
                {decks.map((deck) => (
                    <div
                        key={deck}
                        className={cn(
                            '@container flex flex-col gap-1',
                            outClass('cards'),
                        )}
                    >
                        {heading(
                            deckLabel(edition, deck, interfaceLanguage),
                            'cards',
                        )}
                        {/* Four tiles only where each is wide enough for whole words (bug 24). */}
                        <ul
                            data-card-grid
                            className="m-0 grid list-none grid-cols-3 gap-1 p-0 @[24rem]:grid-cols-4"
                        >
                            {deckCardKeys(edition.elements, deck)
                                .filter((key) =>
                                    shows(
                                        key,
                                        texts?.[deck].find(
                                            (card) => `card.${card.id}` === key,
                                        )?.text,
                                    ),
                                )
                                .map((key) => {
                                    const number = Number(key.split('.')[2]);
                                    const text = texts?.[deck].find(
                                        (card) => `card.${card.id}` === key,
                                    )?.text;

                                    return (
                                        <li key={key}>
                                            <button
                                                type="button"
                                                data-card-tile={key}
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
                                                        : isCustomized(
                                                                edition,
                                                                key,
                                                            )
                                                          ? 'border-2 border-ink'
                                                          : 'border border-line-strong',
                                                )}
                                            >
                                                <span className="absolute top-1 left-1.5 font-mono text-[10px] leading-none text-ink-soft">
                                                    {number}
                                                </span>
                                                <span
                                                    aria-hidden="true"
                                                    lang={edition.language}
                                                    className="line-clamp-4 px-1.5 pt-4 pb-3 text-left text-[10px] leading-tight font-medium break-words hyphens-auto"
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
                                                {isCustomized(edition, key) && (
                                                    <span
                                                        role="img"
                                                        aria-label={t(
                                                            'editor.customized',
                                                        )}
                                                        className="absolute right-1 bottom-1 size-2.5 rounded-full bg-ink"
                                                    />
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
                            {!searching &&
                                session !== undefined &&
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
                        {!searching &&
                            nextExtraCardKey(edition, deck) === undefined && (
                                <p className="m-0 px-2 text-xs text-ink-soft">
                                    {t('editor.deck_full', {
                                        count: MAX_DECK_SIZE,
                                    })}
                                </p>
                            )}
                        {shows(cardBackKey(deck)) && (
                            <ul className="m-0 list-none p-0">
                                {row(cardBackKey(deck))}
                            </ul>
                        )}
                    </div>
                ))}
                {deedBack && (
                    <div
                        className={cn('flex flex-col gap-1', outClass('deeds'))}
                    >
                        {heading(
                            deckLabel(edition, 'deed', interfaceLanguage),
                            'deeds',
                        )}
                        <ul className="m-0 list-none p-0">
                            {row(cardBackKey('deed'))}
                        </ul>
                    </div>
                )}
            </div>
        );
    }

    if (tab === 'money') {
        return (
            <div className={cn('flex flex-col gap-1', outClass('money'))}>
                {out('money') && heading(t('editor.money_notes'), 'money')}
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
            </div>
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
            <ul className="m-0 list-none p-0">
                {row(BOX_LID_KEY, undefined, undefined, 'boxLid')}
            </ul>
            <div className={cn('flex flex-col gap-1', outClass('pawns'))}>
                {heading(
                    t('editor.pawns_count', {
                        count: visiblePawns.length,
                        total: PAWN_COUNT,
                    }),
                    'pawns',
                )}
                <ul data-name-list className="m-0 list-none p-0">
                    {visiblePawns.map((key) => {
                        const placement = edition.elements[key]?.photo;
                        const url =
                            placement === undefined
                                ? undefined
                                : photos?.get(placement.photoId)?.url;
                        // The round token is the photo of the pawn when it has one (R6 Sara, Kees; R5 Mo).
                        const token = (
                            <span
                                aria-hidden
                                data-pawn-token={key}
                                className="size-7 flex-none overflow-hidden rounded-full border-2 border-ink bg-board-photo"
                            >
                                {url !== undefined && (
                                    <img
                                        src={url}
                                        alt=""
                                        draggable={false}
                                        className="size-full object-cover"
                                        style={{
                                            filter: placement?.grayscale
                                                ? 'grayscale(1)'
                                                : undefined,
                                        }}
                                    />
                                )}
                            </span>
                        );

                        return session === undefined ? (
                            row(key, undefined, token)
                        ) : (
                            <NameRow
                                key={key}
                                elementKey={key}
                                edition={edition}
                                interfaceLanguage={interfaceLanguage}
                                session={session}
                                selected={selected === key}
                                warned={warned.has(key)}
                                leading={token}
                                onOpen={onSelect}
                                onFocusRow={onFocusRow}
                                onAnnounce={onAnnounce}
                            />
                        );
                    })}
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
            <ul className="m-0 list-none border-t border-line p-0 pt-2">
                {row(HOUSE_RULES_KEY, undefined, undefined, 'houseRules')}
                {row(INVITATION_KEY, undefined, undefined, 'invitation')}
            </ul>
        </div>
    );
};
