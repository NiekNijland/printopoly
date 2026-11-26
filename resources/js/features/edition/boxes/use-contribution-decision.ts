import { useCallback, useState } from 'react';

import { fetchContributionPhoto } from '@/features/edition/boxes/api';
import { ApplyError, applyContribution } from '@/features/edition/boxes/apply';
import type {
    BoxContributionData,
    ContributionPart,
} from '@/features/edition/boxes/types';
import type { CollectionBox } from '@/features/edition/boxes/use-collection-box';
import type { EditionRepository } from '@/features/edition/repository';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import { targetLabel } from '@/lib/render/boxes-labels';
import type { PhotoRecord } from '@/lib/render/edition-types';
import { contributionElement } from '@/lib/render/editor-edition-panel';
import type { Locale } from '@/types/game';

interface DecisionOptions {
    collect: CollectionBox;
    session: EditionSession;
    repository: EditionRepository;
    locale: Locale;
    onPhoto: (record: PhotoRecord) => void;
}

/** A line after a decision, with the element it belongs to, so it shows there and nowhere else (bug 30). */
export interface DecisionNote {
    /** The element the line belongs to: where the proposal was applied, or where it was handled. */
    element: string;
    text: string;
}

export interface ContributionDecision {
    decide: (
        contribution: BoxContributionData,
        decision: 'accept' | 'reject',
        parts?: readonly ContributionPart[],
    ) => Promise<void>;
    /** `id:part` of what is being handled, or `id` for a whole contribution. */
    working: string | null;
    /** "Toegepast op Molenweg." after an applied one. */
    note: DecisionNote | null;
    problem: DecisionNote | null;
    /** Clears the line, when the owner moves on to another element. */
    clear: () => void;
}

/**
 * Applying or passing over what a friend sent (B128, B175). Applying puts the chosen parts in the local edition in
 * this browser and then tells the server, which passes over the same part of the other proposals for that element;
 * passing over only tells the server. Used by the overview in Samen maken and by "Van vrienden" in the field panel,
 * so both do the same.
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
    const [note, setNote] = useState<DecisionNote | null>(null);
    const [problem, setProblem] = useState<DecisionNote | null>(null);

    const decide = async (
        contribution: BoxContributionData,
        decision: 'accept' | 'reject',
        parts?: readonly ContributionPart[],
    ): Promise<void> => {
        const element = contributionElement(contribution.elementKey);
        setNote(null);
        setProblem(null);
        setWorking(
            parts?.length === 1
                ? `${contribution.id}:${parts[0] ?? ''}`
                : contribution.id,
        );
        try {
            if (decision === 'accept') {
                const key = await applyContribution(
                    contribution,
                    {
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
                        deckFullMessage: t('collect.deck_full'),
                    },
                    parts,
                );
                setNote({
                    element,
                    text: t('collect.applied', {
                        element: targetLabel(
                            key,
                            session.edition,
                            locale,
                            (group) => t('friend.town_of', { group }),
                        ),
                    }),
                });
            }
            await collect.resolve(contribution.id, decision, parts);
        } catch (failure) {
            setProblem({
                element,
                text:
                    failure instanceof ApplyError
                        ? failure.message
                        : t(
                              decision === 'accept'
                                  ? 'collect.accept_failed'
                                  : 'collect.reject_failed',
                          ),
            });
        } finally {
            setWorking(null);
        }
    };

    const clear = useCallback(() => {
        setNote(null);
        setProblem(null);
    }, []);

    return { decide, working, note, problem, clear };
}
