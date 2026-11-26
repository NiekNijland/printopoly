import { proposalGroups } from '@/features/edition/boxes/proposals';
import type { BoxContributionData } from '@/features/edition/boxes/types';
import type { DecisionNote } from '@/features/edition/boxes/use-contribution-decision';

import { ProposalGroupView, type ProposalContext } from './proposal-group';

export interface FriendsProps extends ProposalContext {
    /** What friends sent (B128), oldest first; the panel keeps the ones for its element. */
    contributions: readonly BoxContributionData[];
}

/** The line after a decision, where the proposal was (bug 30); it belongs to one element only. */
export function DecisionLines({
    note,
    problem,
    here,
}: {
    note: DecisionNote | null;
    problem: DecisionNote | null;
    /** Whether a line belongs to the element on screen. */
    here: (element: string) => boolean;
}) {
    return (
        <>
            {note !== null && here(note.element) && (
                <p
                    role="status"
                    className="m-0 rounded-control bg-board px-3 py-2 text-sm font-semibold"
                >
                    {note.text}
                </p>
            )}
            {problem !== null && here(problem.element) && (
                <p
                    role="alert"
                    className="m-0 text-sm font-semibold text-press"
                >
                    {problem.text}
                </p>
            )}
        </>
    );
}

/**
 * "Van vrienden" (B128, §3.3): the last section of an element, only when friends sent something for it. The
 * proposals stand per field (B175): two names side by side, then the photos, then the amounts. Toepassen fills
 * the field above and the preview shows it at once; the other proposals for that field are passed over.
 */
export function FriendsSection({
    contributions,
    here,
    ...context
}: FriendsProps & { here: (element: string) => boolean }) {
    const groups = proposalGroups(contributions);

    return (
        <>
            {groups.map((group) => (
                <ProposalGroupView
                    key={group.target}
                    group={group}
                    context={context}
                />
            ))}
            <DecisionLines
                note={context.decision.note}
                problem={context.decision.problem}
                here={here}
            />
        </>
    );
}
