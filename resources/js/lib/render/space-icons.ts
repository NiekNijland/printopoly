import type { IconName } from '@/components/render/icons';
import type { CornerKind, Locale, Space } from '@/lib/game/types';

/**
 * The special spaces that can get an image of their own (B136): the four corners, utilities, stations, tax,
 * Chance and Community Chest. Streets keep their colour bar and photo.
 */
export type IconKind =
    | 'start'
    | 'jail'
    | 'parking'
    | 'gotojail'
    | 'utility'
    | 'station'
    | 'tax'
    | 'chance'
    | 'chest';

/** Our own icon set (B87, B136): every id is a drawing in `icons.tsx`. Mirrors `SPACE_ICON_PRESETS` in PHP. */
export const SPACE_ICON_PRESETS = [
    'arrow-left',
    'pointer',
    'bars',
    'car',
    'train',
    'bulb',
    'tap',
    'dice',
    'chest',
    'hand-key',
    'window-bars',
    'siren',
    'handcuffs',
    'whistle',
    'arrow-bars',
    'key',
    'padlock',
    'bench',
    'coffee',
    'p-sign',
    'flag',
    'sun',
    'rocket',
    'star',
    'flame',
    'wind-turbine',
    'wifi',
    'solar-panel',
    'tram',
    'bus',
    'bike',
    'ferry',
    'coins',
    'piggy-bank',
    'receipt',
    'scales',
    'money-bag',
    'question',
    'question-round',
    'clover',
    'envelope',
    'gift',
    'heart',
] as const satisfies readonly IconName[];

export type SpaceIconPreset = (typeof SPACE_ICON_PRESETS)[number];

export function isSpaceIconPreset(value: unknown): value is SpaceIconPreset {
    return (
        typeof value === 'string' &&
        (SPACE_ICON_PRESETS as readonly string[]).includes(value)
    );
}

/** The icons offered per kind of space, the standard one first. Any preset is valid on any special space. */
export const ICONS_BY_KIND: Readonly<
    Record<IconKind, readonly SpaceIconPreset[]>
> = {
    start: ['arrow-left', 'flag', 'sun', 'rocket', 'star', 'coins'],
    jail: ['bars', 'window-bars', 'key', 'padlock', 'handcuffs', 'hand-key'],
    parking: ['car', 'p-sign', 'bench', 'coffee', 'bike', 'sun'],
    gotojail: [
        'pointer',
        'hand-key',
        'window-bars',
        'siren',
        'handcuffs',
        'whistle',
        'arrow-bars',
    ],
    utility: ['bulb', 'tap', 'flame', 'wind-turbine', 'wifi', 'solar-panel'],
    station: ['train', 'tram', 'bus', 'bike', 'ferry', 'rocket'],
    tax: ['coins', 'piggy-bank', 'receipt', 'scales', 'money-bag', 'envelope'],
    chance: ['dice', 'question', 'question-round', 'clover', 'star', 'gift'],
    chest: ['chest', 'envelope', 'gift', 'heart', 'coins', 'piggy-bank'],
};

const CORNER_KINDS: Record<CornerKind, IconKind> = {
    start: 'start',
    jail: 'jail',
    parking: 'parking',
    gotojail: 'gotojail',
};

/** The kind of icon a space takes, or `null` for a street, which has none. */
export function iconKindOf(space: Space): IconKind | null {
    switch (space.type) {
        case 'corner':
            return CORNER_KINDS[space.corner];
        case 'street':
            return null;
        default:
            return space.type;
    }
}

/** The icon a space has without a choice; tax spaces have none. */
export function defaultSpaceIcon(space: Space): SpaceIconPreset | null {
    switch (space.type) {
        case 'corner':
            return ICONS_BY_KIND[CORNER_KINDS[space.corner]][0] ?? null;
        case 'utility':
            return space.position === 12 ? 'bulb' : 'tap';
        case 'station':
            return 'train';
        case 'chance':
            return 'dice';
        case 'chest':
            return 'chest';
        default:
            return null;
    }
}

export const SPACE_ICON_NAMES: Readonly<
    Record<SpaceIconPreset, Record<Locale, string>>
> = {
    'arrow-left': { nl: 'Pijl', en: 'Arrow' },
    pointer: { nl: 'Pijl vooruit', en: 'Arrow ahead' },
    bars: { nl: 'Tralies', en: 'Bars' },
    car: { nl: 'Auto', en: 'Car' },
    train: { nl: 'Trein', en: 'Train' },
    bulb: { nl: 'Lamp', en: 'Light bulb' },
    tap: { nl: 'Kraan', en: 'Tap' },
    dice: { nl: 'Dobbelsteen', en: 'Die' },
    chest: { nl: 'Schatkist', en: 'Chest' },
    'hand-key': { nl: 'Hand met sleutel', en: 'Hand with key' },
    'window-bars': { nl: 'Raam met tralies', en: 'Barred window' },
    siren: { nl: 'Zwaailicht', en: 'Siren' },
    handcuffs: { nl: 'Handboeien', en: 'Handcuffs' },
    whistle: { nl: 'Fluitje', en: 'Whistle' },
    'arrow-bars': { nl: 'Pijl naar de tralies', en: 'Arrow to the bars' },
    key: { nl: 'Sleutel', en: 'Key' },
    padlock: { nl: 'Hangslot', en: 'Padlock' },
    bench: { nl: 'Bankje', en: 'Bench' },
    coffee: { nl: 'Kop koffie', en: 'Cup of coffee' },
    'p-sign': { nl: 'P-bord', en: 'Parking sign' },
    flag: { nl: 'Vlag', en: 'Flag' },
    sun: { nl: 'Zon', en: 'Sun' },
    rocket: { nl: 'Raket', en: 'Rocket' },
    star: { nl: 'Ster', en: 'Star' },
    flame: { nl: 'Vlam', en: 'Flame' },
    'wind-turbine': { nl: 'Windmolen', en: 'Wind turbine' },
    wifi: { nl: 'Wifi', en: 'Wi-Fi' },
    'solar-panel': { nl: 'Zonnepaneel', en: 'Solar panel' },
    tram: { nl: 'Tram', en: 'Tram' },
    bus: { nl: 'Bus', en: 'Bus' },
    bike: { nl: 'Fiets', en: 'Bike' },
    ferry: { nl: 'Veerboot', en: 'Ferry' },
    coins: { nl: 'Munten', en: 'Coins' },
    'piggy-bank': { nl: 'Spaarvarken', en: 'Piggy bank' },
    receipt: { nl: 'Bonnetje', en: 'Receipt' },
    scales: { nl: 'Weegschaal', en: 'Scales' },
    'money-bag': { nl: 'Geldzak', en: 'Money bag' },
    question: { nl: 'Vraagteken', en: 'Question mark' },
    'question-round': {
        nl: 'Vraagteken in een rondje',
        en: 'Question mark in a circle',
    },
    clover: { nl: 'Klavertje', en: 'Clover' },
    envelope: { nl: 'Envelop', en: 'Envelope' },
    gift: { nl: 'Cadeau', en: 'Gift' },
    heart: { nl: 'Hart', en: 'Heart' },
};
