import { PAWN_COUNT, pawnKey, spaceKey } from '@/lib/render/edition-keys';
import type { Edition } from '@/lib/render/edition-types';
import { holdsPhoto } from '@/lib/render/editor-catalogue';
import { photoKindOf } from '@/lib/render/editor-photo-batch';
import { standardEdition } from '@/lib/render/standard-edition';

/**
 * Photos matched to spaces by their file name (B237): "Bakker Jansen.jpg" goes on the space called Bakker Jansen.
 * Case, accents, separators and copy numbers do not count, and a small typo is forgiven. A name that fits two
 * spaces equally well goes nowhere, so a photo never lands on a guess.
 */

/** A score from 0 to 1 counts as a match from here. */
const MATCH_THRESHOLD = 0.8;

/** Lower case, without accents, with every run of other characters as one space. */
export function normalizeName(text: string): string {
    return text
        .normalize('NFKD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}

/** The name part of a file name: without the extension. */
function fileStem(fileName: string): string {
    return fileName.replace(/\.[a-z0-9]{2,5}$/i, '');
}

/** The pairs of letters of a word, for the Dice coefficient. */
function bigrams(text: string): Map<string, number> {
    const pairs = new Map<string, number>();
    for (let i = 0; i < text.length - 1; i++) {
        const pair = text.slice(i, i + 2);
        pairs.set(pair, (pairs.get(pair) ?? 0) + 1);
    }

    return pairs;
}

/** How alike two words are, from 0 to 1, by the pairs of letters they share. */
function dice(a: string, b: string): number {
    if (a.length < 2 || b.length < 2) {
        return a === b ? 1 : 0;
    }
    const left = bigrams(a);
    let shared = 0;
    for (const [pair, count] of bigrams(b)) {
        const other = left.get(pair) ?? 0;
        shared += Math.min(count, other);
    }

    return (2 * shared) / (a.length - 1 + (b.length - 1));
}

/** Whether `inner` is `outer` or a run of whole words in it. */
const holdsWords = (outer: string, inner: string): boolean =>
    ` ${outer} `.includes(` ${inner} `);

/**
 * How well a file name fits the name of a space, from 0 to 1. The same letters score 1 ("bakker_jansen.JPG" and
 * "Bakker Jansen"); the whole name inside the file name scores 0.9 ("Domplein 2026.jpg", "Raadhuisplein (1).jpg");
 * a file name that is a part of the name scores 0.85 ("scheve toren.jpg" for "De kerk met de scheve toren").
 * Otherwise the score is how many pairs of letters they share, so "Kasteelaan" still fits "Kasteellaan".
 */
export function nameScore(fileName: string, label: string): number {
    const file = normalizeName(fileStem(fileName));
    const name = normalizeName(label);
    if (file === '' || name === '') {
        return 0;
    }
    const fileLetters = file.replaceAll(' ', '');
    const nameLetters = name.replaceAll(' ', '');
    if (fileLetters === nameLetters) {
        return 1;
    }
    if (nameLetters.length >= 4 && holdsWords(file, name)) {
        return 0.9;
    }
    if (fileLetters.length >= 5 && holdsWords(name, file)) {
        return 0.85;
    }

    return dice(fileLetters, nameLetters);
}

export interface NameCandidate {
    key: string;
    label: string;
}

/**
 * The elements a photo can find by its file name, in board order: every street, station and utility with a name,
 * then the pawns in the set. Corners, Chance, Community Chest and the tax spaces have no photo place of their own
 * (B136), and a space whose name was emptied (B214) has nothing to match.
 */
export function nameCandidates(
    edition: Edition,
    labelOf: (key: string) => string,
): NameCandidate[] {
    const spaces = standardEdition.spaces
        .map((space) => spaceKey(space.position))
        .filter(
            (key) =>
                holdsPhoto(key) &&
                photoKindOf(key) !== null &&
                edition.elements[key]?.name !== '',
        );
    const pawns = Array.from({ length: PAWN_COUNT }, (_, i) =>
        pawnKey(i + 1),
    ).filter((key) => edition.elements[key]?.hidden !== true);

    return [...spaces, ...pawns].map((key) => ({ key, label: labelOf(key) }));
}

/**
 * The element each file goes on by its name, or `null`. A file goes nowhere when nothing scores
 * `MATCH_THRESHOLD`, or when two elements fit it equally well. Two files that fit the same element best: the
 * better one gets it.
 */
export function matchPhotosByName(
    fileNames: readonly string[],
    candidates: readonly NameCandidate[],
): (string | null)[] {
    const best = fileNames.map((fileName) => {
        const scored = candidates
            .map((candidate) => ({
                key: candidate.key,
                score: nameScore(fileName, candidate.label),
            }))
            .sort((a, b) => b.score - a.score);
        const [first, second] = scored;
        if (first === undefined || first.score < MATCH_THRESHOLD) {
            return null;
        }
        // Two spaces that fit as well: no guess (a file "station.jpg" and four stations).
        if (second !== undefined && first.score - second.score < 0.02) {
            return null;
        }

        return first;
    });
    const result: (string | null)[] = fileNames.map(() => null);
    const taken = new Set<string>();
    best.map((match, index) => ({ match, index }))
        .filter(
            (
                entry,
            ): entry is {
                match: { key: string; score: number };
                index: number;
            } => entry.match !== null,
        )
        .sort((a, b) => b.match.score - a.match.score)
        .forEach(({ match, index }) => {
            if (!taken.has(match.key)) {
                taken.add(match.key);
                result[index] = match.key;
            }
        });

    return result;
}

/** Where one file of a choice goes, and why: by its name, or on the next empty element (bug 7, ronde 4). */
type PhotoTarget = { key: string; how: 'name' | 'order' } | null;

export interface PhotoChoicePlan {
    /** Per file: its element, or `null` when it found none. */
    targets: PhotoTarget[];
    /** Elements passed over before the last element filled in order. */
    skipped: number;
}

/**
 * Plans a choice of several photos. Files whose name fits an element go there first, also over a photo that is
 * there (the name says it is meant for it). The others fill, in order, the open element and then the empty elements
 * of the same kind after it, as before (bug 7, ronde 4). Without an open element (the photo button of the list)
 * a file without a matching name is not placed: the summary asks where it goes.
 */
export function planPhotoChoice(
    edition: Edition,
    editKey: string | null,
    siblings: readonly string[],
    fileNames: readonly string[],
    candidates: readonly NameCandidate[],
): PhotoChoicePlan {
    const byName =
        fileNames.length > 1 || editKey === null
            ? matchPhotosByName(fileNames, candidates)
            : fileNames.map(() => null);
    const named = new Set(byName.filter((key): key is string => key !== null));
    const kind = editKey === null ? null : photoKindOf(editKey);
    const fits = (key: string): boolean =>
        kind !== null &&
        !named.has(key) &&
        photoKindOf(key) === kind &&
        holdsPhoto(key) &&
        edition.elements[key]?.photo === undefined;
    const order =
        editKey === null
            ? []
            : [
                  ...(named.has(editKey) ? [] : [editKey]),
                  ...siblings.filter(fits),
              ];
    let next = 0;
    const targets: PhotoTarget[] = byName.map((key) => {
        if (key !== null) {
            return { key, how: 'name' };
        }
        const ordered = order[next];
        next++;

        return ordered === undefined ? null : { key: ordered, how: 'order' };
    });
    const last = order[Math.min(next, order.length) - 1];
    const passed =
        last === undefined || last === editKey
            ? []
            : siblings.slice(0, siblings.indexOf(last));

    return {
        targets,
        skipped: passed.filter((key) => !named.has(key) && !fits(key)).length,
    };
}
