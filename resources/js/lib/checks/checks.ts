import type { Localized } from '../game/types';
import {
    effectiveDpi,
    isSharpEnough,
    placementTarget,
} from '../photos/resolution';
import { coversTarget } from '../photos/transform';
import { MIN_SPACE_WIDTH, spaceWidth, type BoardProfile } from '../print/board';
import { stickerPieces } from '../print/home-stickers';
import { SHEET_PRESETS } from '../print/imposition';
import { formatMm } from '../print/types';
import type {
    CheckCode,
    CheckElement,
    CheckInput,
    CheckIssue,
    CheckPhoto,
    CheckText,
    IssueIcon,
    PartSelection,
    Severity,
} from './types';

/** Mirrors the default margin of `packStickers` in `print/home-stickers.ts`. */
const HOME_PRINT_MARGIN = 8;
const BOX_LID_BLEED = 3;

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
    const target = placementTarget(photo.frame, photo.bleed);
    const issues: CheckIssue[] = [];

    if (!coversTarget(photo.source, photo.transform, target)) {
        issues.push(
            issue('photo.not-covering', elementKey, photo.field, 'warning', {
                nl: 'De foto bedekt het kader niet helemaal. Zoom in of schuif de foto terug.',
                en: "The photo doesn't cover the whole frame. Zoom in or move the photo back.",
            }),
        );
    }

    const dpi = Math.round(effectiveDpi(photo.source, photo.transform, target));
    if (!isSharpEnough(dpi)) {
        issues.push(
            issue(
                'photo.low-resolution',
                elementKey,
                photo.field,
                'warning',
                {
                    nl: `De foto heeft ${dpi} dpi op dit formaat. Kies een grotere foto of zoom minder in.`,
                    en: `The photo has ${dpi} dpi at this size. Choose a larger photo or zoom in less.`,
                },
                { dpi },
            ),
        );
    }
    return issues;
}

export function checkText(elementKey: string, text: CheckText): CheckIssue[] {
    if (text.fit.fits) return [];
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

export function checkElement(element: CheckElement): CheckIssue[] {
    return [
        ...(element.photos ?? []).flatMap((p) => checkPhoto(element.key, p)),
        ...(element.texts ?? []).flatMap((t) => checkText(element.key, t)),
    ];
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
                en: `A space is ${formatMm(sw).replace(',', '.')} mm wide and must be at least ${MIN_SPACE_WIDTH} mm. Choose smaller corner spaces.`,
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

/** B57: the box lid sticker has to fit an A3 sheet for home printing. Only checked when the lid is a part. */
export function checkBoxLid(profile: BoardProfile): CheckIssue[] {
    const sheet = SHEET_PRESETS.A3;
    const w = profile.boxLid.w + 2 * BOX_LID_BLEED;
    const h = profile.boxLid.h + 2 * BOX_LID_BLEED;
    const usableW = sheet.w - 2 * HOME_PRINT_MARGIN;
    const usableH = sheet.h - 2 * HOME_PRINT_MARGIN;
    if (Math.min(w, h) <= usableW + 1e-9 && Math.max(w, h) <= usableH + 1e-9)
        return [];
    return [
        issue('board.box-lid-too-big', 'boxLid', 'size', 'warning', {
            nl: `Het doosdeksel is met afloop ${formatMm(w)} × ${formatMm(h)} mm en past niet op A3. Laat de sticker bij een drukkerij maken.`,
            en: `The box lid is ${formatMm(w).replace(',', '.')} × ${formatMm(h).replace(',', '.')} mm with bleed and doesn't fit on A3. Have the sticker made at a print shop.`,
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
    const first = pawnsWithoutPhoto[0];
    if (!parts.tokens || first === undefined) return [];
    const n = pawnsWithoutPhoto.length;
    return [
        issue('pawns.no-photo', first, 'photo', 'warning', {
            nl:
                n === 1
                    ? '1 pion heeft nog geen foto en wordt een lege staander met alleen een naam.'
                    : `${n} pionnen hebben nog geen foto en worden lege staanders met alleen een naam.`,
            en:
                n === 1
                    ? '1 pawn has no photo yet and prints as an empty stand with only a name.'
                    : `${n} pawns have no photo yet and print as empty stands with only a name.`,
        }),
    ];
}

/** Runs all checks. Issues come in a stable order: parts, board, then elements in the order given. */
export function runChecks(input: CheckInput): CheckIssue[] {
    return [
        ...checkParts(input.parts),
        ...checkBoard(input.board),
        ...(input.parts.boxLid ? checkBoxLid(input.board) : []),
        ...checkPawns(input.parts, input.pawnsWithoutPhoto ?? []),
        ...input.elements.flatMap(checkElement),
    ];
}
