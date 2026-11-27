import type { Dispatch, ReactNode, SetStateAction } from 'react';

import { WarningIcon } from '@/components/ui/icons';
import { groupColor } from '@/features/edition/editor/board-grid';
import { isNameable } from '@/features/edition/editor/name-list';
import { NameRow } from '@/features/edition/editor/name-row';
import {
    RowPhoto,
    photoDrop,
    type PhotoDrag,
} from '@/features/edition/editor/row-photo';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import { BOARD_CENTER_KEY } from '@/lib/render/edition-keys';
import type { Edition } from '@/lib/render/edition-types';
import { elementLabel, isCustomized } from '@/lib/render/editor-catalogue';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import { cn } from '@/lib/utils';
import type { Locale } from '@/types/game';

export const CenterRow = ({
    edition,
    interfaceLanguage,
    selected,
    warned,
    onSelect,
}: {
    edition: Edition;
    interfaceLanguage: Locale;
    selected: boolean;
    warned: boolean;
    onSelect: () => void;
}) => {
    const t = useTranslation();

    return (
        <li>
            <button
                type="button"
                tabIndex={-1}
                aria-current={selected}
                onClick={onSelect}
                className={cn(
                    'flex min-h-12 w-full cursor-pointer items-center gap-2 rounded-control border-2 border-dashed border-line-strong bg-board/60 px-2 text-left text-base',
                    selected
                        ? 'border-solid border-ink bg-card font-semibold shadow-[inset_4px_0_0_var(--color-press)]'
                        : 'hover:bg-board',
                )}
            >
                <span
                    aria-hidden="true"
                    className="rounded-sm grid size-4 shrink-0 place-items-center border border-line-strong bg-board-deep"
                >
                    <span className="size-1.5 rounded-full bg-ink" />
                </span>
                <span className="flex-1">
                    {elementLabel(BOARD_CENTER_KEY, edition, interfaceLanguage)}
                    <span className="block text-sm font-normal text-ink-soft">
                        {t('editor.center_row_hint')}
                    </span>
                </span>
                {isCustomized(edition, BOARD_CENTER_KEY) && (
                    <span
                        aria-label={t('editor.customized')}
                        className="size-2 rounded-full bg-ink"
                    />
                )}
                {warned && (
                    <WarningIcon
                        size={18}
                        aria-label={t('editor.has_warning')}
                    />
                )}
            </button>
        </li>
    );
};

const PlainRow = ({
    elementKey: key,
    edition,
    interfaceLanguage,
    selected,
    warned,
    swatch,
    onSelect,
}: {
    elementKey: string;
    edition: Edition;
    interfaceLanguage: Locale;
    selected: boolean;
    warned: boolean;
    swatch: ReactNode;
    onSelect: (key: string) => void;
}) => {
    const t = useTranslation();

    return (
        <li>
            <button
                type="button"
                tabIndex={-1}
                aria-current={selected}
                data-row-open={key}
                onClick={() => onSelect(key)}
                className={cn(
                    'flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-control border-0 bg-transparent pr-2 pl-3 text-left text-base',
                    selected
                        ? 'bg-card font-semibold shadow-[inset_4px_0_0_var(--color-press)]'
                        : 'hover:bg-card/60',
                )}
            >
                {swatch}
                <span className="flex-1 pl-3.5">
                    {elementLabel(key, edition, interfaceLanguage)}
                </span>
                {isCustomized(edition, key) && (
                    <span
                        aria-label={t('editor.customized')}
                        className="size-2 rounded-full bg-ink"
                    />
                )}
                {warned && (
                    <WarningIcon
                        size={18}
                        aria-label={t('editor.has_warning')}
                    />
                )}
            </button>
        </li>
    );
};

type SpaceRowProps = {
    elementKey: string;
    edition: Edition;
    interfaceLanguage: Locale;
    session: EditionSession;
    selected: boolean;
    warned: boolean;
    onSelect: (key: string) => void;
    onFocusRow: (key: string) => void;
    onAnnounce: (text: string) => void;
    photos: PhotoInfos | undefined;
    onSwapPhoto: ((from: string, to: string) => void) | undefined;
    photoDrag: PhotoDrag | null;
    setPhotoDrag: Dispatch<SetStateAction<PhotoDrag | null>>;
};

export const SpaceRow = ({
    elementKey: key,
    edition,
    interfaceLanguage,
    session,
    selected,
    warned,
    onSelect,
    onFocusRow,
    onAnnounce,
    photos,
    onSwapPhoto,
    photoDrag,
    setPhotoDrag,
}: SpaceRowProps) => {
    const t = useTranslation();
    const label = elementLabel(key, edition, interfaceLanguage);
    const swatch = (
        <span
            aria-hidden="true"
            className="rounded-sm size-4 shrink-0 border border-line-strong"
            style={{
                background:
                    groupColor(Number(key.split('.')[1]), edition) ??
                    'transparent',
            }}
        />
    );

    return isNameable(key) ? (
        <NameRow
            elementKey={key}
            edition={edition}
            interfaceLanguage={interfaceLanguage}
            session={session}
            selected={selected}
            warned={warned}
            leading={swatch}
            onOpen={onSelect}
            onFocusRow={onFocusRow}
            onAnnounce={onAnnounce}
            trailing={
                <RowPhoto
                    elementKey={key}
                    edition={edition}
                    photos={photos}
                    label={label}
                    draggable={onSwapPhoto !== undefined}
                    dragged={photoDrag?.from === key}
                    onDragStart={() => {
                        setPhotoDrag({
                            from: key,
                            over: null,
                        });
                        onAnnounce(
                            t('editor.photo_dragging', {
                                name: label,
                            }),
                        );
                    }}
                    onDragEnd={() => setPhotoDrag(null)}
                />
            }
            drop={photoDrop(key, photoDrag, setPhotoDrag, onSwapPhoto)}
            dropping={photoDrag?.over === key}
        />
    ) : (
        <PlainRow
            elementKey={key}
            edition={edition}
            interfaceLanguage={interfaceLanguage}
            selected={selected}
            warned={warned}
            swatch={swatch}
            onSelect={onSelect}
        />
    );
};
