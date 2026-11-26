import type { Localized } from '../../types/game';
import { formatMm } from '../../types/print';
import type {
    CheckCode,
    CheckAmount,
    CheckCardAmount,
    CheckColor,
    CheckElement,
    CheckFold,
    CheckInput,
    CheckIssue,
    CheckNamePlace,
    CheckPhoto,
    CheckText,
    IssueIcon,
    PartSelection,
    Severity,
} from './checks-types';
import type { CardTextProblem } from './edition-card-text';
import { STANDARD_DECK_SIZE } from './edition-keys';
import { MIN_SHAPE_CONTRAST, contrastRatio, isOutOfGamut } from './gamut';
import { lowResolutionMessage, photoQuality } from './photos-resolution';
import { MIN_SPACE_WIDTH, spaceWidth, type BoardProfile } from './print-board';
import { stickerPieces } from './print-home-stickers';
import { SHEET_PRESETS } from './print-imposition';
import { lidTiles } from './print-lid-tiles';

/** Mirrors the default margin of `packStickers` in `print/home-stickers.ts`. */
const HOME_PRINT_MARGIN = 8;

const SEVERITY_LABEL: Record<Severity, Localized> = {
    warning: { nl: 'Waarschuwing', en: 'Warning' },
    error: { nl: 'Fout', en: 'Error' },
};
const ICON: Record<Severity, IssueIcon> = {
    warning: 'triangle-alert',
    error: 'octagon-x',
};

function issue(
    code: CheckCode,
    elementKey: string,
    field: string,
    severity: Severity,
    message: Localized,
    data?: CheckIssue['data'],
): CheckIssue {
    return {
        id: `${code}|${elementKey}|${field}`,
        code,
        elementKey,
        field,
        severity,
        icon: ICON[severity],
        severityLabel: SEVERITY_LABEL[severity],
        message,
        ...(data ? { data } : {}),
    };
}

export function checkPhoto(
    elementKey: string,
    photo: CheckPhoto,
): CheckIssue[] {
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
}

/** 5 pt in mm: smaller letters are hard to read on a board at arm's length (bug 13, ronde 3). */
const MIN_READABLE_FONT_MM = (5 * 25.4) / 72;

/** A letter size in points, rounded to a half: "4,5" or "4.5". */
function points(mm: number, decimal: ',' | '.'): string {
    const pt = Math.round(((mm * 72) / 25.4) * 2) / 2;

    return String(pt).replace('.', decimal);
}

export function checkText(elementKey: string, text: CheckText): CheckIssue[] {
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
}

/** The list as text: "a", "a and b", "a, b and c". */
function listOf(items: readonly string[], and: string): string {
    return items.length < 2
        ? (items[0] ?? '')
        : `${items.slice(0, -1).join(', ')} ${and} ${items[items.length - 1] ?? ''}`;
}

