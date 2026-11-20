import { standardEdition } from '@/lib/game/standard-edition';
import type { CurrencyId, Locale } from '@/lib/game/types';
import { validateProfile, type BoardProfile } from '@/lib/print/board';
import { ALLOWED_FIELDS, parseKey } from './keys';
import {
    CENTER_MODES,
    EDITION_SCHEMA_VERSION,
    PART_IDS,
    isThemeId,
    type CenterMode,
    type Edition,
    type ElementOverride,
    type FreeLayer,
    type Parts,
    type PhotoPlacement,
} from './types';

export type ParseResult<T> =
    { ok: true; value: T } | { ok: false; errors: string[] };

export const MAX_NAME_LENGTH = 120;
export const MAX_TEXT_LENGTH = 2000;
export const MAX_LAYERS = 24;
/** Width divided by height of a centre photo or logo; the same limits as the server. */
export const MIN_ASPECT = 0.05;
export const MAX_ASPECT = 20;
export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

type Obj = Record<string, unknown>;

const isObject = (value: unknown): value is Obj =>
    typeof value === 'object' && value !== null && !Array.isArray(value);
const isFiniteNumber = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value);
const isString = (value: unknown, max: number): value is string =>
    typeof value === 'string' && value.length <= max;

function isLocale(value: unknown): value is Locale {
    return value === 'nl' || value === 'en';
}

function isCurrency(value: unknown): value is CurrencyId {
    return standardEdition.currencies.some((currency) => currency.id === value);
}

function parsePhoto(
    value: unknown,
    at: string,
    errors: string[],
): PhotoPlacement | undefined {
    if (!isObject(value)) {
        errors.push(`${at}: photo must be an object`);
        return undefined;
    }
    const { photoId, cx, cy, scale, rotation, grayscale } = value;
    let ok = true;
    if (typeof photoId !== 'string' || photoId === '') {
        errors.push(`${at}: photoId must be a non-empty string`);
        ok = false;
    }
    if (
        !isFiniteNumber(cx) ||
        cx < 0 ||
        cx > 1 ||
        !isFiniteNumber(cy) ||
        cy < 0 ||
        cy > 1
    ) {
        errors.push(`${at}: cx and cy must be between 0 and 1`);
        ok = false;
    }
    if (!isFiniteNumber(scale) || scale <= 0) {
        errors.push(`${at}: scale must be greater than 0`);
        ok = false;
    }
    if (!isFiniteNumber(rotation)) {
        errors.push(`${at}: rotation must be a number`);
        ok = false;
    }
    if (typeof grayscale !== 'boolean') {
        errors.push(`${at}: grayscale must be a boolean`);
        ok = false;
    }
    if (!ok) {
        return undefined;
    }

    return {
        photoId: photoId as string,
        cx: cx as number,
        cy: cy as number,
        scale: scale as number,
        rotation: rotation as number,
        grayscale: grayscale as boolean,
    };
}

function parseLayer(
    value: unknown,
    at: string,
    errors: string[],
): FreeLayer | undefined {
    if (!isObject(value)) {
        errors.push(`${at}: layer must be an object`);
        return undefined;
    }
    const { id, kind, x, y, w, h } = value;
    if (typeof id !== 'string' || id === '') {
        errors.push(`${at}: id must be a non-empty string`);
        return undefined;
    }
    if (![x, y, w, h].every(isFiniteNumber)) {
        errors.push(`${at}: x, y, w and h must be numbers`);
        return undefined;
    }
    const rotation = value.rotation;
    if (rotation !== undefined && !isFiniteNumber(rotation)) {
        errors.push(`${at}: rotation must be a number`);
        return undefined;
    }
    const box = {
        id,
        x: x as number,
        y: y as number,
        w: w as number,
        h: h as number,
        ...(rotation === undefined ? {} : { rotation }),
    };
    if (kind === 'text') {
        if (!isString(value.text, MAX_TEXT_LENGTH)) {
            errors.push(
                `${at}: text must be a string of at most ${MAX_TEXT_LENGTH} characters`,
            );
            return undefined;
        }

        return { ...box, kind: 'text', text: value.text };
    }
    if (kind === 'photo') {
        const photo = parsePhoto(value.photo, `${at}.photo`, errors);

        return photo === undefined
            ? undefined
            : { ...box, kind: 'photo', photo };
    }
    errors.push(`${at}: kind must be "text" or "photo"`);

    return undefined;
}

