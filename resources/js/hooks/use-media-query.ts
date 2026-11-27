import { useCallback, useSyncExternalStore } from 'react';

import { mediaMatches, subscribeMedia } from '@/lib/media-query';

/** Whether a media query matches now, following changes. `fallback` is used where there is no `matchMedia`. */
const useMediaQuery = (query: string, fallback = false): boolean => {
    const subscribe = useCallback(
        (onChange: () => void) => subscribeMedia(query, onChange),
        [query],
    );

    return useSyncExternalStore(
        subscribe,
        () => mediaMatches(query, fallback),
        () => fallback,
    );
};

/**
 * The editor shows the list and the panel side by side from here (Tailwind `md`, B155): a tablet gets two columns,
 * a desktop three. Below it the phone layout folds the panel sections. Phone-only classes use `md:` / `max-md:`
 * to match; this is the one place the number lives in script.
 */
const WIDE_SCREEN_MIN_PX = 768;

/** The media query for {@link WIDE_SCREEN_MIN_PX}, for code outside React (`window.matchMedia`). */
export const WIDE_SCREEN_QUERY = `(min-width: ${WIDE_SCREEN_MIN_PX}px)`;

export const useWideScreen = (): boolean => {
    return useMediaQuery(WIDE_SCREEN_QUERY, true);
};

/**
 * Three columns (Tailwind `lg`): the editor has a preview between the list and the panel, so a popover can open
 * beside the panel. On a tablet the panel sits at the edge of the screen and a popover goes above or below.
 */
export const useThreeColumns = (): boolean => {
    return useMediaQuery('(min-width: 1024px)', true);
};

/** A small phone (320 to 379 px), where a long button label does not fit beside the number of sets (B179). */
export const useSmallPhone = (): boolean => {
    return useMediaQuery('(max-width: 379px)', false);
};

/**
 * Whether the person has a keyboard and a mouse, so keyboard hints ("druk op W") make sense. A phone or a
 * tablet without a mouse gets none (bug 10 of the integratie-evaluatie).
 */
export const useKeyboardHints = (): boolean => {
    return !useMediaQuery('(hover: none), (pointer: coarse)', false);
};

/**
 * Phone upright and tablet upright (below 1024 px wide, more than 500 px high): the preview sits above the fields and
 * folds to one line (B173, UX 5 ronde 4). A phone or tablet on its side has the preview next to the fields instead.
 */
const FOLDABLE_PREVIEW_QUERY =
    '(max-width: 1023.98px) and (min-height: 500.02px)';

export const useFoldablePreview = (): boolean => {
    return useMediaQuery(FOLDABLE_PREVIEW_QUERY);
};

/**
 * A tablet or desktop lower than 900 px: the small board starts folded to one line there, so the list under it
 * keeps room (vindbaarheid point 16; on 1440 × 900 it left three rows of the list in sight).
 */
export const useShortScreen = (): boolean => {
    return useMediaQuery(`${WIDE_SCREEN_QUERY} and (max-height: 899.98px)`);
};
