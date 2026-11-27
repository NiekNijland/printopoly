import { usePage } from '@inertiajs/react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import { spaceKey } from '@/lib/render/edition-keys';
import type { Edition } from '@/lib/render/edition-types';
import { elementLabel, isCustomized } from '@/lib/render/editor-catalogue';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import {
    photoSwapChanges,
    photoSwapTargets,
} from '@/lib/render/editor-photo-swap';
import { swapChanges, swapTargets } from '@/lib/render/editor-swap';
import { standardEdition } from '@/lib/render/standard-edition';
import { THEMES } from '@/lib/render/themes';
import { cn } from '@/lib/utils';

type SwapDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    session: EditionSession;
    edition: Edition;
    editKey: string;
    title: string;
    onSwapped: (other: string) => void;
};

/**
 * "Wisselen met…" from the menu of a street, station or utility: the spaces of the same kind, with their colour,
 * in board order. Dragging on the mini board and W keep working.
 */
export const SwapDialog = ({
    open,
    onOpenChange,
    session,
    edition,
    editKey,
    title,
    onSwapped,
}: SwapDialogProps) => {
    const t = useTranslation();
    const { locale } = usePage().props;
    const position = Number(editKey.split('.')[1]);
    const groups = new Map(
        standardEdition.groups.map((group) => [
            group.id,
            edition.elements[`group.${group.id}`]?.color ?? group.color,
        ]),
    );
    const theme = THEMES[edition.theme];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>
                    {t('editor.swap_title', { name: title })}
                </DialogTitle>
                <DialogDescription>{t('editor.swap_intro')}</DialogDescription>
                <ul className="m-0 mt-4 flex max-h-[50dvh] list-none flex-col overflow-auto border-t border-line p-0">
                    {swapTargets(position).map((other) => {
                        const key = spaceKey(other);
                        const space = standardEdition.spaces[other];
                        const name = elementLabel(key, edition, locale);

                        return (
                            <li key={key} className="border-b border-line">
                                <button
                                    type="button"
                                    data-swap-target={key}
                                    onClick={() => {
                                        session.apply(
                                            swapChanges(
                                                session.edition,
                                                position,
                                                other,
                                            ),
                                        );
                                        onSwapped(name);
                                    }}
                                    className="flex min-h-12 w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-2 text-left text-base hover:bg-table"
                                >
                                    <span
                                        aria-hidden="true"
                                        className="rounded-sm size-4 shrink-0 border border-ink"
                                        style={{
                                            background:
                                                space?.type === 'street'
                                                    ? groups.get(space.group)
                                                    : theme.boardBackground,
                                        }}
                                    />
                                    <span className="flex-1">{name}</span>
                                    {isCustomized(edition, key) && (
                                        <span className="text-xs text-ink-soft">
                                            {t('editor.customized')}
                                        </span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
                <div className="mt-4 flex justify-end">
                    <DialogClose asChild>
                        <Button variant="secondary">{t('dialog.close')}</Button>
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    );
};

type PhotoSwapDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    session: EditionSession;
    edition: Edition;
    editKey: string;
    title: string;
    photos?: PhotoInfos;
    /** After the swap, with the words for the status line. */
    onDone: (text: string) => void;
};

const PhotoSwapRow = ({
    target,
    session,
    edition,
    editKey,
    title,
    photos,
    onDone,
    color,
}: Omit<PhotoSwapDialogProps, 'open' | 'onOpenChange'> & {
    target: string;
    color: string;
}) => {
    const t = useTranslation();
    const { locale } = usePage().props;
    const name = elementLabel(target, edition, locale);
    const placement = edition.elements[target]?.photo;
    const done =
        placement === undefined
            ? 'editor.photo_move_done'
            : 'editor.photo_swap_done';
    const url =
        placement === undefined
            ? undefined
            : photos?.get(placement.photoId)?.url;

    return (
        <li className="border-b border-line">
            <button
                type="button"
                data-photo-swap-target={target}
                onClick={() => {
                    session.apply(
                        photoSwapChanges(session.edition, editKey, target),
                    );
                    onDone(t(done, { a: title, b: name }));
                }}
                className="flex min-h-14 w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-2 py-1 text-left text-base hover:bg-table"
            >
                <span
                    aria-hidden="true"
                    className={cn(
                        'size-10 shrink-0 overflow-hidden rounded-control border',
                        placement === undefined
                            ? 'border-dashed border-line-strong bg-paper'
                            : 'border-line-strong bg-table',
                    )}
                >
                    {url !== undefined && (
                        <img
                            src={url}
                            alt=""
                            className="size-full object-cover"
                            style={{
                                filter: placement?.grayscale
                                    ? 'grayscale(1)'
                                    : undefined,
                            }}
                        />
                    )}
                </span>
                <span
                    aria-hidden="true"
                    className="rounded-sm size-4 shrink-0 border border-ink"
                    style={{ background: color }}
                />
                <span className="flex-1">{name}</span>
                {placement === undefined && (
                    <span className="text-xs text-ink-soft">
                        {t('editor.photo_swap_none')}
                    </span>
                )}
            </button>
        </li>
    );
};

/**
 * "Foto wisselen met…" (B238): every street, station and utility in board order, each with its photo or "nog geen
 * foto". A space with a photo trades photos; a space without one gets this photo. Names and title deeds stay.
 */
export const PhotoSwapDialog = ({
    open,
    onOpenChange,
    session,
    edition,
    editKey,
    title,
    photos,
    onDone,
}: PhotoSwapDialogProps) => {
    const t = useTranslation();
    const theme = THEMES[edition.theme];
    // The colour of each street's group, as in "Wisselen met…", so a space is found by its colour too.
    const colorOf = (key: string): string => {
        const space = standardEdition.spaces[Number(key.split('.')[1])];

        return space?.type === 'street'
            ? (edition.elements[`group.${space.group}`]?.color ??
                  standardEdition.groups.find(
                      (group) => group.id === space.group,
                  )?.color ??
                  theme.boardBackground)
            : theme.boardBackground;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>
                    {t('editor.photo_swap_title', { name: title })}
                </DialogTitle>
                <DialogDescription>
                    {t('editor.photo_swap_intro')}
                </DialogDescription>
                <ul className="m-0 mt-4 flex max-h-[50dvh] list-none flex-col overflow-auto border-t border-line p-0">
                    {photoSwapTargets(editKey).map((key) => (
                        <PhotoSwapRow
                            key={key}
                            target={key}
                            session={session}
                            edition={edition}
                            editKey={editKey}
                            title={title}
                            photos={photos}
                            onDone={onDone}
                            color={colorOf(key)}
                        />
                    ))}
                </ul>
                <div className="mt-4 flex justify-end">
                    <DialogClose asChild>
                        <Button variant="secondary">{t('dialog.close')}</Button>
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export const ResetDialog = ({
    open,
    onOpenChange,
    title,
    onReset,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    onReset: () => void;
}) => {
    const t = useTranslation();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>{t('editor.reset_confirm_title')}</DialogTitle>
                <DialogDescription>
                    {t('editor.reset_confirm_photo', { name: title })}
                </DialogDescription>
                <div className="mt-6 flex flex-wrap justify-end gap-2">
                    <DialogClose asChild>
                        <Button variant="secondary">{t('app.cancel')}</Button>
                    </DialogClose>
                    <Button onClick={onReset}>{t('editor.reset')}</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
