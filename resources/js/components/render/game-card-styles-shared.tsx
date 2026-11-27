import { mix } from '@/lib/render/color';
import type { CardStyle } from '@/lib/render/edition-part-styles';
import type { PhotoSource } from '@/lib/render/photo';
import type { Theme } from '@/lib/render/themes';
import type { DeckId } from '@/types/game';

import { creamed, engraving } from './card-look';
import type { SpaceIconSource } from './space-icon';

export type StyledFrontProps = {
    style: CardStyle;
    deck: DeckId;
    w: number;
    h: number;
    name: string;
    body: string;
    /** "Betaal € 15 voor je taalcursus", or empty without an amount. */
    amountText: string;
    /** The height of the amount line: two lines with a purpose. */
    lineHeight: number;
    photo?: PhotoSource;
    /** The photo fills the whole card (B124). */
    full: boolean;
    bleed: number;
};

export const deckIcon = (deck: DeckId): 'dice' | 'chest' => {
    return deck === 'chance' ? 'dice' : 'chest';
};

/** Border inset and band width of Vintage on a card. */
export const V_INSET = 2.4;
export const V_BAND = 2;

export const vintageInks = (
    theme: Theme,
    deck: DeckId,
): { accent: string; engr: string; paper: string; plate: string } => {
    const accent = theme.deckAccent[deck];
    const paper = creamed(theme.deck[deck], 0.5);

    return {
        accent,
        engr: engraving(theme, accent),
        paper,
        plate: mix(paper, '#FFFFFF', 0.55),
    };
};

/** The colours of confetti: the accents of the theme and its ink. */
export const confettiColors = (theme: Theme, deck: DeckId): string[] => {
    return [theme.deckAccent[deck], theme.secondaryAccent, theme.ink];
};

export type StyledBackProps = {
    style: CardStyle;
    deck: DeckId;
    w: number;
    h: number;
    name: string;
    edition?: string;
    icon?: SpaceIconSource;
};

export type ArtPlateProps = {
    deck: DeckId;
    w: number;
    h: number;
    name: string;
    edition?: string;
    bleed: number;
};

export const hasText = (text: string | undefined): boolean => {
    return text !== undefined && text.trim() !== '';
};
