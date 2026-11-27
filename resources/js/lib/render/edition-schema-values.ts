import { isSpaceIconPreset } from '@/lib/render/space-icons';
import {
    HEX_COLOR,
    MAX_ASPECT,
    MAX_TEXT_LENGTH,
    MIN_ASPECT,
} from './edition-schema-limits';
import {
    LAYER_ALIGNS,
    LAYER_FONTS,
    type FreeLayer,
    type LayerAlign,
    type LayerFont,
    type PhotoPlacement,
    type SpaceIcon,
} from './edition-types';

export type Obj = Record<string, unknown>;

export const isObject = (value: unknown): value is Obj =>
    typeof value === 'object' && value !== null && !Array.isArray(value);
export const isFiniteNumber = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value);
export const isString = (value: unknown, max: number): value is string =>
    typeof value === 'string' && value.length <= max;

const isLayerFont = (value: unknown): value is LayerFont =>
    LAYER_FONTS.some((font) => font === value);
const isLayerAlign = (value: unknown): value is LayerAlign =>
    LAYER_ALIGNS.some((align) => align === value);

export const parsePhoto = (
    value: unknown,
    at: string,
    errors: string[],
): PhotoPlacement | undefined => {
    if (!isObject(value)) {
        errors.push(`${at}: photo must be an object`);
        return undefined;
    }
    const { photoId, cx, cy, scale, rotation, grayscale, fit } = value;
    const idOk = typeof photoId === 'string' && photoId !== '';
    const centreOk =
        isFiniteNumber(cx) &&
        cx >= 0 &&
        cx <= 1 &&
        isFiniteNumber(cy) &&
        cy >= 0 &&
        cy <= 1;
    const scaleOk = isFiniteNumber(scale) && scale > 0;
    const fitOk = fit === undefined || typeof fit === 'boolean';
    if (!idOk) {
        errors.push(`${at}: photoId must be a non-empty string`);
    }
    if (!centreOk) {
        errors.push(`${at}: cx and cy must be between 0 and 1`);
    }
    if (!scaleOk) {
        errors.push(`${at}: scale must be greater than 0`);
    }
    if (!isFiniteNumber(rotation)) {
        errors.push(`${at}: rotation must be a number`);
    }
    if (typeof grayscale !== 'boolean') {
        errors.push(`${at}: grayscale must be a boolean`);
    }
    if (!fitOk) {
        errors.push(`${at}: fit must be a boolean`);
    }
    if (
        !idOk ||
        !centreOk ||
        !scaleOk ||
        !fitOk ||
        !isFiniteNumber(rotation) ||
        typeof grayscale !== 'boolean'
    ) {
        return undefined;
    }

    return {
        photoId,
        cx,
        cy,
        scale,
        rotation,
        grayscale,
        ...(fit === true ? { fit: true } : {}),
    };
};

const parseTextStyle = (
    value: Obj,
): { color?: string; font?: LayerFont; align?: LayerAlign } | undefined => {
    const { color, font, align } = value;
    if (
        (color !== undefined &&
            (typeof color !== 'string' || !HEX_COLOR.test(color))) ||
        (font !== undefined && !isLayerFont(font)) ||
        (align !== undefined && !isLayerAlign(align))
    ) {
        return undefined;
    }

    return {
        ...(color === undefined ? {} : { color: color }),
        ...(font === undefined ? {} : { font }),
        ...(align === undefined ? {} : { align }),
    };
};

export const parseLayer = (
    value: unknown,
    at: string,
    errors: string[],
): FreeLayer | undefined => {
    if (!isObject(value)) {
        errors.push(`${at}: layer must be an object`);
        return undefined;
    }
    const { id, kind, x, y, w, h, rotation } = value;
    if (typeof id !== 'string' || id === '') {
        errors.push(`${at}: id must be a non-empty string`);
        return undefined;
    }
    if (
        !isFiniteNumber(x) ||
        !isFiniteNumber(y) ||
        !isFiniteNumber(w) ||
        !isFiniteNumber(h)
    ) {
        errors.push(`${at}: x, y, w and h must be numbers`);
        return undefined;
    }
    if (rotation !== undefined && !isFiniteNumber(rotation)) {
        errors.push(`${at}: rotation must be a number`);
        return undefined;
    }
    const box = {
        id,
        x,
        y,
        w,
        h,
        ...(rotation === undefined ? {} : { rotation }),
    };
    if (kind === 'text') {
        if (!isString(value.text, MAX_TEXT_LENGTH)) {
            errors.push(
                `${at}: text must be a string of at most ${MAX_TEXT_LENGTH} characters`,
            );
            return undefined;
        }
        const style = parseTextStyle(value);
        if (style === undefined) {
            errors.push(
                `${at}: color must be like #FFFDF7, font heading, body or mono, align left, center or right`,
            );
            return undefined;
        }

        return { ...box, kind: 'text', text: value.text, ...style };
    }
    if (kind === 'photo') {
        const photo = parsePhoto(value.photo, `${at}.photo`, errors);

        return photo === undefined
            ? undefined
            : { ...box, kind: 'photo', photo };
    }
    errors.push(`${at}: kind must be "text" or "photo"`);

    return undefined;
};

export const parseIcon = (
    value: unknown,
    at: string,
    errors: string[],
): SpaceIcon | undefined => {
    if (!isObject(value)) {
        errors.push(`${at}: must be an object`);
        return undefined;
    }
    if ('preset' in value) {
        if (Object.keys(value).length === 1 && isSpaceIconPreset(value.preset))
            return { preset: value.preset };
        errors.push(`${at}: preset must be one of the built-in icons`);
        return undefined;
    }
    const { aspect } = value;
    if (!isFiniteNumber(aspect) || aspect < MIN_ASPECT || aspect > MAX_ASPECT) {
        errors.push(
            `${at}: aspect must be a number between ${MIN_ASPECT} and ${MAX_ASPECT}`,
        );
        return undefined;
    }
    const photo = parsePhoto(value.photo, `${at}.photo`, errors);

    return photo === undefined ? undefined : { photo, aspect };
};
