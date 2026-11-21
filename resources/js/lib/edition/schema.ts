import { migrateHouseRules } from '@/data/templates';
import { standardEdition } from '@/lib/game/standard-edition';
import type { CurrencyId, Locale } from '@/lib/game/types';
import { validateProfile, type BoardProfile } from '@/lib/print/board';
import { isMoneyAmount } from '@/lib/print/money';
import { isPatternId } from '@/lib/render/patterns';
import { isSpaceIconPreset } from '@/lib/render/space-icons';
import {
    amountField,
    amountRange,
    isExtraCardAmountAllowed,
    MAX_EXTRA_CARD_AMOUNT,
    resolveCardAmount,
} from './amounts';
import {
    ALLOWED_FIELDS,
    BANK_KEY,
    LEGACY_KEYS,
    isExtraCardKey,
    parseKey,
    type ParsedKey,
} from './keys';
import {
    CENTER_MODES,
    EDITION_SCHEMA_VERSION,
    EXTRA_PART_IDS,
    PART_IDS,
    isTemplateId,
    isThemeId,
    type CenterMode,
    type Edition,
    type ElementOverride,
    type FreeLayer,
    type Parts,
    type PhotoPlacement,
    type PhotoStyle,
    type SpaceIcon,
} from './types';
import {
    CORNER_POSITIONS,
    MAX_CORNER_TEXT_LENGTH,
    MAX_SYMBOL_LENGTH,
    MAX_WORD_LENGTH,
} from './words';

export type ParseResult<T> =
    { ok: true; value: T } | { ok: false; errors: string[] };

export const MAX_NAME_LENGTH = 120;
export const MAX_TEXT_LENGTH = 2000;
export const MAX_LAYERS = 24;
/** Longest purpose on a card ("your language course"). */
export const MAX_PURPOSE_LENGTH = 60;
/** Width divided by height of a centre photo or logo; the same limits as the server. */
export const MIN_ASPECT = 0.05;
export const MAX_ASPECT = 20;
export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

type Obj = Record<string, unknown>;

const isPhotoStyle = (value: unknown): value is PhotoStyle =>
    value === 'framed' || value === 'full';

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

/** The standard card behind a key like `card.chance.07`. */
function standardCardOf(key: string) {
    const [, deck, index] = key.split('.');
    if (deck !== 'chance' && deck !== 'chest') {
        return undefined;
    }

    return standardEdition.decks[deck][Number(index) - 1];
}

/** The amounts of a space (B132): known ids, whole numbers, within 20% of the standard amount. */
function parseAmounts(
    key: string,
    value: unknown,
    at: string,
    errors: string[],
): Record<string, number> | undefined {
    if (!isObject(value)) {
        errors.push(`${at}: must be an object`);
        return undefined;
    }
    const space = standardEdition.spaces[Number(key.split('.')[1])];
    const before = errors.length;
    const out: Record<string, number> = {};

    for (const [id, amount] of Object.entries(value)) {
        const field = space === undefined ? undefined : amountField(space, id);
        if (field === undefined) {
            errors.push(`${at}.${id}: not an amount of this space`);
        } else if (!isFiniteNumber(amount) || !Number.isInteger(amount)) {
            errors.push(`${at}.${id}: must be a whole number`);
        } else {
            const { min, max } = amountRange(field.standard);
            if (amount < min || amount > max) {
                errors.push(
                    `${at}.${id}: must be between ${String(min)} and ${String(max)}`,
                );
            } else {
                out[id] = amount;
            }
        }
    }

    return errors.length === before ? out : undefined;
}

/** Positions of the special spaces that can get an icon (B136): everything but the streets. */
export function holdsIcon(position: number): boolean {
    const space = standardEdition.spaces[position];

    return space !== undefined && space.type !== 'street';
}

function parseIcon(
    value: unknown,
    at: string,
    errors: string[],
): SpaceIcon | undefined {
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
}

