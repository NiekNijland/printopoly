import type { MouseEvent } from 'react';

import { Board } from '@/components/render/board';
import { boardPropsOf } from '@/components/render/board-props';
import {
    ElementPreview,
    editorSources,
    previewSize,
} from '@/components/render/editor-element-preview';
import { Scaled } from '@/components/render/table-scaled';
import { useTranslation } from '@/hooks/use-translation';
import {
    PAWN_COUNT,
    deckCardKeys,
    deedKey,
    noteKey,
    pawnKey,
    BOX_LID_KEY,
    HOUSE_RULES_KEY,
    INVITATION_KEY,
    spaceKey,
} from '@/lib/render/edition-keys';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import type { Edition } from '@/lib/render/edition-types';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import { standardEdition } from '@/lib/render/standard-edition';

export type PreviewTab =
    | 'board'
    | 'deeds'
    | 'cards'
    | 'money'
    | 'pawns'
    | 'box'
    | 'houseRules'
    | 'invitation';

/** How wide one item of a tab is drawn, in px: small for cards, large for sheets. */
const ITEM_WIDTH: Partial<Record<PreviewTab, number>> = {
    money: 300,
    box: 300,
    houseRules: 220,
    invitation: 420,
};

/** The keys shown on a tab, in order. */
const keysOf = (tab: PreviewTab, edition: Edition): string[] => {
    switch (tab) {
        case 'deeds':
            return Array.from(
                { length: standardEdition.components.titleDeeds },
                (_, i) => deedKey(i + 1),
            );
        case 'cards':
            return (['chance', 'chest'] as const).flatMap((deck) =>
                deckCardKeys(edition.elements, deck),
            );
        case 'money':
            return standardEdition.money.notes.map((note) =>
                noteKey(note.value),
            );
        case 'pawns':
            return Array.from({ length: PAWN_COUNT }, (_, i) =>
                pawnKey(i + 1),
            ).filter((key) => edition.elements[key]?.hidden !== true);
        case 'box':
            return [BOX_LID_KEY];
        case 'houseRules':
            return [HOUSE_RULES_KEY];
        case 'invitation':
            return [INVITATION_KEY];
        case 'board':
            return [];
    }
};

type PreviewItemsProps = {
    active: Exclude<PreviewTab, 'board'>;
    edition: Edition;
    resolved: ResolvedEdition;
    photos: PhotoInfos;
    onJump: (key: string) => void;
};

export const PreviewItems = ({
    active,
    edition,
    resolved,
    photos,
    onJump,
}: PreviewItemsProps) => {
    const t = useTranslation();

    return (
        <ul className="m-0 flex list-none flex-wrap justify-center gap-3 p-0">
            {keysOf(active, edition).map((key) => {
                const size = previewSize({ key }, edition);
                const itemWidth = ITEM_WIDTH[active] ?? 150;

                return (
                    <li key={key}>
                        <button
                            type="button"
                            onClick={() => onJump(key)}
                            aria-label={t('editor.preview_open', {
                                key,
                            })}
                            className="cursor-pointer rounded-control border-2 border-transparent bg-transparent p-1 hover:border-ink focus-visible:border-ink"
                        >
                            <Scaled
                                widthMm={size.w}
                                heightMm={size.h}
                                width={itemWidth}
                            >
                                <ElementPreview
                                    target={{ key }}
                                    resolved={resolved}
                                    photos={photos}
                                />
                            </Scaled>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
};

type PreviewBoardProps = {
    width: number;
    resolved: ResolvedEdition;
    photos: PhotoInfos;
    onJump: (key: string) => void;
};

export const PreviewBoard = ({
    width,
    resolved,
    photos,
    onJump,
}: PreviewBoardProps) => {
    const onBoardClick = (event: MouseEvent<HTMLDivElement>): void => {
        const target = event.target;
        const position =
            target instanceof Element
                ? target.closest<HTMLElement>('[data-position]')?.dataset
                      .position
                : undefined;

        if (position !== undefined) {
            onJump(spaceKey(Number(position)));
        }
    };

    return (
        <div
            role="presentation"
            onClick={onBoardClick}
            className="mx-auto w-fit cursor-pointer"
            style={{ width }}
        >
            <Scaled
                widthMm={resolved.boardProfile.outer}
                heightMm={resolved.boardProfile.outer}
                width={width}
            >
                {/* The same board as the editor and the print (bug 5 of ronde 3). */}
                <Board {...boardPropsOf(resolved, editorSources(photos))} />
            </Scaled>
        </div>
    );
};
