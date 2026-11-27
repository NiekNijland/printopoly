import { isPatternId } from '@/lib/render/patterns';
import { standardEdition } from '@/lib/render/standard-edition';
import {
    amountField,
    amountRange,
    isExtraCardAmountAllowed,
    MAX_EXTRA_CARD_AMOUNT,
    resolveCardAmount,
} from './edition-amounts';
import { BANK_KEY, isExtraCardKey, type ParsedKey } from './edition-keys';
import {
    isPartStyle,
    partOfStyleKey,
    partStyleIds,
} from './edition-part-styles';
import {
    HEX_COLOR,
    MAX_ASPECT,
    MAX_LAYERS,
    MAX_NAME_LENGTH,
    MAX_PURPOSE_LENGTH,
    MAX_STORY_LENGTH,
    MAX_TEXT_LENGTH,
    MIN_ASPECT,
    MIN_TITLE_SCALE,
} from './edition-schema-limits';
import {
    isFiniteNumber,
    isObject,
    isString,
    parseIcon,
    parseLayer,
    parsePhoto,
} from './edition-schema-values';
import {
    CENTER_MODES,
    TITLE_STYLES,
    type CenterMode,
    type ElementField,
    type ElementOverride,
    type FreeLayer,
    type PhotoPlacement,
    type PhotoStyle,
    type TitleStyle,
} from './edition-types';
import {
    CORNER_POSITIONS,
    MAX_CORNER_TEXT_LENGTH,
    MAX_SYMBOL_LENGTH,
    MAX_WORD_LENGTH,
} from './edition-words';

export type FieldContext = {
    key: string;
    parsed: ParsedKey;
    at: string;
    errors: string[];
};

export type FieldValues = {
    [F in ElementField]-?: NonNullable<ElementOverride[F]>;
};

type Parser<V> = (value: unknown, context: FieldContext) => V | undefined;

type FieldParser<F extends ElementField> = Parser<FieldValues[F]>;

const isPhotoStyle = (value: unknown): value is PhotoStyle =>
    value === 'framed' || value === 'full';

const isCenterMode = (value: unknown): value is CenterMode =>
    CENTER_MODES.some((mode) => mode === value);

const isTitleStyle = (value: unknown): value is TitleStyle =>
    TITLE_STYLES.some((style) => style === value);

/** The standard card behind a key like `card.chance.07`. */
const standardCardOf = (key: string) => {
    const [, deck, index] = key.split('.');
    if (deck !== 'chance' && deck !== 'chest') {
        return undefined;
    }

    return standardEdition.decks[deck][Number(index) - 1];
};

/** The amounts of a space (B132): known ids, whole numbers, within 20% of the standard amount. */
const parseAmounts = (
    key: string,
    value: unknown,
    at: string,
    errors: string[],
): Record<string, number> | undefined => {
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
};

/** Positions of the spaces that have a title deed: streets, stations and utilities (B157). */
const isOwnablePosition = (position: number): boolean => {
    const type = standardEdition.spaces[position]?.type;

    return type === 'street' || type === 'station' || type === 'utility';
};

/** Positions of the special spaces that can get an icon (B136): everything but the streets. */
const holdsIcon = (position: number): boolean => {
    const space = standardEdition.spaces[position];

    return space !== undefined && space.type !== 'street';
};

/** The longest `name` and `text` a field of this element may have. */
const limits = (
    key: string,
    parsed: ParsedKey,
): { name: number; text: number } => {
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
    if (parsed.kind === 'deed') {
        return { name: MAX_NAME_LENGTH, text: MAX_STORY_LENGTH };
    }

    return { name: MAX_NAME_LENGTH, text: MAX_TEXT_LENGTH };
};

const fail = (context: FieldContext, message: string): undefined => {
    context.errors.push(`${context.at}: ${message}`);

    return undefined;
};

const text =
    (max: (context: FieldContext) => number): Parser<string> =>
    (value, context) =>
        isString(value, max(context))
            ? value
            : fail(
                  context,
                  `must be a string of at most ${max(context)} characters`,
              );

const flag: Parser<boolean> = (value, context) =>
    typeof value === 'boolean' ? value : fail(context, 'must be a boolean');

const photo: Parser<PhotoPlacement> = (value, { at, errors }) =>
    parsePhoto(value, at, errors);

const numberIn =
    (min: number, max: number, message: string): Parser<number> =>
    (value, context) =>
        isFiniteNumber(value) && value >= min && value <= max
            ? value
            : fail(context, message);

const parseCornerText: FieldParser<'text'> = (value, context) => {
    const { key, parsed } = context;
    const max = limits(key, parsed).text;
    // Only the corners of the board have a short text.
    if (
        parsed.kind === 'space' &&
        !Object.values(CORNER_POSITIONS).includes(Number(key.split('.')[1]))
    )
        return fail(context, 'only a corner has a text');

    return isString(value, max)
        ? value
        : fail(context, `must be a string of at most ${max} characters`);
};

