import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from '@/hooks/use-translation';
import { makeShareImage } from '@/lib/boxes/api';
import { shareImageEdition } from '@/lib/boxes/snapshot';
import type { Edition } from '@/lib/edition/types';

interface ShareBoardDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    edition: Edition;
}

const FILE_NAME = 'printopoly-bord.png';

/**
 * "Deel je bord" (B202): a picture of the board for the group chat, made by a job on the server (B174) as soon as
 * the dialog opens, then saved or shared from here. Nothing is stored. It used to sit in Samen maken; it is for
 * everyone who wants to show their board, with or without a link for friends.
 */
export function ShareBoardDialog({
    open,
    onOpenChange,
    edition,
}: ShareBoardDialogProps) {
    const t = useTranslation();
    const [image, setImage] = useState<{ url: string; blob: Blob } | null>(
        null,
    );
    const [making, setMaking] = useState(false);
    const [failed, setFailed] = useState(false);
    const url = image?.url;
    useEffect(
        () => () => {
            if (url !== undefined) {
                URL.revokeObjectURL(url);
            }
        },
        [url],
    );

    const make = async (): Promise<void> => {
        setImage(null);
        setMaking(true);
        setFailed(false);
        try {
            const blob = await makeShareImage(shareImageEdition(edition));
            setImage({ url: URL.createObjectURL(blob), blob });
        } catch {
            setFailed(true);
        } finally {
            setMaking(false);
        }
    };

    // A new picture each time it opens: the board may have changed since.
    const makeNow = useRef(make);
    useEffect(() => {
        makeNow.current = make;
    });
    useEffect(() => {
        if (open) {
            void makeNow.current();
        }
    }, [open]);

    const file = (): File =>
        new File([image?.blob ?? new Blob()], FILE_NAME, {
            type: 'image/png',
        });
    const canShareFile =
        image !== null &&
        typeof navigator !== 'undefined' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file()] });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogTitle>{t('editor.share_board')}</DialogTitle>
                <DialogDescription>
                    {t('editor.share_board_lead')}
                </DialogDescription>
                <div className="mt-4 flex aspect-square w-full items-center justify-center overflow-hidden rounded-control border-2 border-ink bg-table">
                    {image !== null ? (
                        <img
                            src={image.url}
                            alt={t('collect.image_alt', { name: edition.name })}
                            width={1080}
                            height={1080}
                            className="size-full object-contain"
                        />
                    ) : making ? (
                        <span
                            role="status"
                            className="flex items-center gap-2 text-sm font-semibold text-ink-soft"
                        >
                            <Spinner />
                            {t('collect.image_making')}
                        </span>
                    ) : null}
                </div>
                {failed && (
                    <p
                        role="alert"
                        className="m-0 mt-3 text-sm font-semibold text-press"
                    >
                        {t('collect.image_failed')}
                    </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                    {image !== null && (
                        <Button asChild>
                            <a href={image.url} download={FILE_NAME}>
                                {t('collect.image_download')}
                            </a>
                        </Button>
                    )}
                    {canShareFile && (
                        <Button
                            variant="secondary"
                            onClick={() =>
                                void navigator
                                    .share({
                                        files: [file()],
                                        title: edition.name,
                                    })
                                    .catch(() => undefined)
                            }
                        >
                            {t('collect.image_share')}
                        </Button>
                    )}
                    {failed && (
                        <Button variant="secondary" onClick={() => void make()}>
                            {t('editor.share_board_again')}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
