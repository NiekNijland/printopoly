import type { Localized } from '../../types/game';
import { checkBoard, checkBoxLid } from './checks-board';
import { checkColor } from './checks-color';
import { checkElement, mergeBorrowedPhotos } from './checks-element';
import { issue } from './checks-issue';
import type {
    CheckFold,
    CheckInput,
    CheckIssue,
    CheckNamePlace,
    PartSelection,
} from './checks-types';
import { STANDARD_DECK_SIZE } from './edition-keys';

/** B99: only the board is required. */
export const checkParts = (parts: PartSelection): CheckIssue[] => {
    if (parts.board) return [];
    return [
        issue('parts.board-missing', 'parts', 'board', 'error', {
            nl: 'Het bord is het enige verplichte onderdeel. Zet het weer aan.',
            en: 'The board is the only required part. Turn it back on.',
        }),
    ];
};

/** Pawns switched on without a photo print as empty stands with only a name: say so (ronde 2). */
export const checkPawns = (
    parts: PartSelection,
    pawnsWithoutPhoto: readonly string[],
): CheckIssue[] => {
    const [first, ...rest] = pawnsWithoutPhoto;
    if (!parts.tokens || first === undefined) return [];
    const n = pawnsWithoutPhoto.length;
    const message = issue('pawns.no-photo', first, 'photo', 'warning', {
        nl:
            n === 1
                ? '1 pion heeft nog geen foto en wordt een lege staander met alleen een naam.'
                : `${n} pionnen hebben nog geen foto en worden lege staanders met alleen een naam.`,
        en:
            n === 1
                ? '1 pawn has no photo yet and prints as an empty stand with only a name.'
                : `${n} pawns have no photo yet and print as empty stands with only a name.`,
    });

    // The message is about the pawns as a group: each pawn without a photo shows it (R5-09).
    return [
        {
            ...message,
            ...(rest.length > 0 ? { alsoKeys: rest } : {}),
            about: { nl: 'Pionnen', en: 'Pawns' },
        },
    ];
};

/**
 * B135: an extra card without a text prints as an empty card. So does a standard card after "Kaarten leegmaken"
 * (B194); that one cannot be taken out, but it can go back to its standard text.
 */
export const checkEmptyCards = (keys: readonly string[]): CheckIssue[] => {
    return keys.map((key) =>
        issue(
            'card.empty',
            key,
            'text',
            'warning',
            Number(key.split('.')[2]) > STANDARD_DECK_SIZE
                ? {
                      nl: 'Deze kaart heeft nog geen tekst. Schrijf er iets op of haal de kaart weg.',
                      en: 'This card has no text yet. Write something on it or take the card out.',
                  }
                : {
                      nl: 'Deze kaart heeft nog geen tekst. Schrijf er iets op of zet hem terug naar standaard.',
                      en: 'This card has no text yet. Write something on it or set it back to standard.',
                  },
        ),
    );
};

/** A street, station or utility after "Namen leegmaken" (B201) prints without a name on the board and its deed. */
export const checkEmptyNames = (keys: readonly string[]): CheckIssue[] => {
    return keys.map((key) =>
        issue('space.no-name', key, 'name', 'warning', {
            nl: 'Dit vak heeft nog geen naam. Schrijf er een op of zet het terug naar standaard.',
            en: 'This space has no name yet. Write one or set it back to standard.',
        }),
    );
};

/** The house rules card is on but empty: it would print as a blank card (bug 20, ronde 3). */
const checkHouseRules = (empty: boolean): CheckIssue[] => {
    return empty
        ? [
              issue('house-rules.empty', 'house_rules', 'text', 'warning', {
                  nl: 'Huisregels is leeg, dus de kaart gaat niet mee in je set. Schrijf je regels op als je hem wel wilt.',
                  en: 'House rules is empty, so the card is left out of your set. Write your rules if you want it.',
              }),
          ]
        : [];
};

/**
 * The invitation is in the set, but its "Wanneer, waar" is still the dotted lines (R5-28, Mo): the PNG for the group
 * chat goes out with nothing filled in. Writing by hand on a printed card is fine, so it is a warning.
 */
const checkInvitation = (blank: boolean): CheckIssue[] => {
    return blank
        ? [
              issue('invitation.blank', 'invitation', 'text', 'warning', {
                  nl: 'Op de uitnodiging staan nog lege stippellijnen bij Wanneer en Waar. Vul de datum en de plek in, of schrijf ze later op de kaart.',
                  en: 'The invitation still has empty dotted lines at When and Where. Fill in the date and the place, or write them on the card later.',
              }),
          ]
        : [];
};