const parseCardAmount: FieldParser<'amount'> = (value, context) => {
    const { key } = context;
    const card = standardCardOf(key);
    if (!isFiniteNumber(value)) {
        return fail(context, 'must be a number');
    }
    if (isExtraCardKey(key)) {
        // An extra card has no standard amount: a free amount up to 500, paid or received (B135).
        return isExtraCardAmountAllowed(value)
            ? value
            : fail(
                  context,
                  `must be a whole amount from -${MAX_EXTRA_CARD_AMOUNT} to ${MAX_EXTRA_CARD_AMOUNT}, not 0`,
              );
    }
    if (card?.amount !== undefined && card.amount !== 0) {
        // Editions from before B132 may hold another amount: it is pulled into the range, and an
        // amount on a card without money is dropped, instead of making the whole edition
        // unreadable. The server rejects new ones.
        return resolveCardAmount(card, value);
    }

    return undefined;
};

const parseLayers: FieldParser<'layers'> = (value, context) => {
    if (!Array.isArray(value) || value.length > MAX_LAYERS) {
        return fail(context, `must be a list of at most ${MAX_LAYERS} layers`);
    }
    const layers: FreeLayer[] = [];
    value.forEach((item: unknown, index) => {
        const layer = parseLayer(
            item,
            `${context.at}[${index}]`,
            context.errors,
        );
        if (layer !== undefined) layers.push(layer);
    });

    return layers;
};

const FIELD_PARSERS: { readonly [F in ElementField]: FieldParser<F> } = {
    name: text(({ key, parsed }) => limits(key, parsed).name),
    town: text(() => MAX_NAME_LENGTH),
    text: parseCornerText,
    amount: parseCardAmount,
    purpose: text(() => MAX_PURPOSE_LENGTH),
    amounts: (value, { key, at, errors }) =>
        parseAmounts(key, value, at, errors),
    color: (value, context) =>
        typeof value === 'string' && HEX_COLOR.test(value)
            ? value
            : fail(context, 'must be a colour like #FFFDF7'),
    pattern: (value, context) =>
        isPatternId(value)
            ? value
            : fail(context, 'must be one of the built-in patterns'),
    hidden: flag,
    added: (value, context) => {
        if (!isExtraCardKey(context.key))
            return fail(context, 'only an extra card is added');

        return value === true ? true : fail(context, 'must be true');
    },
    centerMode: (value, context) =>
        isCenterMode(value)
            ? value
            : fail(context, 'must be "name", "photo" or "logo"'),
    subtitle: text(() => MAX_NAME_LENGTH),
    photoAspect: numberIn(
        MIN_ASPECT,
        MAX_ASPECT,
        `must be a number between ${MIN_ASPECT} and ${MAX_ASPECT}`,
    ),
    photoFrame: flag,
    deedPhoto: (value, context) => {
        if (!isOwnablePosition(Number(context.key.split('.')[1])))
            return fail(
                context,
                'only a street, station or utility has a deed',
            );

        return flag(value, context);
    },
    titleHidden: flag,
    titleBand: flag,
    logoTilt: flag,
    titleStyle: (value, context) =>
        isTitleStyle(value)
            ? value
            : fail(context, `must be one of ${TITLE_STYLES.join(', ')}`),
    style: (value, context) => {
        // The style of a part (B268): one of the ids of that part in part-styles.json.
        const part = partOfStyleKey(context.key);
        if (part !== null && isPartStyle(part, value)) return value;

        return fail(
            context,
            `must be one of ${part === null ? '' : partStyleIds(part).join(', ')}`,
        );
    },
    centerPlace: (value, context) =>
        value === 'bottomLeft' || value === 'middle'
            ? value
            : fail(context, 'must be "bottomLeft" or "middle"'),
    titleOffset: numberIn(-1, 1, 'must be a number from -1 to 1'),
    titleScale: numberIn(
        MIN_TITLE_SCALE,
        1,
        `must be a number from ${MIN_TITLE_SCALE} to 1`,
    ),
    photo,
    icon: (value, context) => {
        if (!holdsIcon(Number(context.key.split('.')[1])))
            return fail(context, 'only a special space has an icon');

        return parseIcon(value, context.at, context.errors);
    },
    photoStyle: (value, context) =>
        isPhotoStyle(value)
            ? value
            : fail(context, 'must be "framed" or "full"'),
    background: photo,
    layers: parseLayers,
};

export const parseField = <F extends ElementField>(
    field: F,
    value: unknown,
    context: FieldContext,
): FieldValues[F] | undefined => {
    const parser: FieldParser<F> = FIELD_PARSERS[field];

    return parser(value, context);
};