/** B131: unknown variables, `{amount}` without an amount, and names that predate a rename. One issue per kind. */
function checkCardText(
    elementKey: string,
    problems: readonly CardTextProblem[],
    cardAmount?: CheckCardAmount,
): CheckIssue[] {
    const issues: CheckIssue[] = [];
    const unknown = problems.flatMap((p) =>
        p.kind === 'unknown-token' ? [p.token] : [],
    );
    const stale = problems.flatMap((p) => (p.kind === 'stale-name' ? [p] : []));

    if (unknown.length > 0) {
        issues.push(
            issue('text.unknown-token', elementKey, 'text', 'warning', {
                nl: `${listOf(unknown, 'en')} ${unknown.length === 1 ? 'is geen variabele' : 'zijn geen variabelen'} die Printopoly kent. Het staat zo op de kaart. Haal het weg of kies een variabele met Invoegen.`,
                en: `${listOf(unknown, 'and')} ${unknown.length === 1 ? 'is not a variable' : 'are not variables'} Printopoly knows. It is printed on the card as typed. Remove it, or pick a variable with Insert.`,
            }),
        );
    }
    if (problems.some((p) => p.kind === 'amount-missing')) {
        issues.push(
            issue('text.amount-missing', elementKey, 'text', 'warning', {
                nl: 'De tekst gebruikt het bedrag van de kaart, maar er is geen bedrag ingevuld. Vul een bedrag in of haal de variabele weg.',
                en: 'The text uses the amount of the card, but no amount is filled in. Fill in an amount or remove the variable.',
            }),
        );
    }
    const twice = problems.find((p) => p.kind === 'amount-twice');
    if (twice !== undefined) {
        issues.push(
            issue('text.amount-twice', elementKey, 'text', 'warning', {
                nl: `De tekst noemt ${String(twice.amount)}, en dat bedrag staat al onderaan de kaart. Laat het op één plek staan: in de tekst of onderaan.`,
                en: `The text mentions ${String(twice.amount)}, and the amount is already printed at the bottom of the card. Keep it in one place: in the text or at the bottom.`,
            }),
        );
    }
    const differs = problems.find((p) => p.kind === 'amount-differs');
    if (differs !== undefined && cardAmount !== undefined) {
        const mentioned = differs.mentioned;
        const allowed =
            mentioned >= cardAmount.min && mentioned <= cardAmount.max;
        const said = String(mentioned);
        issues.push(
            issue(
                'text.amount-differs',
                elementKey,
                'text',
                'warning',
                allowed
                    ? {
                          nl: `De tekst noemt ${said}, maar onderaan de kaart staat ${cardAmount.shown}. Zet het bedrag op ${said}, of haal het getal uit de tekst.`,
                          en: `The text says ${said}, but the bottom of the card says ${cardAmount.shown}. Set the amount to ${said}, or take the number out of the text.`,
                      }
                    : {
                          nl: `De tekst noemt ${said}, maar onderaan de kaart staat ${cardAmount.shown}. Het bedrag van deze kaart kan van ${String(cardAmount.min)} tot ${String(cardAmount.max)}. Pas de tekst aan, of kies Geen bedrag.`,
                          en: `The text says ${said}, but the bottom of the card says ${cardAmount.shown}. This card's amount can be ${String(cardAmount.min)} to ${String(cardAmount.max)}. Change the text, or choose No amount.`,
                      },
                {
                    mentioned: Math.sign(cardAmount.value) * mentioned,
                    allowed,
                },
            ),
        );
    }
    const direction = problems.find(
        (p) => p.kind === 'direction-differs' || p.kind === 'direction-both',
    );
    if (direction !== undefined && cardAmount !== undefined) {
        const receives = cardAmount.value > 0;
        const line = {
            nl: `${receives ? 'Ontvang' : 'Betaal'} ${cardAmount.shown}`,
            en: `${receives ? 'Collect' : 'Pay'} ${cardAmount.shown}`,
        };
        issues.push(
            issue(
                'text.amount-direction',
                elementKey,
                'text',
                'warning',
                direction.kind === 'direction-both'
                    ? {
                          nl: `De tekst zegt betalen én ontvangen, maar onderaan de kaart staat alleen "${line.nl}". Kies in de tekst één van de twee.`,
                          en: `The text says both pay and collect, but the bottom of the card only says "${line.en}". Pick one of the two in the text.`,
                      }
                    : direction.says === 'pay'
                      ? {
                            nl: `De tekst zegt betalen, maar onderaan de kaart staat "${line.nl}": de speler krijgt geld. Kies Betalen bij het bedrag, of pas de tekst aan.`,
                            en: `The text says pay, but the bottom of the card says "${line.en}": the player gets money. Choose Pay at the amount, or change the text.`,
                        }
                      : {
                            nl: `De tekst zegt ontvangen, maar onderaan de kaart staat "${line.nl}": de speler betaalt. Kies Ontvangen bij het bedrag, of pas de tekst aan.`,
                            en: `The text says collect, but the bottom of the card says "${line.en}": the player pays. Choose Collect at the amount, or change the text.`,
                        },
                direction.kind === 'direction-differs'
                    ? { says: direction.says }
                    : undefined,
            ),
        );
    }
    if (stale.length > 0) {
        issues.push(
            issue('text.stale-name', elementKey, 'text', 'warning', {
                nl: `Deze tekst noemt ${listOf(
                    stale.map((p) => `${p.was} (dat vak heet nu ${p.now})`),
                    'en',
                )}. Vervang de naam door een variabele met Invoegen, dan blijft hij bij.`,
                en: `This text mentions ${listOf(
                    stale.map(
                        (p) => `${p.was} (that space is now called ${p.now})`,
                    ),
                    'and',
                )}. Replace the name with a variable using Insert and it stays in sync.`,
            }),
        );
    }

    return issues;
}

