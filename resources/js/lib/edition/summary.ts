import { standardEdition } from '@/lib/game/standard-edition';
import type { Locale } from '@/lib/game/types';
import { changedElementKeys, diffEditions } from './changes';
import { parseKey, type ElementKind } from './keys';
import { messages } from './strings';
import type { Edition } from './types';

/**
 * Short description of what changed, for the two-windows question: "Stadspark aangepast", "2 kaarten aangepast".
 * `spaceName` gives the name of a space by position; the edition's own name wins.
 */
export function summarizeKeys(
    keys: readonly string[],
    settingsChanged: boolean,
    language: Locale,
    spaceNameOf: (key: string) => string | undefined = () => undefined,
): string {
    const m = messages[language].summary;
    const perKind = new Map<ElementKind, string[]>();
    for (const key of keys) {
        const kind = parseKey(key)?.kind;
        if (kind !== undefined) {
            perKind.set(kind, [...(perKind.get(kind) ?? []), key]);
        }
    }
    const phrases: string[] = [];
    const count = (kind: ElementKind) => perKind.get(kind)?.length ?? 0;

    const spaces = perKind.get('space') ?? [];
    if (spaces.length === 1 && spaces[0] !== undefined) {
        phrases.push(m.space(spaceNameOf(spaces[0]) ?? `${spaces[0]}`));
    } else if (spaces.length > 1) {
        phrases.push(m.spaces(spaces.length));
    }
    if (count('deed') > 0) phrases.push(m.deeds(count('deed')));
    if (count('card') > 0) phrases.push(m.cards(count('card')));
    if (count('note') > 0) phrases.push(m.notes(count('note')));
    if (count('pawn') > 0) phrases.push(m.pawns(count('pawn')));
    if (count('boxLid') > 0) phrases.push(m.boxLid);
    if (count('boardCenter') > 0) phrases.push(m.boardCenter);
    if (count('houseRules') > 0) phrases.push(m.houseRules);
    if (count('cardBack') > 0) phrases.push(m.cardBacks);
    if (settingsChanged) phrases.push(m.settings);

    if (phrases.length === 0) {
        return '';
    }
    const head = phrases.slice(0, -1).join(', ');
    const joined =
        head === ''
            ? (phrases[phrases.length - 1] ?? '')
            : `${head}${m.and}${phrases[phrases.length - 1] ?? ''}`;

    return `${joined} ${m.suffix}`;
}

/** Summary of the differences between two versions of an edition, in the language of the interface. */
export function summarizeDifference(
    from: Edition,
    to: Edition,
    language: Locale,
): string {
    const patch = diffEditions(from, to);
    if (patch === null) {
        return '';
    }
    const settingsChanged =
        patch.name !== undefined ||
        patch.language !== undefined ||
        patch.currency !== undefined ||
        patch.theme !== undefined ||
        patch.boardProfile !== undefined ||
        patch.parts !== undefined;

    return summarizeKeys(
        changedElementKeys(from, to),
        settingsChanged,
        language,
        (key) => {
            const position = Number(key.slice('space.'.length));

            return (
                to.elements[key]?.name ??
                standardEdition.spaces[position]?.name[to.language]
            );
        },
    );
}
