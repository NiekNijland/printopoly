import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import type { CollectionBox } from '@/features/edition/boxes/use-collection-box';
import type { FriendsProps } from '@/features/edition/editor/panel/friends-section';
import { TogetherManage } from '@/features/edition/editor/together-manage';
import { TogetherOverview } from '@/features/edition/editor/together-overview';
import { useTranslation } from '@/hooks/use-translation';
import { reportError, reportUnlessCancelled } from '@/lib/bugsnag';
import { formatDateTime } from '@/lib/datetime';
import type { Edition } from '@/lib/render/edition-types';
import type { Locale } from '@/types/game';

type TogetherSectionProps = {
    collect: CollectionBox;
    /** What friends sent, with the decision, so the overview applies right here (B175). */
    friends?: FriendsProps;
    edition: Edition;
    locale: Locale;
    /** Opens the element a contribution is for; the decision is made there (B146). */
    onOpenElement: (key: string) => void;
};

const formatDate = (at: number, locale: Locale): string => {
    return formatDateTime(at, locale === 'nl' ? 'nl-NL' : 'en-GB', {
        day: 'numeric',
        month: 'long',
    });
};

const ShareButton = ({
    url,
    name,
    closed,
}: {
    url: string;
    name: string;
    closed: boolean;
}) => {
    const t = useTranslation();
    const canShare =
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function';

    if (!canShare) {
        return null;
    }

    return (
        <Button
            variant="secondary"
            className="min-w-0 flex-1"
            disabled={closed}
            onClick={() => {
                void navigator
                    .share({
                        title: name,
                        text: t('collect.share_text', {
                            name: name,
                        }),
                        url,
                    })
                    .catch(reportUnlessCancelled);
            }}
        >
            {t('collect.share')}
        </Button>
    );
};

const TogetherLink = ({
    url,
    closed,
    expiresAt,
    edition,
    locale,
}: {
    url: string;
    closed: boolean;
    expiresAt: number;
    edition: Edition;
    locale: Locale;
}) => {
    const t = useTranslation();
    const [copied, setCopied] = useState<number | null>(null);
    useEffect(() => {
        if (copied === null) {
            return undefined;
        }
        const timer = window.setTimeout(() => setCopied(null), 2500);

        return () => window.clearTimeout(timer);
    }, [copied]);

    const copy = async (): Promise<void> => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied((count) => (count ?? 0) + 1);
        } catch (error) {
            if (!(error instanceof DOMException)) {
                reportError(error);
            }
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <label htmlFor="together-link" className="text-sm font-semibold">
                {t('collect.link_label')}
            </label>
            <Input
                id="together-link"
                readOnly
                value={url}
                onFocus={(event) => event.target.select()}
                className="font-mono text-sm"
            />
            <div className="flex flex-wrap gap-2">
                <Button
                    className="min-w-0 flex-1"
                    disabled={closed}
                    onClick={() => void copy()}
                >
                    {copied !== null ? t('collect.copied') : t('collect.copy')}
                </Button>
                <ShareButton url={url} name={edition.name} closed={closed} />
            </div>
            <p className="m-0 text-sm text-ink-soft">
                {closed
                    ? t('collect.status_closed')
                    : t('collect.expires', {
                          date: formatDate(expiresAt, locale),
                      })}
            </p>
        </div>
    );
};

const HideCards = ({
    hidden,
    busy,
    onChange,
}: {
    hidden: boolean;
    busy: boolean;
    onChange: (hidden: boolean) => void;
}) => {
    const t = useTranslation();

    return (
        <div className="flex min-h-11 items-start gap-3 text-sm">
            <Checkbox
                id="together-hide-cards"
                checked={hidden}
                disabled={busy}
                aria-describedby="together-hide-cards-hint"
                onCheckedChange={(checked) => onChange(checked === true)}
                className="mt-0.5 flex-none"
            />
            <span className="flex flex-col gap-0.5">
                <label
                    htmlFor="together-hide-cards"
                    className="cursor-pointer font-semibold"
                >
                    {t('collect.hide_cards')}
                </label>
                <span id="together-hide-cards-hint" className="text-ink-soft">
                    {t('collect.hide_cards_hint')}
                </span>
            </span>
        </div>
    );
};

/**
 * "Samen maken" as a section of the edition panel (B146, vult B128 aan): the link for the group app, the picture
 * to go with it, and managing the link. What friends sent waits at the element it is for and here in one overview
 * (B175): per element, per field, with competing proposals side by side, to apply here or at the element. One
 * primary button: the link.
 */
export const TogetherSection = ({
    collect,
    friends,
    edition,
    locale,
    onOpenElement,
}: TogetherSectionProps) => {
    const t = useTranslation();
    const { box } = collect;
    // Looking at the section refreshes the box, so what arrived meanwhile shows at once.
    const { refresh } = collect;
    useEffect(() => {
        void refresh();
    }, [refresh]);

    // The real reason when the server gave one, in plain words next to the button (bug 6 of test round 4).
    const failed = !collect.error
        ? null
        : collect.errorReason === 'too_many_boxes'
          ? t('boxes.too_many_boxes')
          : collect.errorReason === 'too_fast'
            ? t('collect.too_fast')
            : t('collect.action_failed');

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
                    onClick={() => void collect.start()}
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
            <TogetherLink
                url={box.url}
                closed={closed}
                expiresAt={box.expiresAt}
                edition={edition}
                locale={locale}
            />

            <TogetherOverview
                collect={collect}
                friends={friends}
                edition={edition}
                locale={locale}
                onOpenElement={onOpenElement}
            />

            {edition.parts.cards && (
                <HideCards
                    hidden={box.cardsHidden}
                    busy={collect.busy}
                    onChange={(hidden) => {
                        void collect.hideCards(hidden);
                    }}
                />
            )}

            <TogetherManage collect={collect} closed={closed} failed={failed} />
        </>
    );
};