/** Validates one element override against the rules of its key. */
export function parseOverride(
    key: string,
    value: unknown,
    errors: string[],
): ElementOverride | undefined {
    const parsed = parseKey(key);
    if (parsed === null) {
        errors.push(`${key}: unknown element key`);
        return undefined;
    }
    if (!isObject(value)) {
        errors.push(`${key}: override must be an object`);
        return undefined;
    }
    const allowed = ALLOWED_FIELDS[parsed.kind];
    const out: ElementOverride = {};
    const before = errors.length;

    for (const [field, fieldValue] of Object.entries(value)) {
        if (fieldValue === undefined) {
            continue;
        }
        // Older editions still carry a layout; it is ignored (B122).
        if (field === 'layout') {
            continue;
        }
        if (!(allowed as readonly string[]).includes(field)) {
            errors.push(`${key}: field "${field}" is not allowed here`);
            continue;
        }
        const at = `${key}.${field}`;
        switch (field) {
            case 'name':
                if (isString(fieldValue, MAX_NAME_LENGTH))
                    out.name = fieldValue;
                else
                    errors.push(
                        `${at}: must be a string of at most ${MAX_NAME_LENGTH} characters`,
                    );
                break;
            case 'town':
                if (isString(fieldValue, MAX_NAME_LENGTH))
                    out.town = fieldValue;
                else
                    errors.push(
                        `${at}: must be a string of at most ${MAX_NAME_LENGTH} characters`,
                    );
                break;
            case 'text':
                if (isString(fieldValue, MAX_TEXT_LENGTH))
                    out.text = fieldValue;
                else
                    errors.push(
                        `${at}: must be a string of at most ${MAX_TEXT_LENGTH} characters`,
                    );
                break;
            case 'amount':
                if (isFiniteNumber(fieldValue)) out.amount = fieldValue;
                else errors.push(`${at}: must be a number`);
                break;
            case 'color':
                if (
                    typeof fieldValue === 'string' &&
                    HEX_COLOR.test(fieldValue)
                )
                    out.color = fieldValue;
                else errors.push(`${at}: must be a colour like #FFFDF7`);
                break;
            case 'hidden':
                if (typeof fieldValue === 'boolean') out.hidden = fieldValue;
                else errors.push(`${at}: must be a boolean`);
                break;
            case 'centerMode':
                if (
                    typeof fieldValue === 'string' &&
                    (CENTER_MODES as readonly string[]).includes(fieldValue)
                )
                    out.centerMode = fieldValue as CenterMode;
                else errors.push(`${at}: must be "name", "photo" or "logo"`);
                break;
            case 'subtitle':
                if (isString(fieldValue, MAX_NAME_LENGTH))
                    out.subtitle = fieldValue;
                else
                    errors.push(
                        `${at}: must be a string of at most ${MAX_NAME_LENGTH} characters`,
                    );
                break;
            case 'photoAspect':
                if (
                    isFiniteNumber(fieldValue) &&
                    fieldValue >= MIN_ASPECT &&
                    fieldValue <= MAX_ASPECT
                )
                    out.photoAspect = fieldValue;
                else
                    errors.push(
                        `${at}: must be a number between ${MIN_ASPECT} and ${MAX_ASPECT}`,
                    );
                break;
            case 'photoFrame':
                if (typeof fieldValue === 'boolean')
                    out.photoFrame = fieldValue;
                else errors.push(`${at}: must be a boolean`);
                break;
            case 'photo': {
                const photo = parsePhoto(fieldValue, at, errors);
                if (photo !== undefined) out.photo = photo;
                break;
            }
            case 'background': {
                const photo = parsePhoto(fieldValue, at, errors);
                if (photo !== undefined) out.background = photo;
                break;
            }
            case 'layers': {
                if (
                    !Array.isArray(fieldValue) ||
                    fieldValue.length > MAX_LAYERS
                ) {
                    errors.push(
                        `${at}: must be a list of at most ${MAX_LAYERS} layers`,
                    );
                    break;
                }
                const layers: FreeLayer[] = [];
                fieldValue.forEach((item: unknown, index) => {
                    const layer = parseLayer(item, `${at}[${index}]`, errors);
                    if (layer !== undefined) layers.push(layer);
                });
                out.layers = layers;
                break;
            }
            default:
                errors.push(`${key}: field "${field}" is not allowed here`);
        }
    }

    return errors.length === before ? out : undefined;
}