/** B132: an amount outside 20% of the standard amount. */
function checkAmounts(
    elementKey: string,
    amounts: readonly CheckAmount[],
): CheckIssue[] {
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
}

/**
 * One message for a photo that is too small on a space and on the title deed that shows it (R5-09): the deed's
 * message goes, and the space's says the deed too. A photo that is only too small on the deed keeps its own.
 */
function mergeBorrowedPhotos(
    elements: readonly CheckElement[],
    issues: CheckIssue[],
): CheckIssue[] {
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
}

function checkElement(element: CheckElement): CheckIssue[] {
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
}

/** The element the Controle list opens for a colour: the accent and the group colours live together. */
const COLOR_ELEMENT = 'theme_accent';
/** The accent is the name on the board and the lid: it needs the contrast of large text. */
const MIN_ACCENT_CONTRAST = 3;

/** B75, B130: a chosen colour has to print in CMYK. */
export function checkColor(color: CheckColor): CheckIssue[] {
    const issues: CheckIssue[] = [];
    const bar = color.role === 'bar';

    if (isOutOfGamut(color.hex)) {
        issues.push(
            issue('style.out-of-gamut', COLOR_ELEMENT, color.field, 'warning', {
                nl: `${color.name.nl} (${color.hex.toUpperCase()}) is feller dan drukinkt kan maken en wordt dof. Kies een iets zachtere kleur.`,
                en: `${color.name.en} (${color.hex.toUpperCase()}) is brighter than print ink can make and will come out dull. Choose a slightly softer colour.`,
            }),
        );
    }

    // The text on a bar picks ink or white by itself (`bestTextOn`), so only the bar against the board
    // and the accent against the board can go wrong.
    const low =
        contrastRatio(color.hex, color.against) <
        (bar ? MIN_SHAPE_CONTRAST : MIN_ACCENT_CONTRAST);

    if (low) {
        issues.push(
            issue(
                'style.low-contrast',
                COLOR_ELEMENT,
                color.field,
                'warning',
                bar
                    ? {
                          nl: `De kleurbalk van ${color.name.nl} valt weg tegen het bord. Kies een kleur die meer afsteekt.`,
                          en: `The colour bar of ${color.name.en} blends into the board. Choose a colour that stands out more.`,
                      }
                    : {
                          nl: 'De accentkleur leest slecht op het bord. Kies een donkerdere kleur.',
                          en: 'The accent colour is hard to read on the board. Choose a darker colour.',
                      },
            ),
        );
    }

    return issues;
}

