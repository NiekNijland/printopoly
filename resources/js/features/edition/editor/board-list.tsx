import { useState } from 'react';

import { CenterRow, SpaceRow } from '@/features/edition/editor/board-list-rows';
import { matchesQuery } from '@/features/edition/editor/name-list';
import type { PhotoDrag } from '@/features/edition/editor/row-photo';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import { BOARD_CENTER_KEY, spaceKey } from '@/lib/render/edition-keys';
import type { Edition } from '@/lib/render/edition-types';
import { boardGroups, elementLabel } from '@/lib/render/editor-catalogue';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import { STRINGS } from '@/lib/render/strings';
import type { Locale } from '@/types/game';

type BoardListProps = {
    edition: Edition;
    interfaceLanguage: Locale;
    selected: string;
    /** Opens a space: the swatch of a row, or a row without a name of its own. */
    onSelect: (key: string) => void;
    /** Typing in a row shows that space, without leaving the list (B161). */
    onFocusRow?: (key: string) => void;
    warned: ReadonlySet<string>;
    session: EditionSession;
    /** The search above the list: only spaces whose name holds it (B161). */
    query?: string;
    onAnnounce?: (text: string) => void;
    /** The photos of this browser: a space with a photo shows it small in its row (B238). */
    photos?: PhotoInfos;
    /** A photo dragged from one row to another: the two spaces trade photos, or it moves (B238). */
    onSwapPhoto?: (from: string, to: string) => void;
};

/** Name of a corner for the side headings: "Start", "Op bezoek", "Vrij parkeren". */
const cornerName = (
    position: number,
    edition: Edition,
    interfaceLanguage: Locale,
): string => {
    if (position === 10) {
        return STRINGS[interfaceLanguage].justVisiting;
    }

    return elementLabel(
        spaceKey(position),
        { ...edition, elements: {} },
        interfaceLanguage,
    );
};

const listGroups = (
    query: string,
    edition: Edition,
    interfaceLanguage: Locale,
) =>
    boardGroups()
        .map((group) => ({
            ...group,
            keys: group.keys.filter((key) =>
                matchesQuery(
                    query,
                    elementLabel(key, edition, interfaceLanguage),
                ),
            ),
        }))
        .filter((group) => group.keys.length > 0);

/**
 * The same spaces as a list per board side, under the navigator (B93). Every space with a name of its own has
 * it as a field in its row (B161); a search narrows the list down.
 */
export const BoardList = ({
    edition,
    interfaceLanguage,
    selected,
    onSelect,
    onFocusRow = onSelect,
    warned,
    session,
    query = '',
    onAnnounce = () => undefined,
    photos,
    onSwapPhoto,
}: BoardListProps) => {
    const t = useTranslation();
    // A photo dragged between rows (B238): where it comes from and the row it hovers over.
    const [photoDrag, setPhotoDrag] = useState<PhotoDrag | null>(null);
    const groups = listGroups(query, edition, interfaceLanguage);
    const showCenter = matchesQuery(
        query,
        elementLabel(BOARD_CENTER_KEY, edition, interfaceLanguage),
    );

    if (groups.length === 0 && !showCenter) {
        return (
            <p role="status" className="m-0 px-2 py-3 text-base text-ink-soft">
                {t('editor.search_none', { query: query.trim() })}
            </p>
        );
    }

    return (
        <ul data-name-list className="m-0 flex list-none flex-col gap-1 p-0">
            {/* The centre is part of the board, so the list names it too: name, photo or logo (UX 9). */}
            {showCenter && (
                <CenterRow
                    edition={edition}
                    interfaceLanguage={interfaceLanguage}
                    selected={selected === BOARD_CENTER_KEY}
                    warned={warned.has(BOARD_CENTER_KEY)}
                    onSelect={() => onSelect(BOARD_CENTER_KEY)}
                />
            )}
            {groups.map((group) => (
                <li key={group.from} className="flex flex-col">
                    <span className="px-2 py-1 text-sm font-semibold text-ink-soft">
                        {t('editor.side', {
                            from: cornerName(
                                group.from,
                                edition,
                                interfaceLanguage,
                            ),
                            to: cornerName(
                                group.to,
                                edition,
                                interfaceLanguage,
                            ),
                        })}
                    </span>
                    <ul className="m-0 flex list-none flex-col p-0">
                        {group.keys.map((key) => (
                            <SpaceRow
                                key={key}
                                elementKey={key}
                                edition={edition}
                                interfaceLanguage={interfaceLanguage}
                                session={session}
                                selected={selected === key}
                                warned={warned.has(key)}
                                onSelect={onSelect}
                                onFocusRow={onFocusRow}
                                onAnnounce={onAnnounce}
                                photos={photos}
                                onSwapPhoto={onSwapPhoto}
                                photoDrag={photoDrag}
                                setPhotoDrag={setPhotoDrag}
                            />
                        ))}
                    </ul>
                </li>
            ))}
        </ul>
    );
};
