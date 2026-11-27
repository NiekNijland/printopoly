import type { Localized } from '../../types/game';
import { formatMm } from '../../types/print';
import { issue } from './checks-issue';
import type { CheckCode, CheckIssue } from './checks-types';
import { MIN_SPACE_WIDTH, spaceWidth, type BoardProfile } from './print-board';
import { stickerPieces } from './print-home-stickers';
import { SHEET_PRESETS } from './print-imposition';
import { lidTiles } from './print-lid-tiles';

/** Mirrors the default margin of `packStickers` in `print/home-stickers.ts`. */
const HOME_PRINT_MARGIN = 8;
/** B57, B65: the profile makes sense, and the home-print stickers fit an A4 sheet with bleed. */
export const checkBoard = (profile: BoardProfile): CheckIssue[] => {
    const key = 'board';
    const err = (code: CheckCode, field: string, message: Localized) =>
        issue(code, key, field, 'error', message);

    const positive = (v: number) => Number.isFinite(v) && v > 0;
    const panels: unknown = profile.panels;
    const basicsValid =
        positive(profile.outer) &&
        positive(profile.corner) &&
        Number.isFinite(profile.border) &&
        profile.border >= 0 &&
        (panels === 2 || panels === 4) &&
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
};

/** More A4 pieces than this and a lid at home is more puzzle than sticker. */
const MAX_LID_SHEETS = 4;

/**
 * At home the lid comes on A4, in pieces that overlap (R5-29). A very large lid takes many pieces: then a print
 * shop is the better route. Only checked when the lid is a part.
 */
export const checkBoxLid = (profile: BoardProfile): CheckIssue[] => {
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
};
