import { WarningIcon } from '@/components/ui/icons';
import {
    ListHeading,
    ListRow,
    outClass,
    type ListBase,
} from '@/features/edition/editor/element-list-parts';
import { matchesQuery } from '@/features/edition/editor/name-list';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import {
    MAX_DECK_SIZE,
    cardBackKey,
    deckCardKeys,
} from '@/lib/render/edition-keys';
import type { resolveEdition } from '@/lib/render/edition-resolve';
import {
    deckLabel,
    elementLabel,
    isCustomized,
} from '@/lib/render/editor-catalogue';
import {
    addCardChange,
    nextExtraCardKey,
} from '@/lib/render/editor-extra-cards';
import { cn } from '@/lib/utils';

type Deck = 'chance' | 'chest';
type DeckTexts = ReturnType<typeof resolveEdition>['decks'];

/** The first words of a card text, for its tile in the list. */
const firstWords = (text: string, count = 6): string => {
    const words = text
        .trim()
        .split(/\s+/)
        .filter((word) => word !== '');

    return words.length <= count
        ? words.join(' ')
        : `${words.slice(0, count).join(' ')}…`;
};

const textOf = (
    texts: DeckTexts,
    deck: Deck,
    key: string,
): string | undefined =>
    texts?.[deck].find((card) => `card.${card.id}` === key)?.text;

type CardTileProps = {
    base: ListBase;
    deck: Deck;
    cardKey: string;
    text: string | undefined;
};

const CardTile = ({ base, deck, cardKey: key, text }: CardTileProps) => {
    const t = useTranslation();
    const { edition, interfaceLanguage, selected, onSelect, warned } = base;
    const number = Number(key.split('.')[2]);

    return (
        <button
            type="button"
            data-card-tile={key}
            aria-current={selected === key}
            aria-label={elementLabel(key, edition, interfaceLanguage)}
            onClick={() => onSelect(key)}
            className={cn(
                'relative flex aspect-[63/88] w-full cursor-pointer items-center justify-center rounded-control text-sm font-semibold text-ink',
                deck === 'chance' ? 'bg-print-chance' : 'bg-print-chest',
                selected === key
                    ? 'border-2 border-press shadow-[inset_0_0_0_1px_var(--color-press)]'
                    : isCustomized(edition, key)
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
                    <WarningIcon size={10} />
                </span>
            )}
            {isCustomized(edition, key) && (
                <span
                    role="img"
                    aria-label={t('editor.customized')}
                    className="absolute right-1 bottom-1 size-2.5 rounded-full bg-ink"
                />
            )}
        </button>
    );
};

const AddCardTile = ({
    deck,
    session,
    onSelect,
}: {
    deck: Deck;
    session: EditionSession;
    onSelect: (key: string) => void;
}) => {
    const t = useTranslation();

    return (
        <button
            type="button"
            data-add-card={deck}
            onClick={() => {
                const added = addCardChange(session.edition, deck);
                if (added !== null) {
                    session.apply([added.change]);
                    onSelect(added.key);
                }
            }}
            className="flex aspect-[63/88] w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-control border-2 border-ink bg-card px-1 text-center text-xs leading-tight font-semibold text-ink hover:bg-paper"
        >
            <span aria-hidden="true" className="text-xl leading-none">
                +
            </span>
            {t('editor.card_add')}
        </button>
    );
};

type DeckSectionProps = {
    base: ListBase;
    deck: Deck;
    session: EditionSession | undefined;
    searching: boolean;
    texts: DeckTexts;
    shows: (key: string, text?: string) => boolean;
};

const DeckSection = ({
    base,
    deck,
    session,
    searching,
    texts,
    shows,
}: DeckSectionProps) => {
    const t = useTranslation();
    const { edition, interfaceLanguage } = base;

    return (
        <div
            className={cn(
                '@container flex flex-col gap-1',
                outClass(base, 'cards'),
            )}
        >
            <ListHeading
                base={base}
                text={deckLabel(edition, deck, interfaceLanguage)}
                part="cards"
            />
            {/* Four tiles only where each is wide enough for whole words (bug 24). */}
            <ul
                data-card-grid
                className="m-0 grid list-none grid-cols-3 gap-1 p-0 @[24rem]:grid-cols-4"
            >
                {deckCardKeys(edition.elements, deck)
                    .filter((key) => shows(key, textOf(texts, deck, key)))
                    .map((key) => (
                        <li key={key}>
                            <CardTile
                                base={base}
                                deck={deck}
                                cardKey={key}
                                text={textOf(texts, deck, key)}
                            />
                        </li>
                    ))}
                {!searching &&
                    session !== undefined &&
                    nextExtraCardKey(edition, deck) !== undefined && (
                        <li>
                            <AddCardTile
                                deck={deck}
                                session={session}
                                onSelect={base.onSelect}
                            />
                        </li>
                    )}
            </ul>
            {!searching && nextExtraCardKey(edition, deck) === undefined && (
                <p className="m-0 px-2 text-xs text-ink-soft">
                    {t('editor.deck_full', {
                        count: MAX_DECK_SIZE,
                    })}
                </p>
            )}
            {shows(cardBackKey(deck)) && (
                <ul className="m-0 list-none p-0">
                    <ListRow base={base} elementKey={cardBackKey(deck)} />
                </ul>
            )}
        </div>
    );
};

type CardDeckListProps = {
    base: ListBase;
    session: EditionSession | undefined;
    query: string;
    texts: DeckTexts;
};

export const CardDeckList = ({
    base,
    session,
    query,
    texts,
}: CardDeckListProps) => {
    const t = useTranslation();
    const { edition, interfaceLanguage } = base;
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
            [...deckCardKeys(edition.elements, deck), cardBackKey(deck)].some(
                (key) => shows(key, textOf(texts, deck, key)),
            ),
    );
    const deedBack = shows(cardBackKey('deed'));

    if (searching && decks.length === 0 && !deedBack) {
        return (
            <p role="status" className="m-0 px-2 py-3 text-base text-ink-soft">
                {t('editor.search_none', { query: query.trim() })}
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {decks.map((deck) => (
                <DeckSection
                    key={deck}
                    base={base}
                    deck={deck}
                    session={session}
                    searching={searching}
                    texts={texts}
                    shows={shows}
                />
            ))}
            {deedBack && (
                <div
                    className={cn(
                        'flex flex-col gap-1',
                        outClass(base, 'deeds'),
                    )}
                >
                    <ListHeading
                        base={base}
                        text={deckLabel(edition, 'deed', interfaceLanguage)}
                        part="deeds"
                    />
                    <ul className="m-0 list-none p-0">
                        <ListRow base={base} elementKey={cardBackKey('deed')} />
                    </ul>
                </div>
            )}
        </div>
    );
};
