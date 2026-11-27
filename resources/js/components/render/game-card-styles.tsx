import type { CardStyle } from '@/lib/render/edition-part-styles';
import type { Theme } from '@/lib/render/themes';
import type { DeckId } from '@/types/game';

import { creamed } from './card-look';
import { ModernArtPlate, ModernBack } from './game-card-styles-modern-back';
import { ModernFront } from './game-card-styles-modern-front';
import { PlayfulArtPlate, PlayfulBack } from './game-card-styles-playful-back';
import { PlayfulFront } from './game-card-styles-playful-front';
import type {
    ArtPlateProps,
    StyledBackProps,
    StyledFrontProps,
} from './game-card-styles-shared';
import { VintageArtPlate, VintageBack } from './game-card-styles-vintage-back';
import { VintageFront } from './game-card-styles-vintage-front';

/**
 * Chance and Community Chest cards in a style of their own (B269), the same family as the board styles (B268):
 *
 * - Vintage: cream-tinted deck colour, a guilloche border between two rules like an old banknote, a rosette with
 *   the deck symbol, Playfair in spaced capitals, and the amount in a cartouche with cut corners.
 * - Modern: a flat block in the deck colour with the name large in it, the text left-aligned and big, and the
 *   amount on a bar of ink across the foot of the card.
 * - Speels (playful): a paper tile with a hand-drawn edge on the deck colour, the name on a tilted sticker next to
 *   a scalloped badge, confetti, and the amount on a pill.
 *
 * The theme's own look stays in game-card.tsx. Every style keeps the slots of the theme look (`title`, `text`,
 * `amount`, `art`, `title-band`, `text-panel`, `back-art`, `edition`), so the fit check and the print find the
 * same parts, and only uses the fonts the print page loads.
 */

/** The paper a card is printed on in a style: it runs into the bleed. */
export const cardPaper = (
    theme: Theme,
    style: CardStyle,
    deck: DeckId,
    side: 'front' | 'back',
): string => {
    switch (style) {
        case 'vintage':
            return creamed(theme.deck[deck], 0.5);
        case 'modern':
            return side === 'back' ? theme.deckAccent[deck] : theme.paper;
        case 'playful':
            return theme.deck[deck];
    }
};

export const StyledCardFront = (props: StyledFrontProps) => {
    switch (props.style) {
        case 'vintage':
            return <VintageFront {...props} />;
        case 'modern':
            return <ModernFront {...props} />;
        case 'playful':
            return <PlayfulFront {...props} />;
    }
};

/** The standard back of a card in a style: no photo or pattern of its own. */
export const StyledCardBack = (props: StyledBackProps) => {
    switch (props.style) {
        case 'vintage':
            return <VintageBack {...props} />;
        case 'modern':
            return <ModernBack {...props} />;
        case 'playful':
            return <PlayfulBack {...props} />;
    }
};

/**
 * The plate in the middle of a back made of a photo or a pattern (B56, B130), in a style: a cartouche in Vintage,
 * a block across the card in Modern, a scalloped badge in Speels. It names the deck so the two backs stay apart.
 */
export const StyledArtPlate = ({
    style,
    ...props
}: ArtPlateProps & { style: CardStyle }) => {
    switch (style) {
        case 'vintage':
            return <VintageArtPlate {...props} />;
        case 'modern':
            return <ModernArtPlate {...props} />;
        case 'playful':
            return <PlayfulArtPlate {...props} />;
    }
};