function parseParts(value: unknown, errors: string[]): Parts | undefined {
    if (!isObject(value)) {
        errors.push('parts: must be an object');
        return undefined;
    }
    const parts = {} as Parts;
    for (const id of PART_IDS) {
        const flag = value[id];
        if (typeof flag !== 'boolean') {
            errors.push(`parts.${id}: must be a boolean`);
            continue;
        }
        parts[id] = flag;
    }
    if (parts.board === false) {
        errors.push('parts.board: the board is always on');
    }

    return errors.length === 0 ? parts : undefined;
}

/** Validates a board profile; `validateProfile` words its problems in Dutch unless told otherwise. */
export function parseBoardProfile(
    value: unknown,
    errors: string[],
): BoardProfile | undefined {
    if (!isObject(value)) {
        errors.push('boardProfile: must be an object');
        return undefined;
    }
    const { id, name, outer, corner, border, panels, boxLid, provisional } =
        value;
    if (
        typeof id !== 'string' ||
        id === '' ||
        !isString(name, MAX_NAME_LENGTH)
    ) {
        errors.push('boardProfile: id and name must be strings');
        return undefined;
    }
    if (
        !isObject(boxLid) ||
        !isFiniteNumber(boxLid.w) ||
        !isFiniteNumber(boxLid.h)
    ) {
        errors.push('boardProfile.boxLid: w and h must be numbers');
        return undefined;
    }
    if (
        !isFiniteNumber(outer) ||
        !isFiniteNumber(corner) ||
        !isFiniteNumber(border) ||
        (panels !== 2 && panels !== 4)
    ) {
        errors.push(
            'boardProfile: outer, corner, border and panels (2 or 4) are required numbers',
        );
        return undefined;
    }
    const profile: BoardProfile = {
        id,
        name,
        outer,
        corner,
        border,
        panels,
        boxLid: { w: boxLid.w, h: boxLid.h },
    };
    if (provisional === true) {
        profile.provisional = true;
    }
    const problems = validateProfile(profile);
    if (problems.length > 0) {
        errors.push(...problems.map((problem) => `boardProfile: ${problem}`));
        return undefined;
    }

    return profile;
}

export function parseElements(
    value: unknown,
    errors: string[],
): Record<string, ElementOverride> | undefined {
    if (!isObject(value)) {
        errors.push('elements: must be an object');
        return undefined;
    }
    const before = errors.length;
    const elements: Record<string, ElementOverride> = {};
    for (const [key, override] of Object.entries(value)) {
        const parsed = parseOverride(key, override, errors);
        if (parsed !== undefined) {
            elements[key] = parsed;
        }
    }

    return errors.length === before ? elements : undefined;
}

/** Small hand-written guard for an edition read from storage or a server. */
export function parseEdition(input: unknown): ParseResult<Edition> {
    const errors: string[] = [];
    if (!isObject(input)) {
        return { ok: false, errors: ['edition: must be an object'] };
    }
    const {
        schemaVersion,
        id,
        name,
        language,
        currency,
        theme,
        revision,
        createdAt,
        updatedAt,
    } = input;

    if (schemaVersion !== EDITION_SCHEMA_VERSION) {
        errors.push(`schemaVersion: expected ${EDITION_SCHEMA_VERSION}`);
    }
    if (typeof id !== 'string' || id === '')
        errors.push('id: must be a non-empty string');
    if (!isString(name, MAX_NAME_LENGTH))
        errors.push(
            `name: must be a string of at most ${MAX_NAME_LENGTH} characters`,
        );
    if (!isLocale(language)) errors.push('language: must be "nl" or "en"');
    if (!isCurrency(currency)) errors.push('currency: unknown currency');
    if (!isThemeId(theme)) errors.push('theme: unknown theme');
    if (!Number.isInteger(revision) || (revision as number) < 0)
        errors.push('revision: must be a non-negative integer');
    if (!isFiniteNumber(createdAt)) errors.push('createdAt: must be a number');
    if (!isFiniteNumber(updatedAt)) errors.push('updatedAt: must be a number');

    const boardProfile = parseBoardProfile(input.boardProfile, errors);
    const parts = parseParts(input.parts, errors);
    const elements = parseElements(input.elements, errors);

    if (
        errors.length > 0 ||
        boardProfile === undefined ||
        parts === undefined ||
        elements === undefined
    ) {
        return { ok: false, errors };
    }

    return {
        ok: true,
        value: {
            schemaVersion: EDITION_SCHEMA_VERSION,
            id: id as string,
            name: name as string,
            language: language as Locale,
            currency: currency as CurrencyId,
            theme: theme as Edition['theme'],
            boardProfile,
            parts,
            elements,
            revision: revision as number,
            createdAt: createdAt as number,
            updatedAt: updatedAt as number,
        },
    };
}
