import { GameCard } from '@/components/render/game-card';
import { HouseRulesCard } from '@/components/render/house-rules';
import { TitleDeed } from '@/components/render/title-deed';
import { parseKey, spaceKey } from '@/lib/render/edition-keys';
import { resolvedCardOf } from '@/lib/render/edition-resolve';
import { deedsFor } from '@/lib/render/standard-edition';
import { THEMES } from '@/lib/render/themes';
import { mm } from '@/lib/render/units';

import { common, deckIconOf, deckOf, type ArtKit } from './print-art-kit';

type CardArtProps = {
    kit: ArtKit;
    elementKey: string;
    side: 'front' | 'back';
    bleedMm: number;
};

/** A card (deed, Chance or Community Chest) at 63 x 88 mm, with bleed. */
export const CardArt = (props: CardArtProps) => {
    const kind = parseKey(props.elementKey)?.kind;

    if (kind === 'houseRules') {
        return <HouseRulesArt {...props} />;
    }

    if (kind === 'deed') {
        return <DeedArt {...props} />;
    }

    return kind === 'card' ? <DeckCardArt {...props} /> : null;
};

const HouseRulesArt = ({ kit, elementKey, side, bleedMm }: CardArtProps) => {
    const { ctx } = kit;
    const props = common(ctx, bleedMm);
    const { resolved } = ctx;
    const rules = resolved.houseRules;

    if (rules === null) {
        return null;
    }

    // The rules card has a front only: its back is the plain paper of the theme, so a shop that
    // prints both sides still gets a pair (B56).
    return side === 'front' ? (
        <HouseRulesCard
            {...props}
            text={rules.text ?? ''}
            editionName={resolved.name}
            photo={kit.photo(elementKey)}
        />
    ) : (
        <div
            style={{
                width: mm(63 + 2 * bleedMm),
                height: mm(88 + 2 * bleedMm),
                background: THEMES[resolved.theme].paper,
            }}
        />
    );
};

const DeedArt = ({ kit, elementKey, side, bleedMm }: CardArtProps) => {
    const { ctx } = kit;
    const props = common(ctx, bleedMm);
    const { resolved } = ctx;
    const index = Number(elementKey.split('.')[1]) - 1;
    const deed = resolved.deeds?.[index];
    // The deed of the edition carries its own amounts (B132).
    const space = deed?.space ?? deedsFor()[index];

    if (space === undefined || deed === undefined) {
        return null;
    }

    return (
        <TitleDeed
            {...props}
            space={space}
            side={side}
            name={deed.name}
            town={deed.town}
            story={deed.story}
            photo={side === 'front' ? kit.photo(elementKey) : undefined}
            icon={
                space.type === 'street'
                    ? undefined
                    : kit.icon(spaceKey(space.position))
            }
            layers={
                side === 'back' && resolved.deedBack !== null
                    ? kit.layers(resolved.deedBack.layers)
                    : undefined
            }
        />
    );
};

const DeckCardArt = ({ kit, elementKey, side, bleedMm }: CardArtProps) => {
    const { ctx } = kit;
    const props = common(ctx, bleedMm);
    const { resolved } = ctx;
    const deck = deckOf(elementKey);

    if (deck === null) {
        return null;
    }

    const resolvedCard = resolvedCardOf(resolved, elementKey);
    const card = resolvedCard?.base;
    const back = resolved.cardBacks?.[deck];

    if (card === undefined || resolvedCard === undefined) {
        return null;
    }

    if (side === 'back') {
        return (
            <GameCard
                {...props}
                deck={deck}
                side="back"
                photo={kit.photo(`card_back.${deck}`)}
                pattern={back?.pattern}
                icon={deckIconOf(kit, deck)}
                edition={resolved.name}
                layers={
                    back === undefined ? undefined : kit.layers(back.layers)
                }
            />
        );
    }

    return (
        <GameCard
            {...props}
            deck={deck}
            side="front"
            card={card}
            text={resolvedCard.text}
            amount={resolvedCard.lineAmount}
            purpose={resolvedCard.purpose}
            photo={kit.photo(elementKey)}
        />
    );
};
