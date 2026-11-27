import { issue } from './checks-issue';
import type { CheckColor, CheckIssue } from './checks-types';
import { MIN_SHAPE_CONTRAST, contrastRatio, isOutOfGamut } from './gamut';

/** The element the Controle list opens for a colour: the accent and the group colours live together. */
const COLOR_ELEMENT = 'theme_accent';
/** The accent is the name on the board and the lid: it needs the contrast of large text. */
const MIN_ACCENT_CONTRAST = 3;

/** B75, B130: a chosen colour has to print in CMYK. */
export const checkColor = (color: CheckColor): CheckIssue[] => {
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
};
