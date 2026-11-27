import type { ReactNode } from 'react';

import { BoardSpace } from '@/components/render/board-space';
import { CARD_SIZE_MM } from '@/components/render/game-card';
import { TitleDeed } from '@/components/render/title-deed';
import { iconSource } from '@/lib/render/editor-photo-cache';
import { deedsFor, isOwnable } from '@/lib/render/standard-edition';

import { partSource, type PreviewPart } from './editor-preview-part';

/** Room between the front and the back of a deed with a story, in mm. */
export const SPREAD_GAP = 6;

/** A deed alone, or with a story its front and back side by side, so the story shows where it prints (B169). */
export const DeedSpread = ({
    story,
    children,
}: {
    story: string | undefined;
    children: (side: 'front' | 'back') => ReactNode;
}) => {
    if (story === undefined) {
        return children('front');
    }

    return (
        <div
            style={{
                display: 'flex',
                gap: `${SPREAD_GAP}mm`,
                width: `${2 * CARD_SIZE_MM.width + SPREAD_GAP}mm`,
            }}
            data-deed-spread=""
        >
            <div style={{ flex: 'none' }}>{children('front')}</div>
            <div style={{ flex: 'none' }}>{children('back')}</div>
        </div>
    );
};

export const SpacePreview = ({
    target,
    resolved,
    photos,
    common,
}: PreviewPart) => {
    const source = partSource(photos);
    const position = Number(target.key.split('.')[1]);
    const space = resolved.spaces[position];
    if (space === undefined) {
        return null;
    }
    if (target.deed === true && isOwnable(space.base)) {
        const deed = resolved.deeds?.find(
            (candidate) => candidate.space.position === position,
        );
        if (deed !== undefined) {
            return (
                <DeedSpread story={deed.story}>
                    {(side) => (
                        <TitleDeed
                            {...common}
                            space={deed.space}
                            side={side}
                            name={deed.name}
                            town={deed.town}
                            story={deed.story}
                            photo={
                                side === 'front'
                                    ? source(deed.photo, deed.photoStyle)
                                    : undefined
                            }
                            icon={iconSource(space.icon, photos)}
                        />
                    )}
                </DeedSpread>
            );
        }
    }

    return (
        <BoardSpace
            {...common}
            space={space.base}
            profile={resolved.boardProfile}
            name={space.name}
            town={space.town}
            text={space.text}
            photo={source(space.photo, space.photoStyle)}
            icon={iconSource(space.icon, photos)}
        />
    );
};

export const DeedPreview = ({
    target,
    resolved,
    photos,
    common,
}: PreviewPart) => {
    const source = partSource(photos);
    const index = Number(target.key.split('.')[1]);
    const resolvedDeed = resolved.deeds?.[index - 1];
    // The deed of the edition carries its own amounts (B132).
    const deed = resolvedDeed?.space ?? deedsFor()[index - 1];
    if (deed === undefined || resolvedDeed === undefined) {
        return null;
    }

    return (
        <DeedSpread story={resolvedDeed.story}>
            {(side) => (
                <TitleDeed
                    {...common}
                    space={deed}
                    side={side}
                    name={resolvedDeed.name}
                    town={resolvedDeed.town}
                    story={resolvedDeed.story}
                    photo={
                        side === 'front'
                            ? source(
                                  resolvedDeed.photo,
                                  resolvedDeed.photoStyle,
                              )
                            : undefined
                    }
                    icon={iconSource(
                        resolved.spaces[deed.position]?.icon,
                        photos,
                    )}
                />
            )}
        </DeedSpread>
    );
};