/** B57, B65: the profile makes sense, and the home-print stickers fit an A4 sheet with bleed. */
export function checkBoard(profile: BoardProfile): CheckIssue[] {
    const key = 'board';
    const err = (code: CheckCode, field: string, message: Localized) =>
        issue(code, key, field, 'error', message);

    const positive = (v: number) => Number.isFinite(v) && v > 0;
    const basicsValid =
        positive(profile.outer) &&
        positive(profile.corner) &&
        Number.isFinite(profile.border) &&
        profile.border >= 0 &&
        (profile.panels === 2 || profile.panels === 4) &&
        positive(profile.boxLid.w) &&
        positive(profile.boxLid.h);
    if (!basicsValid) {
        return [
            err('board.profile-invalid', 'profile', {
                nl: 'De maten van het bord kloppen niet. Controleer de buitenmaat, het hoekvak en de rand.',
                en: "The board sizes don't add up. Check the outer size, the corner space and the rim.",
            }),
        ];
    }

    const issues: CheckIssue[] = [];
    const inner = profile.outer - 2 * profile.border;
    if (inner <= 0 || inner - 2 * profile.corner <= 0) {
        issues.push(
            err('board.center-missing', 'profile', {
                nl: 'Er blijft geen ruimte over voor het midden van het bord. Kies kleinere hoekvakken of een smallere rand.',
                en: 'There is no room left for the middle of the board. Choose smaller corner spaces or a narrower rim.',
            }),
        );
        return issues;
    }

    const sw = spaceWidth(profile);
    if (sw < MIN_SPACE_WIDTH) {
        issues.push(
            err('board.spaces-too-narrow', 'profile', {
                nl: `Een vak is ${formatMm(sw)} mm breed en moet minimaal ${MIN_SPACE_WIDTH} mm zijn. Kies kleinere hoekvakken.`,
                en: `A space is ${formatMm(sw, 'en')} mm wide and must be at least ${MIN_SPACE_WIDTH} mm. Choose smaller corner spaces.`,
            }),
        );
    }

    const sheet = SHEET_PRESETS.A4;
    const usableW = sheet.w - 2 * HOME_PRINT_MARGIN;
    const usableH = sheet.h - 2 * HOME_PRINT_MARGIN;
    const tooBig = stickerPieces(profile).find((p) => {
        const short = Math.min(p.size.w, p.size.h);
        const long = Math.max(p.size.w, p.size.h);
        return short > usableW + 1e-9 || long > usableH + 1e-9;
    });
    if (tooBig) {
        const w = formatMm(tooBig.size.w);
        const h = formatMm(tooBig.size.h);
        issues.push(
            err('board.home-print-too-big', 'profile', {
                nl: `Een stuk van het bord is met afloop ${w} × ${h} mm en past niet op A4, dus de Thuisprint-set lukt niet. Kies kleinere hoekvakken of een kleiner bord.`,
                en: `One piece of the board is ${w.replace(',', '.')} × ${h.replace(',', '.')} mm with bleed and doesn't fit on A4, so the Home-print set won't work. Choose smaller corner spaces or a smaller board.`,
            }),
        );
    }
    return issues;
}

/** More A4 pieces than this and a lid at home is more puzzle than sticker. */
const MAX_LID_SHEETS = 4;

/**
 * At home the lid comes on A4, in pieces that overlap (R5-29). A very large lid takes many pieces: then a print
 * shop is the better route. Only checked when the lid is a part.
 */
export function checkBoxLid(profile: BoardProfile): CheckIssue[] {
    const sheets = lidTiles(profile.boxLid).tiles.length;

    if (sheets <= MAX_LID_SHEETS) {
        return [];
    }

    return [
        issue('board.box-lid-too-big', 'boxLid', 'size', 'warning', {
            nl: `Het doosdeksel komt thuis op ${String(sheets)} vellen A4 die je tegen elkaar plakt. Wil je één sticker, laat hem dan bij een drukkerij maken.`,
            en: `At home the box lid comes on ${String(sheets)} A4 sheets that you stick down side by side. For one sticker, have it made at a print shop.`,
        }),
    ];
}

/** B99: only the board is required. */
export function checkParts(parts: PartSelection): CheckIssue[] {
    if (parts.board) return [];
    return [
        issue('parts.board-missing', 'parts', 'board', 'error', {
            nl: 'Het bord is het enige verplichte onderdeel. Zet het weer aan.',
            en: 'The board is the only required part. Turn it back on.',
        }),
    ];
}

