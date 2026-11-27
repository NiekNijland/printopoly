import { checkCardText } from './checks-card-text';
import { issue } from './checks-issue';
import type {
    CheckAmount,
    CheckElement,
    CheckIssue,
    CheckPhoto,
    CheckText,
} from './checks-types';
import { lowResolutionMessage, photoQuality } from './photos-resolution';

const checkPhoto = (elementKey: string, photo: CheckPhoto): CheckIssue[] => {
    // One measure for the editor line, this check and the print page (B251): as it prints, on the real target.
    const quality = photoQuality(
        photo.source,
        photo.transform,
        photo.frame,
        photo.bleed,
    );

    if (quality.sharp) {
        return [];
    }

    return [
        issue(
            'photo.low-resolution',
            elementKey,
            photo.field,
            'warning',
            lowResolutionMessage(photo.source, quality, photo.field === 'icon'),
            { dpi: Math.round(quality.dpi) },
        ),
    ];
};

/** 5 pt in mm: smaller letters are hard to read on a board at arm's length (bug 13, ronde 3). */
const MIN_READABLE_FONT_MM = (5 * 25.4) / 72;

/** A letter size in points, rounded to a half: "4,5" or "4.5". */
const points = (mm: number, decimal: ',' | '.'): string => {
    const pt = Math.round(((mm * 72) / 25.4) * 2) / 2;

    return String(pt).replace('.', decimal);
};

const checkText = (elementKey: string, text: CheckText): CheckIssue[] => {
    if (text.fit.fits) {
        if (
            text.fontMm === undefined ||
            text.fontMm >= MIN_READABLE_FONT_MM - 1e-6
        ) {
            return [];
        }
        const nl = points(text.fontMm, ',');
        const en = points(text.fontMm, '.');

        return [
            issue(
                'text.too-small',
                elementKey,
                text.field,
                'warning',
                {
                    nl: `Deze tekst past alleen in een letter van ${nl} pt. Onder 5 pt is hij op het bord moeilijk te lezen. Maak hem korter.`,
                    en: `This text only fits at ${en} pt. Below 5 pt it is hard to read on the board. Make it shorter.`,
                },
                { pt: Number(en) },
            ),
        ];
    }
    const n = Math.max(1, Math.round(text.fit.excessCharacters));
    const nl = n === 1 ? 'Haal 1 teken weg.' : `Haal ongeveer ${n} tekens weg.`;
    const en =
        n === 1 ? 'Remove 1 character.' : `Remove about ${n} characters.`;
    if (text.place !== undefined) {
        return [
            issue(
                'text.too-long',
                elementKey,
                `${text.field}|${text.place.en}`,
                'warning',
                {
                    nl: `Dit woord past niet op ${text.place.nl}, ook niet in de kleinste letter. ${nl}`,
                    en: `This word doesn't fit on ${text.place.en}, not even at the smallest size. ${en}`,
                },
                { excessCharacters: n },
            ),
        ];
    }
    return [
        issue(
            'text.too-long',
            elementKey,
            text.field,
            'warning',
            {
                nl: `De tekst past niet, ook niet in de kleinste letter. ${nl}`,
                en: `The text doesn't fit, not even at the smallest size. ${en}`,
            },
            { excessCharacters: n },
        ),
    ];
};

/** B132: an amount outside 20% of the standard amount. */
const checkAmounts = (
    elementKey: string,
    amounts: readonly CheckAmount[],
): CheckIssue[] => {
    return amounts.map((amount) =>
        issue(
            'amount.out-of-range',
            elementKey,
            amount.field,
            'error',
            {
                nl: `Dit bedrag (${String(amount.value)}) mag niet. Kies een bedrag tussen ${String(amount.min)} en ${String(amount.max)}.`,
                en: `This amount (${String(amount.value)}) is not allowed. Pick an amount between ${String(amount.min)} and ${String(amount.max)}.`,
            },
            { value: amount.value, min: amount.min, max: amount.max },
        ),
    );
};

/**
 * One message for a photo that is too small on a space and on the title deed that shows it (R5-09): the deed's
 * message goes, and the space's says the deed too. A photo that is only too small on the deed keeps its own.
 */
export const mergeBorrowedPhotos = (
    elements: readonly CheckElement[],
    issues: CheckIssue[],
): CheckIssue[] => {
    const borrowed = new Map<string, string>();
    for (const element of elements) {
        for (const photo of element.photos ?? []) {
            if (photo.borrowedFrom !== undefined && photo.field === 'photo') {
                borrowed.set(element.key, photo.borrowedFrom);
            }
        }
    }
    const lowAt = (key: string) =>
        issues.some(
            (item) =>
                item.code === 'photo.low-resolution' &&
                item.elementKey === key &&
                item.field === 'photo',
        );
    const merged = new Set<string>();
    const kept = issues.filter((item) => {
        const space = borrowed.get(item.elementKey);
        if (
            item.code !== 'photo.low-resolution' ||
            item.field !== 'photo' ||
            space === undefined ||
            !lowAt(space)
        ) {
            return true;
        }
        merged.add(space);

        return false;
    });

    return kept.map((item) =>
        item.code === 'photo.low-resolution' &&
        item.field === 'photo' &&
        merged.has(item.elementKey)
            ? {
                  ...item,
                  message: {
                      nl: `${item.message.nl} Dat geldt ook voor het eigendomsbewijs.`,
                      en: `${item.message.en} The same goes for the title deed.`,
                  },
              }
            : item,
    );
};

export const checkElement = (element: CheckElement): CheckIssue[] => {
    return [
        ...checkAmounts(element.key, element.amounts ?? []),
        ...checkCardText(
            element.key,
            element.cardText ?? [],
            element.cardAmount,
        ),
        ...(element.photos ?? []).flatMap((p) => checkPhoto(element.key, p)),
        ...(element.texts ?? []).flatMap((t) => checkText(element.key, t)),
    ];
};
