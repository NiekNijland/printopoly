import { useTranslation } from '@/hooks/use-translation';
import {
    BOX_LID_KEY,
    cardBackKey,
    cardKey,
    noteKey,
    pawnKey,
} from '@/lib/edition/keys';
import type { Edition } from '@/lib/edition/types';
import { deckName, elementLabel, type EditorTab } from '@/lib/editor/catalogue';
import { standardEdition } from '@/lib/game/standard-edition';
import type { Locale } from '@/lib/game/types';
import { cn } from '@/lib/utils';

interface ElementListProps {
    tab: Exclude<EditorTab, 'board'>;
    edition: Edition;
    interfaceLanguage: Locale;
    selected: string;
    onSelect: (key: string) => void;
    warned: ReadonlySet<string>;
}

/** The elements of the Kaarten, Geld and Doos tabs, as lists next to the preview (B93). */
export function ElementList({
    tab,
    edition,
    interfaceLanguage,
    selected,
    onSelect,
    warned,
}: ElementListProps) {
    const t = useTranslation();

    const row = (key: string, label?: string) => (
        <li key={key}>
            <button
                type="button"
                aria-current={selected === key}
                onClick={() => onSelect(key)}
                className={cn(
                    'flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-control border-0 bg-transparent px-2 text-left text-base',
                    selected === key && 'bg-card font-semibold',
                )}
            >
                <span className="flex-1">
                    {label ?? elementLabel(key, edition, interfaceLanguage)}
                </span>
                {edition.elements[key] !== undefined && (
                    <span
                        aria-label={t('editor.customized')}
                        className="size-2 rounded-full bg-ink"
                    />
                )}
                {warned.has(key) && (
                    <span aria-label={t('editor.has_warning')}>!</span>
                )}
            </button>
        </li>
    );

    const heading = (text: string) => (
        <span className="px-2 py-1 text-xs font-semibold text-ink-soft uppercase">
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
                                                    'relative flex h-11 w-full cursor-pointer items-center justify-center rounded-control border-2 border-ink bg-card text-base',
                                                    selected === key &&
                                                        'bg-ink text-paper',
                                                )}
                                            >
                                                {index + 1}
                                                {warned.has(key) && (
                                                    <span className="font-bold absolute top-0 right-1 text-xs">
                                                        !
                                                    </span>
                                                )}
                                                {edition.elements[key] !==
                                                    undefined && (
                                                    <span className="absolute right-1 bottom-1 size-1.5 rounded-full bg-current" />
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

    if (tab === 'money') {
        return (
            <ul className="m-0 list-none p-0">
                {standardEdition.money.notes.map((note) =>
                    row(noteKey(note.value)),
                )}
            </ul>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {edition.parts.boxLid && (
                <ul className="m-0 list-none p-0">{row(BOX_LID_KEY)}</ul>
            )}
            {edition.parts.pawns && (
                <div className="flex flex-col gap-1">
                    {heading(t('editor.pawns'))}
                    <ul className="m-0 list-none p-0">
                        {Array.from({ length: 8 }, (_, i) =>
                            row(pawnKey(i + 1)),
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
