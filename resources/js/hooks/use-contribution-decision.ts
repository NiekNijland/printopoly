import { useState } from 'react';

import type { CollectionBox } from '@/hooks/use-collection-box';
import { useTranslation } from '@/hooks/use-translation';
import { fetchContributionPhoto } from '@/lib/boxes/api';
import { ApplyError, applyContribution } from '@/lib/boxes/apply';
import { targetLabel } from '@/lib/boxes/labels';
import type { BoxContributionData } from '@/lib/boxes/types';
import type { EditionRepository } from '@/lib/edition/repository';
import type { EditionSession } from '@/lib/edition/session';
import type { PhotoRecord } from '@/lib/edition/types';
import type { Locale } from '@/lib/game/types';

interface DecisionOptions {
    collect: CollectionBox;
    session: EditionSession;
    repository: EditionRepository;
    locale: Locale;
    onPhoto: (record: PhotoRecord) => void;
}

export interface ContributionDecision {
    decide: (
        contribution: BoxContributionData,
        decision: 'accept' | 'reject',
    ) => Promise<void>;
    /** The id of the contribution that is being handled. */
    working: string | null;
    /** "Toegepast op Molenweg." after an accepted one. */
    note: string | null;
    problem: string | null;
}

/**
 * Accepting or rejecting what a friend sent (B128). Accepting applies the contribution to the local edition in
 * this browser and then tells the server; rejecting only tells the server. Used by the Samen maken dialog and
 * by "Van vrienden" in the field panel, so both do the same.
 */
export function useContributionDecision({
    collect,
    session,
    repository,
    locale,
    onPhoto,
}: DecisionOptions): ContributionDecision {
    const t = useTranslation();
    const [working, setWorking] = useState<string | null>(null);
    const [note, setNote] = useState<string | null>(null);
    const [problem, setProblem] = useState<string | null>(null);

    const decide = async (
        contribution: BoxContributionData,
        decision: 'accept' | 'reject',
    ): Promise<void> => {
        setNote(null);
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
                setNote(
                    t('collect.applied', {
                        element: targetLabel(
                            contribution.elementKey,
                            session.edition,
                            locale,
                            (group) => t('friend.town_of', { group }),
                        ),
                    }),
                );
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

    return { decide, working, note, problem };
}
