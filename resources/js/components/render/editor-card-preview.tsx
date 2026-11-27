import { GameCard } from '@/components/render/game-card';
import { TitleDeed } from '@/components/render/title-deed';
import { deckIcon, resolvedCardOf } from '@/lib/render/edition-resolve';
import { iconSource } from '@/lib/render/editor-photo-cache';
import { deedsFor } from '@/lib/render/standard-edition';

import {
    partSource,
    toRenderLayers,
    type PreviewPart,
} from './editor-preview-part';

export const CardPreview = ({
    target,
    resolved,
    photos,
    common,
}: PreviewPart) => {
    const source = partSource(photos);
    const deck = target.key.split('.')[1];
    if (deck !== 'chance' && deck !== 'chest') {
        return null;
    }
    const resolvedCard = resolvedCardOf(resolved, target.key);
    const card = resolvedCard?.base;
    if (card === undefined || resolvedCard === undefined) {
        return null;
    }

    return (
        <GameCard
            {...common}
            deck={deck}
            side="front"
            card={card}
            text={resolvedCard.text}
            amount={resolvedCard.lineAmount}
            purpose={resolvedCard.purpose}
            photo={source(resolvedCard.photo, resolvedCard.photoStyle)}
        />
    );
};

export const CardBackPreview = ({
    target,
    resolved,
    photos,
    common,
}: PreviewPart) => {
    const source = partSource(photos);
    const deck = target.key.split('.')[1];
    const back =
        deck === 'chance' || deck === 'chest'
            ? resolved.cardBacks?.[deck]
            : resolved.deedBack;
    if (back === null || back === undefined) {
        return null;
    }
    if (deck === 'deed') {
        const first = deedsFor()[0];
        if (first === undefined) {
            return null;
        }

        return (
            <TitleDeed
                {...common}
                space={first}
                side="back"
                photo={source(back.photo)}
                layers={toRenderLayers(back.layers, photos)}
            />
        );
    }

    return (
        <GameCard
            {...common}
            deck={deck === 'chance' ? 'chance' : 'chest'}
            side="back"
            edition={resolved.name}
            pattern={back.pattern}
            photo={source(back.photo)}
            icon={iconSource(
                deckIcon(resolved, deck === 'chance' ? 'chance' : 'chest'),
                photos,
            )}
            layers={toRenderLayers(back.layers, photos)}
        />
    );
};
