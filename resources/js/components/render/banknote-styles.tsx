import type { MoneyStyle } from '@/lib/render/edition-part-styles';

import { ModernNoteFace } from './banknote-styles-modern';
import { PlayfulNoteFace } from './banknote-styles-playful';
import type { StyledNoteProps } from './banknote-styles-shared';
import { VintageNoteFace } from './banknote-styles-vintage';

/**
 * The styles of the money (B270, Niek, feedback 22 nov), on top of the theme like the board styles (B268). Every
 * style keeps the paper colour of each value (B85) and the inks of the theme, uses only the fonts the print page
 * loads (Playfair Display 700, League Spartan 800, Instrument Sans) and keeps what print and checks rely on: the
 * amount with the currency (`value`), the value in the corners (`corner-value`), the bank (`bank-name`), the edition
 * (`edition-name`) and "speelgeld" or the own currency (`play-money`). The frame line runs 4.6 mm inside the edge in
 * every style, so the set mark (B242) sits on it as on the theme's note.
 *
 * - Vintage: an engraved note. A twisted rope between two rules with a rosette block in each corner, a woven net of
 *   waves, two lathe rosettes and a rosette ring round a beaded oval with the amount in Playfair, four cut-corner
 *   cartouches with the value and a notched banner with the name of the edition.
 * - Modern: flat. The colour of the value is the field, a quarter disc in a shade of it, the value huge in League
 *   Spartan and a light panel with the bank, the amount and the edition.
 * - Speels: rounded. A polka-dot field in a rounded frame, the amount on a wavy badge with a sticker shadow, the
 *   value and two icons in round bubbles, the edition on a tilted pill and some confetti.
 */
export const StyledNoteFace = ({
    style,
    ...props
}: StyledNoteProps & { style: MoneyStyle }) => {
    switch (style) {
        case 'vintage':
            return <VintageNoteFace {...props} />;
        case 'modern':
            return <ModernNoteFace {...props} />;
        case 'playful':
            return <PlayfulNoteFace {...props} />;
    }
};
