import { formatNumber } from '@/lib/number-format';
import { formatMoney, standardEdition } from '@/lib/render/standard-edition';
import type {
    Locale,
    Space,
    StationSpace,
    StreetSpace,
    TaxSpace,
    UtilitySpace,
} from '@/types/game';

import type {
    BackPage,
    CoverPage,
    RulesBlock,
    RulesContext,
    TextPage,
} from './rules-booklet';

/** The fine for leaving jail early; a rule of the game, not of a space. */
export const JAIL_FINE = 50;

const copy = {
    nl: {
        cover: 'Spelregels',
        kicker: (n: number) => `Hoofdstuk ${n}`,
    },
    en: {
        cover: 'How to play',
        kicker: (n: number) => `Chapter ${n}`,
    },
} as const;

export const plain = (amount: number, locale: Locale): string => {
    return formatNumber(amount, locale === 'nl' ? 'nl-NL' : 'en-GB', {
        maximumFractionDigits: 0,
    });
};

const list = (items: readonly string[], locale: Locale): string => {
    const and = locale === 'nl' ? 'en' : 'and';
    const head = items.slice(0, -1);
    const last = items[items.length - 1] ?? '';

    return head.length === 0 ? last : `${head.join(', ')} ${and} ${last}`;
};

export const streets = (
    spaces: readonly Space[] = standardEdition.spaces,
): StreetSpace[] => {
    return spaces.filter(
        (space): space is StreetSpace => space.type === 'street',
    );
};

export const stations = (
    spaces: readonly Space[] = standardEdition.spaces,
): StationSpace[] => {
    return spaces.filter(
        (space): space is StationSpace => space.type === 'station',
    );
};

export const utilities = (
    spaces: readonly Space[] = standardEdition.spaces,
): UtilitySpace[] => {
    return spaces.filter(
        (space): space is UtilitySpace => space.type === 'utility',
    );
};

const taxes = (
    spaces: readonly Space[] = standardEdition.spaces,
): TaxSpace[] => {
    return spaces.filter((space): space is TaxSpace => space.type === 'tax');
};

/** How the start money is split, in the order of the standard data: `2 × 500, 2 × 100 ...`. */
export const startSplit = (ctx: RulesContext): string => {
    return list(
        standardEdition.money.startingCash.split.map(
            (part) =>
                `${String(part.count)} × ${formatMoney(part.value, ctx.currency, ctx.locale, ctx.symbol)}`,
        ),
        ctx.locale,
    );
};

export const capitalize = (text: string): string => {
    return text.charAt(0).toUpperCase() + text.slice(1);
};

export const bookletFacts = (ctx: RulesContext) => {
    const { locale } = ctx;
    const money = (amount: number) =>
        formatMoney(amount, ctx.currency, locale, ctx.symbol);
    const players = ctx.money?.maxPlayers ?? 8;
    // The money in the box sets how many can play (B156).
    const moneyItem =
        ctx.money === undefined
            ? undefined
            : locale === 'nl'
              ? `speelgeld voor 2 tot ${String(ctx.money.maxPlayers)} spelers (${String(ctx.money.notes)} biljetten) en een pion per speler`
              : `play money for 2 to ${String(ctx.money.maxPlayers)} players (${String(ctx.money.notes)} notes) and one pawn per player`;
    const salary =
        (ctx.spaces ?? standardEdition.spaces).find(
            (space) => space.type === 'corner' && space.corner === 'start',
        ) ?? undefined;
    const start =
        salary !== undefined && 'salary' in salary
            ? (salary.salary ?? 200)
            : 200;
    const [tax1, tax2] = taxes(ctx.spaces);
    const stationRent = stations(ctx.spaces)[0]?.rent ?? [25, 50, 100, 200];
    const utilityRent = utilities(ctx.spaces)[0]?.multipliers ?? [4, 10];
    const houseCosts = streets(ctx.spaces).map((space) => space.houseCost);
    const cheapest = Math.min(...houseCosts);
    const dearest = Math.max(...houseCosts);
    const { houses, hotels } = standardEdition.components;
    const text = (
        n: number,
        title: string,
        blocks: RulesBlock[],
    ): TextPage => ({
        kind: 'text',
        kicker: copy[locale].kicker(n),
        title,
        blocks,
    });
    const p = (value: string): RulesBlock => ({ type: 'p', text: value });
    const items = (values: string[], numbered = false): RulesBlock => ({
        type: 'list',
        items: values,
        numbered,
    });
    const tip = (value: string): RulesBlock => ({ type: 'tip', text: value });
    const cards = ctx.cards ?? { chance: 16, chest: 16 };
    const cover: CoverPage = {
        kind: 'cover',
        title: ctx.name,
        subtitle: copy[locale].cover,
    };
    const back: BackPage = {
        kind: 'back',
        title: ctx.name,
        line: locale === 'nl' ? 'Veel speelplezier' : 'Have fun playing',
        credit:
            locale === 'nl'
                ? 'Gemaakt met Printopoly · printopoly.nl'
                : 'Made with Printopoly · printopoly.nl',
    };

    return {
        money,
        players,
        moneyItem,
        start,
        tax1,
        tax2,
        stationRent,
        utilityRent,
        cheapest,
        dearest,
        houses,
        hotels,
        text,
        p,
        items,
        tip,
        cards,
        cover,
        back,
    };
};

export type BookletFacts = ReturnType<typeof bookletFacts>;
