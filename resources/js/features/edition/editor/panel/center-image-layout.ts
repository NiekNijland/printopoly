import type { ElementOverride } from '@/lib/render/edition-types';
import { seamClearX, startingPoint } from '@/lib/render/photos-transform';
import type { Size } from '@/types/print';

/** The four layouts of the board centre (B187): one photo, which every layout with a photo takes along. */
export type CenterLayoutChoice = 'name' | 'photo' | 'full' | 'logo';

export const CENTER_LAYOUTS: readonly CenterLayoutChoice[] = [
    'name',
    'photo',
    'full',
    'logo',
];

/** The layout a centre shows now. A photo over the whole centre is "full", whatever the mode says. */
export const centerLayoutOf = (
    override: ElementOverride | undefined,
): CenterLayoutChoice => {
    if (override?.centerMode === 'logo') {
        return 'logo';
    }
    if (override?.background !== undefined) {
        return 'full';
    }

    return override?.centerMode === 'photo' ? 'photo' : 'name';
};

/**
 * The fields that switch the centre to another layout, keeping its one photo (B187, Sophie in ronde 4). The photo
 * moves between "above the name" (`photo`) and "over the whole centre" (`background`); with only the name it waits
 * in `photo`, so the next layout with a photo shows it again. `null` when the layout needs a photo first.
 */
export const switchCenterLayout = (
    override: ElementOverride | undefined,
    next: CenterLayoutChoice,
    aspectOf: (photoId: string) => number | undefined,
    /** The centre with the bleed of its photo, in mm: where a photo over the whole centre starts (R5-03). */
    centre?: Size,
): Partial<ElementOverride> | null => {
    const current = override?.background ?? override?.photo;
    const withAspect = (photoId: string) => {
        const aspect = aspectOf(photoId);

        return aspect === undefined ? {} : { photoAspect: aspect };
    };

    if (next === 'name') {
        return {
            centerMode: undefined,
            background: undefined,
            ...(current === undefined ? {} : { photo: current }),
        };
    }
    if (current === undefined) {
        return null;
    }
    if (next === 'full') {
        const { fit: _fit, ...rest } = current;
        // The crop of the small square means nothing over the whole centre: the photo starts there as a new one
        // does, with the faces a third from the top and clear of the fold (R5-03).
        const aspect = aspectOf(current.photoId);
        const start =
            aspect === undefined
                ? undefined
                : startingPoint({ w: aspect, h: 1 }, centre);
        // Across, the middle of the photo keeps off the vertical fold where the photo is wide enough (B261).
        const across =
            aspect === undefined || centre === undefined
                ? undefined
                : seamClearX({ w: aspect, h: 1 }, centre);

        return {
            centerMode: undefined,
            photo: undefined,
            background:
                start === undefined || override?.background !== undefined
                    ? rest
                    : {
                          ...rest,
                          cx: across ?? start.x,
                          cy: start.y,
                          scale: 1,
                      },
        };
    }

    return {
        centerMode: next,
        background: undefined,
        // A logo fits whole by default (Passend, B168, B180); a photo keeps how it was placed.
        photo: next === 'logo' ? { ...current, fit: true } : current,
        ...withAspect(current.photoId),
    };
};