/**
 * The same message twice for one element helps nobody (bug 31, ronde 3): two texts of one element that both
 * overflow, or a check that ran for two reasons, keep one row.
 */
const dedupe = (issues: readonly CheckIssue[]): CheckIssue[] => {
    const seen = new Set<string>();

    return issues.filter((item) => {
        const keys = [item.id, `${item.elementKey}|${item.message.en}`];
        if (keys.some((key) => seen.has(key))) {
            return false;
        }
        keys.forEach((key) => seen.add(key));

        return true;
    });
};

/** Bug 36 of ronde 3: a free layer on the box lid that covers the fixed text makes both hard to read. */
const checkLidLayers = (ids: readonly string[]): CheckIssue[] => {
    return ids.map((id) =>
        issue('layer.over-text', 'box_lid', `layer.${id}`, 'warning', {
            nl: 'Een eigen laag ligt over de titel of de tekst van het deksel. Schuif hem buiten de rode stippellijn.',
            en: 'One of your layers lies over the title or the text of the lid. Move it outside the red dashed line.',
        }),
    );
};

const FOLD_MESSAGES: Record<CheckFold['what'], Localized> = {
    name: {
        nl: 'De naam ligt over de vouwlijnen. Op het gedrukte bord loopt daar een naad door de letters.',
        en: 'The name lies across the fold lines. On the printed board a seam runs through the letters.',
    },
    photo: {
        nl: 'De foto ligt over de vouwlijnen. Op het gedrukte bord loopt daar een naad door, ook door een gezicht.',
        en: 'The photo lies across the fold lines. On the printed board a seam runs through it, faces too.',
    },
    logo: {
        nl: 'Het logo ligt over de vouwlijnen. Op het gedrukte bord valt het in stukken.',
        en: 'The logo lies across the fold lines. On the printed board it falls apart in pieces.',
    },
    face: {
        nl: 'Het midden van de foto valt op een vouwlijn. Staat daar een gezicht, dan loopt op het gedrukte bord een naad door het gezicht. Zoom iets in en schuif de foto opzij.',
        en: 'The middle of the photo falls on a fold line. If a face is there, a seam runs through it on the printed board. Zoom in a little and slide the photo aside.',
    },
    layer: {
        nl: 'Een extra laag ligt over een vouwlijn of een kaartvak. Daar komt een naad of een stapel kaarten overheen.',
        en: 'An extra layer lies over a fold line or a card spot. A seam or a stack of cards ends up on it.',
    },
};

/** B183: text, a photo or a logo on the fold cross of the board centre is cut by a seam in print. */
const checkCenterFold = (items: readonly CheckFold[]): CheckIssue[] => {
    return items.map((item) =>
        issue(
            'center.on-fold',
            'board_center',
            item.field,
            'warning',
            FOLD_MESSAGES[item.what],
        ),
    );
};

/** Bug 14 of test round 3: the edition name runs off the booklet or the banknote strip. */
const checkEditionName = (places: readonly CheckNamePlace[]): CheckIssue[] => {
    return places.map((place) => {
        const n = Math.max(1, Math.round(place.excessCharacters));

        return issue(
            'text.name-too-long',
            place.elementKey,
            'edition-name',
            'warning',
            {
                nl: `De naam van de editie past niet op ${place.place.nl}, ook niet in de kleinste letter. Maak hem ongeveer ${String(n)} tekens korter of zet een spatie in een lang woord.`,
                en: `The name of the edition doesn't fit on ${place.place.en}, not even at the smallest size. Make it about ${String(n)} characters shorter or put a space in a long word.`,
            },
            { excessCharacters: n },
        );
    });
};

/** Runs all checks. Issues come in a stable order: parts, board, then elements in the order given. */
export const runChecks = (input: CheckInput): CheckIssue[] => {
    return dedupe([
        ...checkEditionName(input.longName ?? []),
        ...checkParts(input.parts),
        ...checkBoard(input.board),
        ...(input.parts.boxLid ? checkBoxLid(input.board) : []),
        ...checkPawns(input.parts, input.pawnsWithoutPhoto ?? []),
        ...(input.parts.board ? checkCenterFold(input.centerOnFold ?? []) : []),
        ...(input.parts.boxLid
            ? checkLidLayers(input.lidLayersOverText ?? [])
            : []),
        ...mergeBorrowedPhotos(
            input.elements,
            input.elements.flatMap(checkElement),
        ),
        ...checkEmptyCards(input.emptyCards ?? []),
        ...(input.parts.board ? checkEmptyNames(input.emptyNames ?? []) : []),
        ...checkHouseRules(input.houseRulesEmpty === true),
        ...checkInvitation(input.invitationBlank === true),
        ...(input.colors ?? []).flatMap(checkColor),
    ]);
};
