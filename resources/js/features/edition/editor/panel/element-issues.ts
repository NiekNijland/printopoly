import type { FriendsProps } from '@/features/edition/editor/panel/friends-section';
import type { CheckIssue } from '@/lib/render/checks-types';
import { groupKey, spaceKey } from '@/lib/render/edition-keys';
import type { Space } from '@/types/game';

/** Controle messages about amounts stay at their field; the rest go on top of the panel (B94, §3.3). */
const AMOUNT_FIELD = /^amounts?\b/;

export const elementIssues = (
    issues: readonly CheckIssue[],
    editKey: string,
    space: Space | undefined,
): { own: CheckIssue[]; top: CheckIssue[] } => {
    // Issues of a deed also count for its space, and the other way around, like on the board.
    // A message about a group, such as the pawns without a photo, shows on each of them (R5-09).
    const about = (issue: CheckIssue) =>
        issue.elementKey === editKey ||
        (issue.alsoKeys?.includes(editKey) ?? false);
    const own = issues.filter(
        (issue) =>
            about(issue) ||
            (space !== undefined &&
                issue.elementKey === spaceKey(space.position) &&
                AMOUNT_FIELD.test(issue.field)),
    );

    return {
        own,
        top: own.filter(
            (issue) => about(issue) && !AMOUNT_FIELD.test(issue.field),
        ),
    };
};

export const friendsFor = (
    friends: FriendsProps | undefined,
    editKey: string,
    space: Space | undefined,
) => {
    const targets = new Set([editKey]);
    if (space !== undefined) {
        targets.add(spaceKey(space.position));
        if (space.type === 'street') {
            targets.add(groupKey(space.group));
        }
    }
    const incoming =
        friends?.contributions.filter(
            (item) => targets.has(item.elementKey) && item.open.length > 0,
        ) ?? [];
    // The line after a decision stays with this element, also when nothing is left to decide (bug 30).
    const here = (element: string): boolean =>
        element === editKey || targets.has(element);
    const decided =
        friends !== undefined &&
        [friends.decision.note, friends.decision.problem].some(
            (line) => line !== null && here(line.element),
        );

    return { incoming, here, decided };
};
