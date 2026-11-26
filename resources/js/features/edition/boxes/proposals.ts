import { contributionElement } from '@/lib/render/editor-edition-panel';

import type { BoxContributionData, ContributionPart } from './types';

/** A proposal for a card that is not there yet (B175): `newcard.chance` or `newcard.chest`. */
export function newCardDeck(key: string): 'chance' | 'chest' | null {
    const deck = /^newcard\.(chance|chest)$/.exec(key)?.[1];

    return deck === 'chance' || deck === 'chest' ? deck : null;
}

export const newCardKey = (deck: 'chance' | 'chest'): string =>
    `newcard.${deck}`;

/** The parts that are still open, in a fixed order: the words first, then the photo, then the amount. */
const PART_ORDER: readonly ContributionPart[] = [
    'name',
    'town',
    'text',
    'photo',
    'amount',
];

export interface PartGroup {
    part: ContributionPart;
    /** The element the part goes on: the town of a colour group is its own key. */
    elementKey: string;
    /** The contributions that propose this part, oldest first. Two or more compete. */
    options: BoxContributionData[];
}

export interface ProposalGroup {
    /** The element to open for these proposals (B146); for a new card the `newcard.*` key. */
    target: string;
    /** For a new card: the one contribution, applied as a whole. */
    newCard: BoxContributionData | null;
    parts: PartGroup[];
}

/**
 * What waits, grouped per element and within it per field (B175, UX 6): two names for one space sit side by side
 * in one group, so the owner picks one. A new card is its own group and goes in whole.
 */
export function proposalGroups(
    contributions: readonly BoxContributionData[],
): ProposalGroup[] {
    const groups = new Map<string, ProposalGroup>();

    for (const contribution of contributions) {
        if (newCardDeck(contribution.elementKey) !== null) {
            groups.set(`new:${contribution.id}`, {
                target: contribution.elementKey,
                newCard: contribution,
                parts: [],
            });
            continue;
        }
        const target = contributionElement(contribution.elementKey);
        const group = groups.get(target) ?? {
            target,
            newCard: null,
            parts: [],
        };
        groups.set(target, group);

        for (const part of contribution.open) {
            const found = group.parts.find(
                (candidate) =>
                    candidate.part === part &&
                    candidate.elementKey === contribution.elementKey,
            );
            if (found === undefined) {
                group.parts.push({
                    part,
                    elementKey: contribution.elementKey,
                    options: [contribution],
                });
            } else {
                found.options.push(contribution);
            }
        }
    }

    for (const group of groups.values()) {
        group.parts.sort(
            (a, b) => PART_ORDER.indexOf(a.part) - PART_ORDER.indexOf(b.part),
        );
    }

    return [...groups.values()].filter(
        (group) => group.newCard !== null || group.parts.length > 0,
    );
}

/**
 * The element "Van vrienden" opens next (bug 30): the one after the open element in the order things came in,
 * round to the first. New cards have no element yet; `undefined` when only those wait.
 */
export function nextContributionElement(
    contributions: readonly { elementKey: string }[],
    current: string,
): string | undefined {
    const targets: string[] = [];
    for (const { elementKey } of contributions) {
        if (newCardDeck(elementKey) !== null) {
            continue;
        }
        const target = contributionElement(elementKey);
        if (!targets.includes(target)) {
            targets.push(target);
        }
    }

    return targets[(targets.indexOf(current) + 1) % targets.length];
}
