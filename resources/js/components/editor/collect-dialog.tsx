import { useEffect, useRef, useState } from 'react';

import { CollectContribution } from '@/components/editor/collect-contribution';
import { RegistrationStrip } from '@/components/registration-strip';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { CollectionBox } from '@/hooks/use-collection-box';
import { useContributionDecision } from '@/hooks/use-contribution-decision';
import { useTranslation } from '@/hooks/use-translation';
import { makeShareImage } from '@/lib/boxes/api';
import { shareImageEdition } from '@/lib/boxes/snapshot';
import type { EditionRepository } from '@/lib/edition/repository';
import type { EditionSession } from '@/lib/edition/session';
import type { Edition, PhotoRecord } from '@/lib/edition/types';
import type { PhotoInfos } from '@/lib/editor/photo-cache';
import type { Locale } from '@/lib/game/types';

interface CollectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    collect: CollectionBox;
    session: EditionSession;
    edition: Edition;
    repository: EditionRepository;
    locale: Locale;
    photos: PhotoInfos;
    onPhoto: (record: PhotoRecord) => void;
}

function formatDate(at: number, locale: Locale): string {
    return new Intl.DateTimeFormat(locale === 'nl' ? 'nl-NL' : 'en-GB', {
        day: 'numeric',
        month: 'long',
    }).format(at);
}

/**
 * "Samen maken" (B128): the link for friends, what came in with a preview on the element, and the picture for the
 * group app (B77). Accepting applies the contribution to the local edition in this browser and then tells the
 * server; rejecting only tells the server.
 */
