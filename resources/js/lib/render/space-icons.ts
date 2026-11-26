import type { IconName } from '@/components/render/icons';
import type { CornerKind, Locale, Space } from '@/types/game';

import lucideCatalogue from './lucide-space-icons.json';

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

/** One of our own drawings in `icons.tsx`. */
export type OwnSpaceIcon = (typeof SPACE_ICON_PRESETS)[number];

/** A drawing from lucide (B196), stored as `lucide:<name>`. */
export type LucideSpaceIcon = `lucide:${string}`;

/** Every icon a special space can show: our own drawings and the curated lucide set (B136, B196). */
export type SpaceIconPreset = OwnSpaceIcon | LucideSpaceIcon;

/** The categories of the icon picker (B196), in the order it shows them. */
export const ICON_CATEGORIES = [
    'money',
    'post',
    'transport',
    'energy',
    'home',
    'school',
    'sport',
    'food',
    'music',
    'nature',
    'signs',
] as const;

type IconCategory = (typeof ICON_CATEGORIES)[number];

export type LucideCatalogueEntry = {
    id: LucideSpaceIcon;
    categories: readonly IconCategory[];
    nl: string;
    en: string;
};

/** The curated lucide set (B196). The server validates against the same file. */
export const LUCIDE_CATALOGUE =
    lucideCatalogue as readonly LucideCatalogueEntry[];

const LUCIDE_IDS: ReadonlySet<string> = new Set(
    LUCIDE_CATALOGUE.map((entry) => entry.id),
);

const isLucideSpaceIcon = (value: string): value is LucideSpaceIcon => {
    return LUCIDE_IDS.has(value);
};

export const isSpaceIconPreset = (value: unknown): value is SpaceIconPreset => {
    return (
        typeof value === 'string' &&
        ((SPACE_ICON_PRESETS as readonly string[]).includes(value) ||
            isLucideSpaceIcon(value))
    );
};

/** The icons offered per kind of space, the standard one first. Any preset is valid on any special space. */
export const ICONS_BY_KIND: Readonly<
    Record<IconKind, readonly OwnSpaceIcon[]>
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

/** Lucide drawings that suit a kind of space (B196): the picker shows them first, after our own. */
export const LUCIDE_BY_KIND: Readonly<
    Record<IconKind, readonly LucideSpaceIcon[]>
> = {
    start: [
        'lucide:flag',
        'lucide:hand-coins',
        'lucide:arrow-big-right',
        'lucide:house',
        'lucide:party-popper',
        'lucide:sparkles',
    ],
    jail: [
        'lucide:grid-3x3',
        'lucide:lock-keyhole',
        'lucide:key',
        'lucide:siren',
        'lucide:gavel',
        'lucide:ban',
    ],
    parking: [
        'lucide:square-parking',
        'lucide:car-front',
        'lucide:coffee',
        'lucide:tent-tree',
        'lucide:palmtree',
        'lucide:sofa',
    ],
    gotojail: [
        'lucide:siren',
        'lucide:gavel',
        'lucide:shield-alert',
        'lucide:lock',
        'lucide:ban',
        'lucide:footprints',
    ],
    utility: [
        'lucide:zap',
        'lucide:lightbulb',
        'lucide:droplet',
        'lucide:wifi',
        'lucide:plug',
        'lucide:wind',
    ],
    station: [
        'lucide:train-front',
        'lucide:tram-front',
        'lucide:bus',
        'lucide:ship',
        'lucide:plane',
        'lucide:car-taxi-front',
    ],
    tax: [
        'lucide:receipt',
        'lucide:landmark',
        'lucide:wallet',
        'lucide:percent',
        'lucide:calculator',
        'lucide:banknote',
    ],
    chance: [
        'lucide:dices',
        'lucide:circle-help',
        'lucide:clover',
        'lucide:sparkles',
        'lucide:star',
        'lucide:gift',
    ],
    chest: [
        'lucide:gift',
        'lucide:mail',
        'lucide:package',
        'lucide:heart',
        'lucide:hand-heart',
        'lucide:piggy-bank',
    ],
};

const CORNER_KINDS: Record<CornerKind, IconKind> = {
    start: 'start',
    jail: 'jail',
    parking: 'parking',
    gotojail: 'gotojail',
};

/** The kind of icon a space takes, or `null` for a street, which has none. */
export const iconKindOf = (space: Space): IconKind | null => {
    switch (space.type) {
        case 'corner':
            return CORNER_KINDS[space.corner];
        case 'street':
            return null;
        default:
            return space.type;
    }
};

/** The icon a space has without a choice; tax spaces have none. */
export const defaultSpaceIcon = (space: Space): OwnSpaceIcon | null => {
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
};

export const SPACE_ICON_NAMES: Readonly<
    Record<OwnSpaceIcon, Record<Locale, string>>
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

const LUCIDE_NAMES: ReadonlyMap<string, LucideCatalogueEntry> = new Map(
    LUCIDE_CATALOGUE.map((entry) => [entry.id, entry]),
);

/** The name of any icon in the language of the site, for its label and for the search (B196). */
export const spaceIconName = (id: SpaceIconPreset, locale: Locale): string => {
    const own = (SPACE_ICON_NAMES as Record<string, Record<Locale, string>>)[
        id
    ];

    return own?.[locale] ?? LUCIDE_NAMES.get(id)?.[locale] ?? id;
};
