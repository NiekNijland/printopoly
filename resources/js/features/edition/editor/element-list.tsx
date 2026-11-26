import { useMemo } from 'react';

import { BoxElementList } from '@/features/edition/editor/box-element-list';
import { CardDeckList } from '@/features/edition/editor/card-deck-list';
import {
    ListHeading,
    ListRow,
    isOut,
    outClass,
    type ListBase,
} from '@/features/edition/editor/element-list-parts';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import { noteKey } from '@/lib/render/edition-keys';
import { resolveEdition } from '@/lib/render/edition-resolve';
import type { Edition, PartId } from '@/lib/render/edition-types';
import type { EditorTab } from '@/lib/render/editor-catalogue';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import { standardEdition } from '@/lib/render/standard-edition';
import { cn } from '@/lib/utils';
import type { Locale } from '@/types/game';

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

const MoneyList = ({ base }: { base: ListBase }) => {
    const t = useTranslation();

    return (
        <div className={cn('flex flex-col gap-1', outClass(base, 'money'))}>
            {isOut(base, 'money') && (
                <ListHeading
                    base={base}
                    text={t('editor.money_notes')}
                    part="money"
                />
            )}
            <ul className="m-0 list-none p-0">
                {standardEdition.money.notes.map((note) => (
                    <ListRow
                        key={noteKey(note.value)}
                        base={base}
                        elementKey={noteKey(note.value)}
                        leading={
                            <span
                                aria-hidden
                                className="rounded-sm h-4 w-7 flex-none border border-ink"
                                style={{
                                    background:
                                        base.edition.elements[
                                            noteKey(note.value)
                                        ]?.color ?? note.color,
                                }}
                            />
                        }
                    />
                ))}
            </ul>
        </div>
    );
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
    const base: ListBase = {
        edition,
        interfaceLanguage,
        selected,
        onSelect,
        warned,
        inSet,
    };
    // The first words of every card, so a tile says what is on the card and not only its number.
    const texts = useMemo(() => resolveEdition(edition).decks, [edition]);

    if (tab === 'cards') {
        return (
            <CardDeckList
                base={base}
                session={session}
                query={query}
                texts={texts}
            />
        );
    }

    if (tab === 'money') {
        return <MoneyList base={base} />;
    }

    return (
        <BoxElementList
            base={base}
            session={session}
            onFocusRow={onFocusRow}
            onAnnounce={onAnnounce}
            photos={photos}
        />
    );
};