/** Pawns switched on without a photo print as empty stands with only a name: say so (ronde 2). */
export function checkPawns(
    parts: PartSelection,
    pawnsWithoutPhoto: readonly string[],
): CheckIssue[] {
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
}

/**
 * B135: an extra card without a text prints as an empty card. So does a standard card after "Kaarten leegmaken"
 * (B194); that one cannot be taken out, but it can go back to its standard text.
 */
export function checkEmptyCards(keys: readonly string[]): CheckIssue[] {
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
}

/** A street, station or utility after "Namen leegmaken" (B201) prints without a name on the board and its deed. */
export function checkEmptyNames(keys: readonly string[]): CheckIssue[] {
    return keys.map((key) =>
        issue('space.no-name', key, 'name', 'warning', {
            nl: 'Dit vak heeft nog geen naam. Schrijf er een op of zet het terug naar standaard.',
            en: 'This space has no name yet. Write one or set it back to standard.',
        }),
    );
}

/** The house rules card is on but empty: it would print as a blank card (bug 20, ronde 3). */
function checkHouseRules(empty: boolean): CheckIssue[] {
    return empty
        ? [
              issue('house-rules.empty', 'house_rules', 'text', 'warning', {
                  nl: 'Huisregels is leeg, dus de kaart gaat niet mee in je set. Schrijf je regels op als je hem wel wilt.',
                  en: 'House rules is empty, so the card is left out of your set. Write your rules if you want it.',
              }),
          ]
        : [];
}

/**
 * The invitation is in the set, but its "Wanneer, waar" is still the dotted lines (R5-28, Mo): the PNG for the group
 * chat goes out with nothing filled in. Writing by hand on a printed card is fine, so it is a warning.
 */
function checkInvitation(blank: boolean): CheckIssue[] {
    return blank
        ? [
              issue('invitation.blank', 'invitation', 'text', 'warning', {
                  nl: 'Op de uitnodiging staan nog lege stippellijnen bij Wanneer en Waar. Vul de datum en de plek in, of schrijf ze later op de kaart.',
                  en: 'The invitation still has empty dotted lines at When and Where. Fill in the date and the place, or write them on the card later.',
              }),
          ]
        : [];
}

/**
 * The same message twice for one element helps nobody (bug 31, ronde 3): two texts of one element that both
 * overflow, or a check that ran for two reasons, keep one row.
 */
function dedupe(issues: readonly CheckIssue[]): CheckIssue[] {
    const seen = new Set<string>();

    return issues.filter((item) => {
        const keys = [item.id, `${item.elementKey}|${item.message.en}`];
        if (keys.some((key) => seen.has(key))) {
            return false;
        }
        keys.forEach((key) => seen.add(key));

        return true;
    });
}

/** Bug 36 of ronde 3: a free layer on the box lid that covers the fixed text makes both hard to read. */
function checkLidLayers(ids: readonly string[]): CheckIssue[] {
    return ids.map((id) =>
        issue('layer.over-text', 'box_lid', `layer.${id}`, 'warning', {
            nl: 'Een eigen laag ligt over de titel of de tekst van het deksel. Schuif hem buiten de rode stippellijn.',
            en: 'One of your layers lies over the title or the text of the lid. Move it outside the red dashed line.',
        }),
    );
}

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
function checkCenterFold(items: readonly CheckFold[]): CheckIssue[] {
    return items.map((item) =>
        issue(
            'center.on-fold',
            'board_center',
            item.field,
            'warning',
            FOLD_MESSAGES[item.what],
        ),
    );
}

/** Bug 14 of test round 3: the edition name runs off the booklet or the banknote strip. */
function checkEditionName(places: readonly CheckNamePlace[]): CheckIssue[] {
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
}

/** Runs all checks. Issues come in a stable order: parts, board, then elements in the order given. */
export function runChecks(input: CheckInput): CheckIssue[] {
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
}