/** The longest `name` and `text` a field of this element may have. */
function limits(
    key: string,
    parsed: ParsedKey,
): { name: number; text: number } {
    if (parsed.kind === 'words') {
        return {
            // The bank name was its own element with the length of a name; it keeps that room (B148).
            name: key === BANK_KEY ? MAX_NAME_LENGTH : MAX_WORD_LENGTH,
            text:
                key === 'words.currency' ? MAX_SYMBOL_LENGTH : MAX_WORD_LENGTH,
        };
    }
    if (parsed.kind === 'space') {
        return { name: MAX_NAME_LENGTH, text: MAX_CORNER_TEXT_LENGTH };
    }

    return { name: MAX_NAME_LENGTH, text: MAX_TEXT_LENGTH };
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
    const max = limits(key, parsed);
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
                if (isString(fieldValue, max.name)) out.name = fieldValue;
                else
                    errors.push(
                        `${at}: must be a string of at most ${max.name} characters`,
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
                // Only the corners of the board have a short text.
                if (
                    parsed.kind === 'space' &&
                    !Object.values(CORNER_POSITIONS).includes(
                        Number(key.split('.')[1]),
                    )
                )
                    errors.push(`${at}: only a corner has a text`);
                else if (isString(fieldValue, max.text)) out.text = fieldValue;
                else
                    errors.push(
                        `${at}: must be a string of at most ${max.text} characters`,
                    );
                break;
            case 'amount': {
                const card = standardCardOf(key);
                if (!isFiniteNumber(fieldValue)) {
                    errors.push(`${at}: must be a number`);
                } else if (isExtraCardKey(key)) {
                    // An extra card has no standard amount: a free amount up to 500, paid or received (B135).
                    if (isExtraCardAmountAllowed(fieldValue))
                        out.amount = fieldValue;
                    else
                        errors.push(
                            `${at}: must be a whole amount from -${MAX_EXTRA_CARD_AMOUNT} to ${MAX_EXTRA_CARD_AMOUNT}, not 0`,
                        );
                } else if (card?.amount !== undefined && card.amount !== 0) {
                    // Editions from before B132 may hold another amount: it is pulled into the range, and an
                    // amount on a card without money is dropped, instead of making the whole edition
                    // unreadable. The server rejects new ones.
                    out.amount = resolveCardAmount(card, fieldValue);
                }
                break;
            }
            case 'purpose':
                if (isString(fieldValue, MAX_PURPOSE_LENGTH))
                    out.purpose = fieldValue;
                else
                    errors.push(
                        `${at}: must be a string of at most ${MAX_PURPOSE_LENGTH} characters`,
                    );
                break;
            case 'amounts': {
                const amounts = parseAmounts(key, fieldValue, at, errors);
                if (amounts !== undefined) out.amounts = amounts;
                break;
            }
            case 'color':
                if (
                    typeof fieldValue === 'string' &&
                    HEX_COLOR.test(fieldValue)
                )
                    out.color = fieldValue;
                else errors.push(`${at}: must be a colour like #FFFDF7`);
                break;
            case 'pattern':
                if (isPatternId(fieldValue)) out.pattern = fieldValue;
                else errors.push(`${at}: must be one of the built-in patterns`);
                break;
            case 'hidden':
                if (typeof fieldValue === 'boolean') out.hidden = fieldValue;
                else errors.push(`${at}: must be a boolean`);
                break;
            case 'added':
                if (!isExtraCardKey(key))
                    errors.push(`${at}: only an extra card is added`);
                else if (fieldValue === true) out.added = true;
                else errors.push(`${at}: must be true`);
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
            case 'icon': {
                if (!holdsIcon(Number(key.split('.')[1]))) {
                    errors.push(`${at}: only a special space has an icon`);
                    break;
                }
                const icon = parseIcon(fieldValue, at, errors);
                if (icon !== undefined) out.icon = icon;
                break;
            }
            case 'photoStyle':
                if (isPhotoStyle(fieldValue)) out.photoStyle = fieldValue;
                else errors.push(`${at}: must be "framed" or "full"`);
                break;
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
    if (isExtraCardKey(key) && out.added !== true && errors.length === before) {
        errors.push(`${key}: an extra card needs "added": true`);
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
        const flag =
            value[id] ?? (EXTRA_PART_IDS.includes(id) ? false : undefined);
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

/**
 * Moves what older editions stored under a key that has since moved (`bank` became `words.bank`, B148). The
 * moved key wins over the old one when an edition has both. Anything that is not an object is left for the
 * parser to reject.
 */
export function migrateElements(value: unknown): unknown {
    if (!isObject(value)) {
        return value;
    }
    const legacy = Object.keys(LEGACY_KEYS).filter((key) => key in value);
    if (legacy.length === 0) {
        return value;
    }
    const elements: Record<string, unknown> = { ...value };
    for (const key of legacy) {
        const moved = LEGACY_KEYS[key] as string;
        if (!(moved in elements)) {
            elements[moved] = elements[key];
        }
        delete elements[key];
    }

    return elements;
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
    const elements = parseElements(migrateElements(input.elements), errors);

    // The template an edition started from (B152); one this version does not know is dropped, not rejected.
    const template = input.template;
    // How much play money to print (B156); an unknown value is dropped, like the template.
    const moneyAmount = input.moneyAmount;

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
            elements: migrateHouseRules(elements),
            ...(isTemplateId(template) ? { template } : {}),
            ...(isMoneyAmount(moneyAmount) ? { moneyAmount } : {}),
            revision: revision as number,
            createdAt: createdAt as number,
            updatedAt: updatedAt as number,
        },
    };
}
