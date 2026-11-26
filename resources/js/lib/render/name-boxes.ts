import { BOOKLET_PAGE } from '@/lib/render/print-extras';

import { estimateMeasure, fitText, type FitTextResult } from './fit-text';

/** A box the edition name is fitted into on a printed part, with its smallest letter size. */
export interface NameBox {
    w: number;
    h: number;
    maxFontMm: number;
    minFontMm: number;
    lineHeight: number;
}

/** Margin left and right of a booklet page. */
const BOOKLET_SIDE = 13;

/** The title of a text page of the booklet ("Welkom bij …"): up to three lines before it gets cut off. */
export const BOOKLET_TITLE_BOX: NameBox = {
    w: BOOKLET_PAGE.w - 2 * BOOKLET_SIDE,
    h: 12,
    maxFontMm: 8.5,
    minFontMm: 3.2,
    lineHeight: 1.05,
};

/** The edition name on the cover of the booklet, with a cover photo (the smaller box). */
export const BOOKLET_COVER_BOX: NameBox = {
    w: BOOKLET_PAGE.w - 2 * BOOKLET_SIDE,
    h: 36,
    maxFontMm: 17,
    minFontMm: 5,
    lineHeight: 1.02,
};

/** The edition name on the dark strip of a banknote. */
export const NOTE_NAME_BOX: NameBox = {
    w: 45.8,
    h: 6.2,
    maxFontMm: 5.5,
    minFontMm: 1.6,
    lineHeight: 1.05,
};

/**
 * Whether a name fits a box at its smallest size, wrapping at spaces, with the rough measure the checks use
 * where there is no page to measure on (bug 14 of test round 3). Only a very long word or a very long name fails.
 */
export function fitsNameBox(text: string, box: NameBox): FitTextResult {
    return fitText({
        text,
        widthMm: box.w,
        heightMm: box.h,
        maxFontMm: box.maxFontMm,
        minFontMm: box.minFontMm,
        wrap: 'words',
        lineHeight: box.lineHeight,
        measure: estimateMeasure,
    });
}
