import { editElement } from '@/features/edition/editor/edit';
import {
    ListHeading,
    ListRow,
    outClass,
    type ListBase,
} from '@/features/edition/editor/element-list-parts';
import { NameRow } from '@/features/edition/editor/name-row';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import {
    BOX_LID_KEY,
    HOUSE_RULES_KEY,
    INVITATION_KEY,
    PAWN_COUNT,
    pawnKey,
} from '@/lib/render/edition-keys';
import type { Edition } from '@/lib/render/edition-types';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import { cn } from '@/lib/utils';

const PawnToken = ({
    pawn: key,
    edition,
    photos,
}: {
    pawn: string;
    edition: Edition;
    photos: PhotoInfos | undefined;
}) => {
    const placement = edition.elements[key]?.photo;
    const url =
        placement === undefined
            ? undefined
            : photos?.get(placement.photoId)?.url;

    // The round token is the photo of the pawn when it has one (R6 Sara, Kees; R5 Mo).
    return (
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
};

type BoxElementListProps = {
    base: ListBase;
    session: EditionSession | undefined;
    onFocusRow: (key: string) => void;
    onAnnounce: (text: string) => void;
    photos: PhotoInfos | undefined;
};

type PawnRowsProps = Omit<BoxElementListProps, 'session'> & {
    pawns: string[];
    hiddenPawn: string | undefined;
    session: EditionSession | undefined;
};

const PawnRows = ({
    base,
    pawns,
    hiddenPawn,
    session,
    onFocusRow,
    onAnnounce,
    photos,
}: PawnRowsProps) => {
    const t = useTranslation();
    const { edition, interfaceLanguage, selected, onSelect, warned } = base;

    return (
        <ul data-name-list className="m-0 list-none p-0">
            {pawns.map((key) => {
                const token = (
                    <PawnToken pawn={key} edition={edition} photos={photos} />
                );

                return session === undefined ? (
                    <ListRow
                        key={key}
                        base={base}
                        elementKey={key}
                        leading={token}
                    />
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
    );
};

export const BoxElementList = ({
    base,
    session,
    onFocusRow,
    onAnnounce,
    photos,
}: BoxElementListProps) => {
    const t = useTranslation();
    const { edition } = base;
    const visiblePawns = Array.from({ length: PAWN_COUNT }, (_, i) =>
        pawnKey(i + 1),
    ).filter((key) => edition.elements[key]?.hidden !== true);
    const hiddenPawn = Array.from({ length: PAWN_COUNT }, (_, i) =>
        pawnKey(i + 1),
    ).find((key) => edition.elements[key]?.hidden === true);

    return (
        <div className="flex flex-col gap-3">
            <ul className="m-0 list-none p-0">
                <ListRow base={base} elementKey={BOX_LID_KEY} part="boxLid" />
            </ul>
            <div className={cn('flex flex-col gap-1', outClass(base, 'pawns'))}>
                <ListHeading
                    base={base}
                    text={t('editor.pawns_count', {
                        count: visiblePawns.length,
                        total: PAWN_COUNT,
                    })}
                    part="pawns"
                />
                <PawnRows
                    base={base}
                    pawns={visiblePawns}
                    hiddenPawn={hiddenPawn}
                    session={session}
                    onFocusRow={onFocusRow}
                    onAnnounce={onAnnounce}
                    photos={photos}
                />
            </div>
            <ul className="m-0 list-none border-t border-line p-0 pt-2">
                <ListRow
                    base={base}
                    elementKey={HOUSE_RULES_KEY}
                    part="houseRules"
                />
                <ListRow
                    base={base}
                    elementKey={INVITATION_KEY}
                    part="invitation"
                />
            </ul>
        </div>
    );
};
