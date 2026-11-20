export type Rotation = 0 | 90 | 180 | 270;

/**
 * How a photo sits in its frame. Stored normalised (B61) so a frame can change size later
 * without the picture jumping.
 *
 * - `x`, `y`: centre of the visible area, as a fraction (0 to 1) of the photo after
 *   rotation. 0.5, 0.5 is centred.
 * - `scale`: zoom relative to "cover" (the smallest size that fills the frame). 1 = 100%,
 *   the editor allows 1 to 3 (100 to 300%).
 * - `rotation`: clockwise quarter turns, in degrees.
 * - `grayscale`: black and white, baked into the print source.
 */
export interface PhotoTransform {
    x: number;
    y: number;
    scale: number;
    rotation: Rotation;
    grayscale: boolean;
}

export type PhotoFormat = 'jpeg' | 'png' | 'webp' | 'heic';
