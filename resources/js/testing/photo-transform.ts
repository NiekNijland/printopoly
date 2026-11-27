import {
    clampTransform,
    defaultTransform,
} from '@/lib/render/photos-transform';
import type { PhotoTransform, Rotation } from '@/types/photos';
import type { Size } from '@/types/print';

export const coverTransform = (
    source: Size,
    target: Size,
    rotation: Rotation = 0,
    grayscale = false,
): PhotoTransform =>
    clampTransform(
        source,
        { ...defaultTransform(), rotation, grayscale },
        target,
    );
