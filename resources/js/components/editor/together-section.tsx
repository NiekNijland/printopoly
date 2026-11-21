import { useEffect, useRef, useState } from 'react';

import { ChevronLeftIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CollectionBox } from '@/hooks/use-collection-box';
import { useTranslation } from '@/hooks/use-translation';
import { makeShareImage } from '@/lib/boxes/api';
import { targetLabel } from '@/lib/boxes/labels';
import { shareImageEdition } from '@/lib/boxes/snapshot';
import type { Edition } from '@/lib/edition/types';
import { contributionElement } from '@/lib/editor/edition-panel';
import type { Locale } from '@/lib/game/types';

interface TogetherSectionProps {
    collect: CollectionBox;
    edition: Edition;
    locale: Locale;
    /** Opens the element a contribution is for; the decision is made there (B146). */
    onOpenElement: (key: string) => void;
}

function formatDate(at: number, locale: Locale): string {
    return new Intl.DateTimeFormat(locale === 'nl' ? 'nl-NL' : 'en-GB', {
        day: 'numeric',
        month: 'long',
    }).format(at);
}

/**
 * "Samen maken" as a section of the edition panel (B146, vult B128 aan): the link for the group app, the picture
 * to go with it, and managing the link. What friends sent waits at the element it is for; here it is a list of
 * those elements. One primary button: the link.
 */
