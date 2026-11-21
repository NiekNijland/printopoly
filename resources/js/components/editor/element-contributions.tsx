import { useState } from 'react';

import { CollectContribution } from '@/components/editor/collect-contribution';
import type { CollectionBox } from '@/hooks/use-collection-box';
import { useTranslation } from '@/hooks/use-translation';
import { fetchContributionPhoto } from '@/lib/boxes/api';
import { ApplyError, applyContribution } from '@/lib/boxes/apply';
import type { BoxContributionData } from '@/lib/boxes/types';
import type { EditionRepository } from '@/lib/edition/repository';
import type { EditionSession } from '@/lib/edition/session';
import type { Edition, PhotoRecord } from '@/lib/edition/types';
import { contributionElement } from '@/lib/editor/edition-panel';
import type { PhotoInfos } from '@/lib/editor/photo-cache';
import type { Locale } from '@/lib/game/types';

interface ElementContributionsProps {
    /** The element on screen (`space.03`); a contribution for its colour group shows at the first street. */
    elementKey: string;
    collect: CollectionBox;
    session: EditionSession;
    edition: Edition;
    repository: EditionRepository;
    locale: Locale;
    photos: PhotoInfos;
    onPhoto: (record: PhotoRecord) => void;
}

/**
 * "Van vrienden" at the element (B146): what friends sent for the element on screen, to apply or turn down. It
 * shows only when something waits. Accepting applies the contribution to the edition in this browser and then
 * tells the server; turning it down only tells the server. The field panel takes this in as its last section
 * when the panel gets fixed sections (B138 §3.3).
 */
export function ElementContributions({
    elementKey,
    collect,
    session,
    edition,
    repository,
    locale,
    photos,
    onPhoto,
}: ElementContributionsProps) {
    const t = useTranslation();
    const [working, setWorking] = useState<string | null>(null);
    const [problem, setProblem] = useState<string | null>(null);
    const contributions = (collect.box?.contributions ?? []).filter(
        (contribution) =>
            contributionElement(contribution.elementKey) === elementKey,
    );

    if (contributions.length === 0) {
        return null;
    }

    const act = async (
        contribution: BoxContributionData,
        decision: 'accept' | 'reject',
    ): Promise<void> => {
        setProblem(null);
        setWorking(contribution.id);
        try {
            if (decision === 'accept') {
                await applyContribution(contribution, {
                    session,
                    repository,
                    locale,
                    onPhoto,
                    fetchPhoto: (item) =>
                        fetchContributionPhoto(
                            item.photoUrl ?? '',
                            collect.secret,
                        ),
                    storageFullMessage: t('photo.storage_full'),
                    failedMessage: t('collect.accept_failed'),
                });
            }
            await collect.resolve(contribution.id, decision);
        } catch (failure) {
            setProblem(
                failure instanceof ApplyError
                    ? failure.message
                    : t(
                          decision === 'accept'
                              ? 'collect.accept_failed'
                              : 'collect.reject_failed',
                      ),
            );
        } finally {
            setWorking(null);
        }
    };

    return (
        <section
            aria-labelledby="element-friends"
            data-element-contributions
            className="flex flex-col gap-3 border-t-2 border-ink bg-card p-4 md:p-6"
        >
            <h3
                id="element-friends"
                className="m-0 flex items-center gap-2 font-display text-xl font-extrabold"
            >
                <span
                    aria-hidden="true"
                    className="size-2.5 rounded-full bg-press"
                />
                {t('editor.friends_row')} ({contributions.length})
            </h3>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {contributions.map((contribution) => (
                    <CollectContribution
                        key={contribution.id}
                        contribution={contribution}
                        edition={edition}
                        locale={locale}
                        photos={photos}
                        secret={collect.secret}
                        working={working === contribution.id}
                        disabled={working !== null || collect.busy}
                        onAccept={() => void act(contribution, 'accept')}
                        onReject={() => void act(contribution, 'reject')}
                    />
                ))}
            </ul>
            {problem !== null && (
                <p
                    role="alert"
                    className="m-0 text-sm font-semibold text-press"
                >
                    {problem}
                </p>
            )}
        </section>
    );
}
