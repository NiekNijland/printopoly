import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { makeShareImage } from '@/features/edition/boxes/api';
import { useTranslation } from '@/hooks/use-translation';
import type { Edition, PhotoRecord } from '@/lib/render/edition-types';
import { shareBoardRequest } from '@/lib/render/editor-share-board';

type ShareBoardDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    edition: Edition;
    /** The photos of this browser, so the picture shows them (R5-24). */
    getPhoto?: (id: string) => Promise<PhotoRecord | undefined>;
};

const NO_PHOTO = (): Promise<undefined> => Promise.resolve(undefined);

const FILE_NAME = 'printopoly-bord.png';

const useShareImage = (
    open: boolean,
    edition: Edition,
    getPhoto: (id: string) => Promise<PhotoRecord | undefined>,
) => {
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

    const running = useRef<AbortController | null>(null);
    const make = async (): Promise<void> => {
        running.current?.abort();
        const run = new AbortController();
        running.current = run;
        setImage(null);
        setMaking(true);
        setFailed(false);
        try {
            const blob = await makeShareImage(
                await shareBoardRequest(edition, getPhoto),
                { signal: run.signal },
            );
            if (!run.signal.aborted) {
                setImage({ url: URL.createObjectURL(blob), blob });
            }
        } catch {
            if (!run.signal.aborted) {
                setFailed(true);
            }
        } finally {
            if (!run.signal.aborted) {
                setMaking(false);
            }
        }
    };

    // A new picture each time it opens: the board may have changed since.
    const makeNow = useRef(make);
    useEffect(() => {
        makeNow.current = make;
    });
    // Closing the dialog stops asking for the picture.
    useEffect(() => {
        if (!open) {
            return undefined;
        }
        void makeNow.current();

        return () => running.current?.abort();
    }, [open]);

    return { image, making, failed, make };
};

type ShareActionsProps = {
    image: { url: string; blob: Blob } | null;
    canShareFile: boolean;
    failed: boolean;
    file: () => File;
    title: string;
    onAgain: () => void;
};

const ShareActions = ({
    image,
    canShareFile,
    failed,
    file,
    title,
    onAgain,
}: ShareActionsProps) => {
    const t = useTranslation();

    return (
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
                                title,
                            })
                            .catch(() => undefined)
                    }
                >
                    {t('collect.image_share')}
                </Button>
            )}
            {failed && (
                <Button variant="secondary" onClick={onAgain}>
                    {t('editor.share_board_again')}
                </Button>
            )}
        </div>
    );
};

/**
 * "Deel je bord" (B202, B228): a picture of the board as it is, with its photos and own words, for the group chat.
 * A job on the server makes it (B174) as soon as the dialog opens; it is saved or shared from here. Nothing is stored.
 */
export const ShareBoardDialog = ({
    open,
    onOpenChange,
    edition,
    getPhoto = NO_PHOTO,
}: ShareBoardDialogProps) => {
    const t = useTranslation();
    const { image, making, failed, make } = useShareImage(
        open,
        edition,
        getPhoto,
    );

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
                <ShareActions
                    image={image}
                    canShareFile={canShareFile}
                    failed={failed}
                    file={file}
                    title={edition.name}
                    onAgain={() => void make()}
                />
            </DialogContent>
        </Dialog>
    );
};