export function TogetherSection({
    collect,
    edition,
    locale,
    onOpenElement,
}: TogetherSectionProps) {
    const t = useTranslation();
    const { box } = collect;
    const [copied, setCopied] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const copyTimer = useRef<number | undefined>(undefined);
    useEffect(() => () => window.clearTimeout(copyTimer.current), []);

    // Looking at the section refreshes the box, so what arrived meanwhile shows at once.
    const { refresh } = collect;
    useEffect(() => {
        void refresh();
    }, [refresh]);

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
    const failed = collect.error ? t('collect.action_failed') : null;

    if (!collect.loaded) {
        return (
            <p role="status" className="m-0 text-ink-soft">
                {t('collect.working')}
            </p>
        );
    }

    if (box === null) {
        return (
            <>
                <p className="m-0 text-base">{t('collect.intro')}</p>
                <Button
                    className="self-start"
                    disabled={collect.busy}
                    onClick={() => void collect.start().catch(() => undefined)}
                >
                    {collect.busy ? t('collect.starting') : t('collect.start')}
                </Button>
                {failed !== null && (
                    <p
                        role="alert"
                        className="m-0 text-sm font-semibold text-press"
                    >
                        {failed}
                    </p>
                )}
            </>
        );
    }

    const closed = box.status === 'closed';

    return (
        <>
            <div className="flex flex-col gap-2">
                <label
                    htmlFor="together-link"
                    className="text-sm font-semibold"
                >
                    {t('collect.link_label')}
                </label>
                <Input
                    id="together-link"
                    readOnly
                    value={box.url}
                    onFocus={(event) => event.target.select()}
                    className="font-mono text-sm"
                />
                <div className="flex flex-wrap gap-2">
                    <Button
                        className="min-w-0 flex-1"
                        disabled={closed}
                        onClick={() => void copy()}
                    >
                        {copied ? t('collect.copied') : t('collect.copy')}
                    </Button>
                    {canShare && (
                        <Button
                            variant="secondary"
                            className="min-w-0 flex-1"
                            disabled={closed}
                            onClick={() =>
                                void navigator
                                    .share({
                                        title: edition.name,
                                        text: t('collect.share_text', {
                                            name: edition.name,
                                        }),
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
                    {closed
                        ? t('collect.status_closed')
                        : t('collect.expires', {
                              date: formatDate(box.expiresAt, locale),
                          })}
                </p>
            </div>

            <div className="flex flex-col gap-2">
                <h4 className="m-0 text-sm font-semibold">
                    {t('edition_panel.waiting_title')}
                    {box.contributions.length > 0 &&
                        ` (${String(box.contributions.length)})`}
                </h4>
                {box.contributions.length === 0 ? (
                    <p className="m-0 text-sm text-ink-soft">
                        {t('collect.empty')}
                    </p>
                ) : (
                    <>
                        <ul className="m-0 flex list-none flex-col p-0">
                            {box.contributions.map((contribution) => (
                                <li key={contribution.id}>
                                    <button
                                        type="button"
                                        data-waiting={contribution.id}
                                        onClick={() =>
                                            onOpenElement(
                                                contributionElement(
                                                    contribution.elementKey,
                                                ),
                                            )
                                        }
                                        className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-control border-0 bg-transparent px-2 text-left hover:bg-table"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="size-2 flex-none rounded-full bg-press"
                                        />
                                        <span className="min-w-0 flex-1 truncate">
                                            <strong>
                                                {targetLabel(
                                                    contribution.elementKey,
                                                    edition,
                                                    locale,
                                                    (group) =>
                                                        t('friend.town_of', {
                                                            group,
                                                        }),
                                                )}
                                            </strong>{' '}
                                            <span className="text-sm text-ink-soft">
                                                {[
                                                    t('collect.from', {
                                                        name: contribution.firstName,
                                                    }),
                                                    contribution.hasPhoto
                                                        ? t(
                                                              'collect.photo_attached',
                                                          )
                                                        : null,
                                                ]
                                                    .filter(
                                                        (part) => part !== null,
                                                    )
                                                    .join(' · ')}
                                            </span>
                                        </span>
                                        <ChevronLeftIcon
                                            size={16}
                                            className="flex-none rotate-180"
                                        />
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <p className="m-0 text-xs text-ink-soft">
                            {t('edition_panel.waiting_hint')}
                        </p>
                    </>
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

            <ShareImage edition={edition} />

            <div className="flex flex-col gap-2 border-t border-line pt-4">
                <h4 className="m-0 text-sm font-semibold">
                    {t('edition_panel.manage')}
                </h4>
                <div className="flex flex-wrap gap-x-5 gap-y-1">
                    {[
                        {
                            label: t('collect.close'),
                            hidden: closed,
                            run: () =>
                                void collect.close().catch(() => undefined),
                        },
                        {
                            label: t('collect.renew'),
                            hidden: false,
                            run: () =>
                                void collect.renew().catch(() => undefined),
                        },
                        {
                            label: t('collect.delete'),
                            hidden: false,
                            run: () => setConfirmingDelete(true),
                        },
                    ]
                        .filter((action) => !action.hidden)
                        .map((action) => (
                            <button
                                key={action.label}
                                type="button"
                                disabled={collect.busy}
                                onClick={action.run}
                                className="min-h-11 cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold underline underline-offset-4 disabled:cursor-default disabled:opacity-40"
                            >
                                {action.label}
                            </button>
                        ))}
                </div>
                <p className="m-0 text-xs text-ink-soft">
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
                                variant="secondary"
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
                                variant="ghost"
                                onClick={() => setConfirmingDelete(false)}
                            >
                                {t('collect.cancel')}
                            </Button>
                        </div>
                    </div>
                )}
                {failed !== null && (
                    <p
                        role="alert"
                        className="m-0 text-sm font-semibold text-press"
                    >
                        {failed}
                    </p>
                )}
            </div>
        </>
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
        <div className="flex flex-col gap-2 rounded-control bg-board p-3">
            <h4 className="m-0 text-sm font-semibold">
                {t('collect.image_title')}
            </h4>
            <p className="m-0 text-sm text-ink-soft">
                {t('collect.image_body')}
            </p>
            {image !== null && (
                <img
                    src={image.url}
                    alt={t('collect.image_alt', { name: edition.name })}
                    width={1080}
                    height={1080}
                    className="aspect-square w-full max-w-60 self-center rounded-control border-2 border-ink bg-card"
                />
            )}
            <div className="flex flex-wrap gap-2">
                <Button
                    variant="secondary"
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
        </div>
    );
}
