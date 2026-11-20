import { useEffect, useState } from 'react';

import { ContributionPreview } from '@/components/boxes/contribution-preview';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';
import { fetchContributionPhoto } from '@/lib/boxes/api';
import { targetLabel } from '@/lib/boxes/labels';
import type { BoxContributionData } from '@/lib/boxes/types';
import type { Edition } from '@/lib/edition/types';
import type { PhotoInfos } from '@/lib/editor/photo-cache';
import type { Locale } from '@/lib/game/types';

/** The small version of a contribution's photo as an object URL; only the owner may fetch it. */
function useContributionPhoto(
    contribution: BoxContributionData,
    secret: string | null,
): string | null {
    const [url, setUrl] = useState<string | null>(null);
    const source = contribution.photoUrl;

    useEffect(() => {
        if (source === null) {
            return;
        }
        let cancelled = false;
        let created: string | null = null;
        fetchContributionPhoto(source, secret, 'preview')
            .then((blob) => {
                if (cancelled) {
                    return;
                }
                created = URL.createObjectURL(blob);
                setUrl(created);
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
            if (created !== null) {
                URL.revokeObjectURL(created);
            }
            setUrl(null);
        };
    }, [source, secret]);

    return url;
}

interface CollectContributionProps {
    contribution: BoxContributionData;
    edition: Edition;
    locale: Locale;
    photos: PhotoInfos;
    secret: string | null;
    working: boolean;
    disabled: boolean;
    onAccept: () => void;
    onReject: () => void;
}

/**
 * One thing a friend sent (B128): who, for which element, the name or text and the photo, with a preview on the
 * element itself and the two decisions.
 */
export function CollectContribution({
    contribution,
    edition,
    locale,
    photos,
    secret,
    working,
    disabled,
    onAccept,
    onReject,
}: CollectContributionProps) {
    const t = useTranslation();
    const [previewing, setPreviewing] = useState(false);
    const photoUrl = useContributionPhoto(contribution, secret);
    const label = targetLabel(
        contribution.elementKey,
        edition,
        locale,
        (group) => t('friend.town_of', { group }),
    );
    const suggestion =
        contribution.value === null || contribution.value === ''
            ? null
            : t(`collect.suggested_${contribution.field}`, {
                  value: contribution.value,
              });

    return (
        <li
            data-contribution={contribution.id}
            className="flex flex-col gap-3 rounded-control border-2 border-ink bg-card p-4"
        >
            <div className="flex items-start gap-3">
                {contribution.hasPhoto && (
                    <div className="size-20 flex-none -rotate-2 overflow-hidden rounded-control border-2 border-ink bg-table">
                        {photoUrl !== null && (
                            <img
                                src={photoUrl}
                                alt=""
                                className="size-full object-cover"
                            />
                        )}
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <p className="m-0 font-display text-lg font-extrabold break-words">
                        {label}
                    </p>
                    <p className="m-0 text-sm text-ink-soft">
                        {[
                            t('collect.from', { name: contribution.firstName }),
                            contribution.hasPhoto
                                ? t('collect.photo_attached')
                                : null,
                        ]
                            .filter((part) => part !== null)
                            .join(' · ')}
                    </p>
                    {suggestion !== null && (
                        <p className="mt-1 mb-0 text-base font-semibold break-words">
                            {suggestion}
                        </p>
                    )}
                </div>
            </div>

            {previewing && (
                <div className="flex justify-center rounded-control bg-table p-3">
                    <ContributionPreview
                        edition={edition}
                        contribution={contribution}
                        photoUrl={photoUrl}
                        photos={photos}
                    />
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                <Button
                    variant="primary"
                    className="min-w-0 flex-1 px-3"
                    disabled={disabled}
                    onClick={onAccept}
                >
                    {working ? t('collect.working') : t('collect.accept')}
                </Button>
                <Button
                    variant="secondary"
                    className="min-w-0 flex-1 px-3"
                    disabled={disabled}
                    onClick={onReject}
                >
                    {t('collect.reject')}
                </Button>
                <Button
                    variant="ghost"
                    className="w-full underline underline-offset-4"
                    aria-pressed={previewing}
                    onClick={() => setPreviewing((on) => !on)}
                >
                    {previewing
                        ? t('collect.preview_hide')
                        : t('collect.preview')}
                </Button>
            </div>
        </li>
    );
}