export function CollectDialog({
    open,
    onOpenChange,
    collect,
    session,
    edition,
    repository,
    locale,
    photos,
    onPhoto,
}: CollectDialogProps) {
    const t = useTranslation();
    const { box } = collect;
    const [copied, setCopied] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const copyTimer = useRef<number | undefined>(undefined);
    useEffect(() => () => window.clearTimeout(copyTimer.current), []);

    // Looking at the box refreshes it, so what arrived while the dialog was closed shows at once.
    const { refresh } = collect;
    useEffect(() => {
        if (open) {
            void refresh();
        }
    }, [open, refresh]);

    const copy = async (): Promise<void> => {
        if (box === null) {
            return;
        }
        try {
            await navigator.clipboard.writeText(box.url);
            setCopied(true);
            window.clearTimeout(copyTimer.current);
            copyTimer.current = window.setTimeout(() => setCopied(false), 2500);
        } catch {
            // The field is selectable: the person copies by hand.
        }
    };

    const canShare =
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function';

    const {
        decide: act,
        working,
        note,
        problem,
    } = useContributionDecision({
        collect,
        session,
        repository,
        locale,
        onPhoto,
    });

    const failed = collect.error ? t('collect.action_failed') : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl p-0">
                <RegistrationStrip className="h-2" />
                <div className="flex flex-col gap-6 p-6">
                    <div>
                        <DialogTitle>{t('collect.title')}</DialogTitle>
                        <DialogDescription>
                            {t('collect.intro')}
                        </DialogDescription>
                    </div>

                    {!collect.loaded && (
                        <p role="status" className="m-0 text-ink-soft">
                            {t('collect.working')}
                        </p>
                    )}

                    {collect.loaded && box === null && (
                        <div className="flex flex-col gap-3">
                            <Button
                                disabled={collect.busy}
                                onClick={() =>
                                    void collect.start().catch(() => undefined)
                                }
                            >
                                {collect.busy
                                    ? t('collect.starting')
                                    : t('collect.start')}
                            </Button>
                            {failed !== null && (
                                <p
                                    role="alert"
                                    className="m-0 text-sm font-semibold text-press"
                                >
                                    {failed}
                                </p>
                            )}
                        </div>
                    )}

                    {box !== null && (
                        <>
                            <section
                                aria-label={t('collect.link_label')}
                                className="flex flex-col gap-3 rounded-control border-2 border-ink bg-paper p-4"
                            >
                                <label
                                    htmlFor="collect-link"
                                    className="font-semibold"
                                >
                                    {t('collect.link_label')}
                                </label>
                                <Input
                                    id="collect-link"
                                    readOnly
                                    value={box.url}
                                    onFocus={(event) => event.target.select()}
                                    className="font-mono text-sm"
                                />
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        className="min-w-0 flex-1"
                                        disabled={box.status === 'closed'}
                                        onClick={() => void copy()}
                                    >
                                        {copied
                                            ? t('collect.copied')
                                            : t('collect.copy')}
                                    </Button>
                                    {canShare && (
                                        <Button
                                            variant="secondary"
                                            className="min-w-0 flex-1"
                                            disabled={box.status === 'closed'}
                                            onClick={() =>
                                                void navigator
                                                    .share({
                                                        title: edition.name,
                                                        text: t(
                                                            'collect.share_text',
                                                            {
                                                                name: edition.name,
                                                            },
                                                        ),
                                                        url: box.url,
                                                    })
                                                    .catch(() => undefined)
                                            }
                                        >
                                            {t('collect.share')}
                                        </Button>
                                    )}
                                </div>
                                <p className="m-0 text-sm text-ink-soft">
                                    {box.status === 'closed'
                                        ? t('collect.status_closed')
                                        : t('collect.expires', {
                                              date: formatDate(
                                                  box.expiresAt,
                                                  locale,
                                              ),
                                          })}
                                </p>
                            </section>

                            <section
                                aria-labelledby="collect-list"
                                className="flex flex-col gap-3"
                            >
                                <h3
                                    id="collect-list"
                                    className="m-0 font-display text-xl font-extrabold"
                                >
                                    {t('collect.list_title')}
                                    {box.contributions.length > 0 &&
                                        ` (${String(box.contributions.length)})`}
                                </h3>
                                {box.contributions.length === 0 ? (
                                    <p className="m-0 text-ink-soft">
                                        {t('collect.empty')}
                                    </p>
                                ) : (
                                    <ul className="m-0 flex list-none flex-col gap-3 p-0">
                                        {box.contributions.map(
                                            (contribution) => (
                                                <CollectContribution
                                                    key={contribution.id}
                                                    contribution={contribution}
                                                    edition={edition}
                                                    locale={locale}
                                                    photos={photos}
                                                    secret={collect.secret}
                                                    working={
                                                        working ===
                                                        contribution.id
                                                    }
                                                    disabled={
                                                        working !== null ||
                                                        collect.busy
                                                    }
                                                    onAccept={() =>
                                                        void act(
                                                            contribution,
                                                            'accept',
                                                        )
                                                    }
                                                    onReject={() =>
                                                        void act(
                                                            contribution,
                                                            'reject',
                                                        )
                                                    }
                                                />
                                            ),
                                        )}
                                    </ul>
                                )}
                                <div
                                    role="status"
                                    className="flex flex-col gap-1"
                                >
                                    {note !== null && (
                                        <p className="m-0 text-sm font-semibold">
                                            {note}
                                        </p>
                                    )}
                                    {(box.accepted > 0 || box.rejected > 0) && (
                                        <p className="m-0 text-sm text-ink-soft">
                                            {t('collect.counts', {
                                                accepted: box.accepted,
                                                rejected: box.rejected,
                                            })}
                                        </p>
                                    )}
                                </div>
                                {(problem ?? failed) !== null && (
                                    <p
                                        role="alert"
                                        className="m-0 text-sm font-semibold text-press"
                                    >
                                        {problem ?? failed}
                                    </p>
                                )}
                            </section>

                            <ShareImage edition={edition} />

                            <section className="flex flex-col gap-3 border-t-2 border-line pt-4">
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant="secondary"
                                        disabled={
                                            collect.busy ||
                                            box.status === 'closed'
                                        }
                                        onClick={() =>
                                            void collect
                                                .close()
                                                .catch(() => undefined)
                                        }
                                    >
                                        {t('collect.close')}
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        disabled={collect.busy}
                                        onClick={() =>
                                            void collect
                                                .renew()
                                                .catch(() => undefined)
                                        }
                                    >
                                        {t('collect.renew')}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        disabled={collect.busy}
                                        onClick={() =>
                                            setConfirmingDelete(true)
                                        }
                                    >
                                        {t('collect.delete')}
                                    </Button>
                                </div>
                                <p className="m-0 text-sm text-ink-soft">
                                    {t('collect.renew_hint')}
                                </p>
                                {confirmingDelete && (
                                    <div
                                        role="alertdialog"
                                        aria-label={t('collect.delete')}
                                        className="flex flex-col gap-3 rounded-control border-2 border-press p-4"
                                    >
                                        <p className="m-0 font-semibold">
                                            {t('collect.delete_confirm')}
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                disabled={collect.busy}
                                                onClick={() => {
                                                    setConfirmingDelete(false);
                                                    void collect
                                                        .remove()
                                                        .catch(() => undefined);
                                                }}
                                            >
                                                {t('collect.delete_yes')}
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                onClick={() =>
                                                    setConfirmingDelete(false)
                                                }
                                            >
                                                {t('collect.cancel')}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </section>
                        </>
                    )}

                    <DialogClose asChild>
                        <Button variant="secondary" className="self-start">
                            {t('app.done')}
                        </Button>
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/** "Plaatje voor de groepsapp" (B77): made on request, shown at once, saved or shared from here. Nothing is stored. */
function ShareImage({ edition }: { edition: Edition }) {
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

    const file = (): File =>
        new File([image?.blob ?? new Blob()], 'printopoly-groepsapp.png', {
            type: 'image/png',
        });
    const canShareFile =
        image !== null &&
        typeof navigator !== 'undefined' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file()] });

    return (
        <section
            aria-labelledby="collect-image"
            className="flex flex-col gap-3 rounded-control border-2 border-ink bg-board p-4"
        >
            <h3
                id="collect-image"
                className="m-0 font-display text-xl font-extrabold"
            >
                {t('collect.image_title')}
            </h3>
            <p className="m-0 text-ink-soft">{t('collect.image_body')}</p>
            {image !== null && (
                <img
                    src={image.url}
                    alt={t('collect.image_alt', { name: edition.name })}
                    width={1080}
                    height={1080}
                    className="aspect-square w-full max-w-xs self-center rounded-control border-2 border-ink bg-card"
                />
            )}
            <div className="flex flex-wrap gap-2">
                <Button
                    variant={image === null ? 'primary' : 'secondary'}
                    disabled={making}
                    onClick={() => void make()}
                >
                    {making
                        ? t('collect.image_making')
                        : t('collect.image_make')}
                </Button>
                {image !== null && (
                    <Button asChild variant="secondary">
                        <a href={image.url} download="printopoly-groepsapp.png">
                            {t('collect.image_download')}
                        </a>
                    </Button>
                )}
                {canShareFile && (
                    <Button
                        variant="secondary"
                        onClick={() =>
                            void navigator
                                .share({ files: [file()], title: edition.name })
                                .catch(() => undefined)
                        }
                    >
                        {t('collect.image_share')}
                    </Button>
                )}
            </div>
            {failed && (
                <p
                    role="alert"
                    className="m-0 text-sm font-semibold text-press"
                >
                    {t('collect.image_failed')}
                </p>
            )}
        </section>
    );
}
