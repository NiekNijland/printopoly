import { formatMoney, standardEdition } from '@/lib/game/standard-edition';
import type {
    CurrencyId,
    GroupId,
    Locale,
    OwnableSpace,
    Space,
    StationSpace,
    StreetSpace,
    TaxSpace,
    UtilitySpace,
} from '@/lib/game/types';

/**
 * The text of the rules booklet (B123), in our own words (B76): no sentence is taken from a published rule
 * book. The numbers (prices, rents, the start money) come from the data of the edition, so the booklet always
 * matches the cards and the money that go in the same box.
 */

/** Names the booklet uses for the pieces; the edition's own words replace them through `RulesContext.words`. */
export interface RulesWords {
    house: string;
    houses: string;
    hotel: string;
    hotels: string;
    /** Stations and utilities, as the edition calls them (`words.station`, `words.utility`, B172). */
    station: string;
    stations: string;
    utility: string;
    utilities: string;
    /** The jail as it reads in a sentence, with its article in Dutch ("de gevangenis"). */
    jail: string;
    start: string;
    chance: string;
    chest: string;
    /** The names of the corners Free Parking and Go to Jail, as on the board. */
    parking: string;
    goToJail: string;
}

export interface RulesContext {
    locale: Locale;
    currency: CurrencyId;
    /** The edition's own currency sign, when it has one (bug 7 of test round 3). */
    symbol?: string;
    /** How much play money is in the box (B156); absent when the edition prints none. */
    money?: { notes: number; maxPlayers: number };
    /** The edition prints no money: the booklet does not promise any in the box (bug 34 of test round 4). */
    noMoney?: boolean;
    /** Name of the edition, as on the board. */
    name: string;
    words: RulesWords;
    /** The name of every space, in board order (a renamed street reads renamed in the price list). */
    spaceNames: readonly string[];
    /** One house rule per line, from the house rules of the edition; empty when there are none. */
    houseRules: readonly string[];
    /** The town of a colour group, when the edition names one: it labels the group in the price list. */
    groupTowns?: Readonly<Partial<Record<string, string>>>;
    /** The spaces with the amounts of the edition (B132); the standard spaces when absent. */
    spaces?: readonly Space[];
    /** Cards per deck, with the extra cards (B135); 16 each when absent. */
    cards?: { chance: number; chest: number };
}

export const DEFAULT_WORDS: Record<Locale, RulesWords> = {
    nl: {
        house: 'huisje',
        houses: 'huisjes',
        hotel: 'hotel',
        hotels: 'hotels',
        station: 'station',
        stations: 'stations',
        utility: 'nutsbedrijf',
        utilities: 'nutsbedrijven',
        jail: 'de gevangenis',
        start: 'Start',
        chance: 'Kans',
        chest: 'Algemeen Fonds',
        parking: 'Vrij parkeren',
        goToJail: 'Ga naar de gevangenis',
    },
    en: {
        house: 'house',
        houses: 'houses',
        hotel: 'hotel',
        hotels: 'hotels',
        station: 'station',
        stations: 'stations',
        utility: 'utility',
        utilities: 'utilities',
        jail: 'jail',
        start: 'Start',
        chance: 'Chance',
        chest: 'Community Chest',
        parking: 'Free Parking',
        goToJail: 'Go to Jail',
    },
};

/** The fine for leaving jail early; a rule of the game, not of a space. */
export const JAIL_FINE = 50;

export type RulesBlock =
    | { type: 'p'; text: string }
    | { type: 'list'; items: string[]; numbered?: boolean }
    | { type: 'tip'; text: string };

export interface TextPage {
    kind: 'text';
    kicker: string;
    title: string;
    blocks: RulesBlock[];
}

export interface PriceRow {
    name: string;
    group: GroupId | 'station' | 'utility';
    /** Plain numbers, formatted for the language; the heading says which currency. */
    price: string;
    rent: string;
    hotel: string;
    house: string;
    mortgage: string;
}

export interface PriceListPage {
    kind: 'prices';
    kicker: string;
    title: string;
    heads: {
        name: string;
        price: string;
        rent: string;
        hotel: string;
        house: string;
        mortgage: string;
    };
    groups: {
        id: GroupId | 'station' | 'utility';
        label: string;
        rows: PriceRow[];
    }[];
    note: string;
}

export interface HouseRulesPage {
    kind: 'houseRules';
    kicker: string;
    title: string;
    intro: string;
    rules: string[];
    /** Empty lines to write on when the edition has no house rules yet. */
    blankLines: number;
}

export interface NotesPage {
    kind: 'notes';
    kicker: string;
    title: string;
    intro: string;
    players: string;
    lines: number;
}

export interface CoverPage {
    kind: 'cover';
    title: string;
    subtitle: string;
}

export interface BackPage {
    kind: 'back';
    title: string;
    line: string;
    credit: string;
}

export type BookletPageContent =
    | CoverPage
    | TextPage
    | PriceListPage
    | HouseRulesPage
    | NotesPage
    | BackPage;

const copy = {
    nl: {
        cover: 'Spelregels',
        coverLine: 'Een spel voor 2 tot 8 spelers',
        kicker: (n: number) => `Hoofdstuk ${n}`,
    },
    en: {
        cover: 'How to play',
        coverLine: 'A game for 2 to 8 players',
        kicker: (n: number) => `Chapter ${n}`,
    },
} as const;

function plain(amount: number, locale: Locale): string {
    return new Intl.NumberFormat(locale === 'nl' ? 'nl-NL' : 'en-GB', {
        maximumFractionDigits: 0,
    }).format(amount);
}

function list(items: readonly string[], locale: Locale): string {
    const and = locale === 'nl' ? 'en' : 'and';
    const head = items.slice(0, -1);
    const last = items[items.length - 1] ?? '';

    return head.length === 0 ? last : `${head.join(', ')} ${and} ${last}`;
}

function streets(
    spaces: readonly Space[] = standardEdition.spaces,
): StreetSpace[] {
    return spaces.filter(
        (space): space is StreetSpace => space.type === 'street',
    );
}

function stations(
    spaces: readonly Space[] = standardEdition.spaces,
): StationSpace[] {
    return spaces.filter(
        (space): space is StationSpace => space.type === 'station',
    );
}

function utilities(
    spaces: readonly Space[] = standardEdition.spaces,
): UtilitySpace[] {
    return spaces.filter(
        (space): space is UtilitySpace => space.type === 'utility',
    );
}

function taxes(spaces: readonly Space[] = standardEdition.spaces): TaxSpace[] {
    return spaces.filter((space): space is TaxSpace => space.type === 'tax');
}

/** How the start money is split, in the order of the standard data: `2 × 500, 2 × 100 ...`. */
function startSplit(ctx: RulesContext): string {
    return list(
        standardEdition.money.startingCash.split.map(
            (part) =>
                `${String(part.count)} × ${formatMoney(part.value, ctx.currency, ctx.locale, ctx.symbol)}`,
        ),
        ctx.locale,
    );
}

function priceList(
    ctx: RulesContext,
    kicker: string,
    title: string,
    ids: (GroupId | 'station' | 'utility')[],
    note: string,
): PriceListPage {
    const { locale } = ctx;
    // The edition's own sign and word for a hotel head the columns (bug 7 and 17 of test round 3).
    const symbol =
        ctx.symbol ??
        standardEdition.currencies.find((entry) => entry.id === ctx.currency)
            ?.symbol ??
        '';
    const hotel = capitalize(ctx.words.hotel);
    const heads =
        locale === 'nl'
            ? {
                  name: 'Straat',
                  price: `Prijs ${symbol}`,
                  rent: 'Huur',
                  hotel,
                  house: 'Bouwen',
                  mortgage: 'Hypotheek',
              }
            : {
                  name: 'Street',
                  price: `Price ${symbol}`,
                  rent: 'Rent',
                  hotel,
                  house: 'Build',
                  mortgage: 'Mortgage',
              };
    const groupLabel = (id: GroupId | 'station' | 'utility'): string => {
        if (id === 'station') {
            return capitalize(ctx.words.stations);
        }

        if (id === 'utility') {
            return capitalize(ctx.words.utilities);
        }

        return (
            ctx.groupTowns?.[id] ??
            standardEdition.groups.find((group) => group.id === id)?.name[
                locale
            ] ??
            id
        );
    };
    const nameOf = (space: OwnableSpace): string =>
        ctx.spaceNames[space.position] ?? space.name[locale];

    return {
        kind: 'prices',
        kicker,
        title,
        heads,
        note,
        groups: ids.map((id) => {
            if (id === 'station') {
                return {
                    id,
                    label: groupLabel(id),
                    rows: stations(ctx.spaces).map((space) => ({
                        name: nameOf(space),
                        group: id,
                        price: plain(space.price, locale),
                        rent: space.rent
                            .map((value) => plain(value, locale))
                            .join(' / '),
                        hotel: '',
                        house: '',
                        mortgage: plain(space.mortgage, locale),
                    })),
                };
            }

            if (id === 'utility') {
                return {
                    id,
                    label: groupLabel(id),
                    rows: utilities(ctx.spaces).map((space) => ({
                        name: nameOf(space),
                        group: id,
                        price: plain(space.price, locale),
                        rent: `${String(space.multipliers[0])}× / ${String(space.multipliers[1])}×`,
                        hotel: '',
                        house: '',
                        mortgage: plain(space.mortgage, locale),
                    })),
                };
            }

            return {
                id,
                label: groupLabel(id),
                rows: streets(ctx.spaces)
                    .filter((space) => space.group === id)
                    .map((space) => ({
                        name: nameOf(space),
                        group: id,
                        price: plain(space.price, locale),
                        rent: plain(space.rent[0], locale),
                        hotel: plain(space.rent[5], locale),
                        house: plain(space.houseCost, locale),
                        mortgage: plain(space.mortgage, locale),
                    })),
            };
        }),
    };
}

function capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/** All sixteen pages of the booklet, in reading order. */
export function bookletPages(ctx: RulesContext): BookletPageContent[] {
    const { locale, words } = ctx;
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

    if (locale === 'nl') {
        return [
            cover,
            text(1, `Welkom bij ${ctx.name}`, [
                p(
                    `Dit is jullie eigen editie van een spel waarin je grond koopt, er ${words.houses} op zet en huur int van de spelers die er langskomen. Dit boekje legt de regels in korte stukken uit, met de prijzen van jullie eigen bord.`,
                ),
                p('In de doos zit:'),
                items([
                    'het bord',
                    `${String(standardEdition.components.titleDeeds)} eigendomsbewijzen`,
                    `${String(cards.chance)} kaarten ${words.chance} en ${String(cards.chest)} kaarten ${words.chest}`,
                    moneyItem ??
                        (ctx.noMoney === true
                            ? 'een pion per speler; het speelgeld neem je uit je eigen spel'
                            : 'speelgeld en een pion per speler'),
                ]),
                // Houses, hotels and dice are not printed (B200): they come from your own game (B236).
                p(
                    `Uit je eigen spel neem je ${String(houses)} ${words.houses}, ${String(hotels)} ${words.hotels} en 2 dobbelstenen.`,
                ),
                p(
                    players === 8
                        ? 'Je speelt met 2 tot 8 spelers. Een potje duurt een uur of twee. Wil je eerder stoppen, spreek dan een eindtijd af.'
                        : `Je speelt met 2 tot ${String(players)} spelers: zoveel speelgeld zit er in de doos. Een potje duurt een uur of twee. Wil je eerder stoppen, spreek dan een eindtijd af.`,
                ),
            ]),
            text(2, 'Doel en opstellen', [
                p(
                    'Het doel is om als laatste over te blijven. Wie een schuld niet kan betalen, valt af.',
                ),
                items(
                    [
                        'Kies een bankier. De bankier beheert het geld, de eigendomsbewijzen en de bouwvoorraad, en speelt gewoon mee.',
                        `Iedereen krijgt ${money(standardEdition.money.startingCash.total)} startgeld: ${startSplit(ctx)}.`,
                        `Zet alle pionnen op ${words.start}.`,
                        `Schud de kaarten van ${words.chance} en ${words.chest} en leg elke stapel met de achterkant boven op zijn plek op het bord.`,
                        'Gooi allemaal met beide dobbelstenen. De hoogste worp begint, daarna gaat de beurt met de klok mee.',
                    ],
                    true,
                ),
            ]),
            text(3, 'Je beurt', [
                items(
                    [
                        'Gooi met beide dobbelstenen.',
                        'Zet je pion met de klok mee zoveel vakken vooruit als de ogen samen aangeven.',
                        'Doe wat het vak waarop je staat vraagt. Dat staat op de volgende pagina’s.',
                        'Geef de dobbelstenen door.',
                    ],
                    true,
                ),
                p(
                    'Voor of na je worp mag je bouwen, een straat verhypothekeren of ruilen met andere spelers.',
                ),
                p(
                    `Gooi je twee dezelfde cijfers (dubbel), dan mag je na je zet nog een keer gooien. Gooi je drie keer achter elkaar dubbel, dan ga je meteen naar ${words.jail}.`,
                ),
                p(
                    `Kom je langs ${words.start} of kom je er precies op terecht, dan krijg je ${money(start)} van de bank.`,
                ),
            ]),
            text(4, 'Kopen en huur betalen', [
                p(
                    `Kom je op een straat, ${words.station} of ${words.utility} zonder eigenaar, dan mag je het kopen voor de prijs op het vak. Je krijgt het eigendomsbewijs en legt het open voor je neer.`,
                ),
                p(
                    'Wil je niet kopen, dan veilt de bankier het meteen. Iedereen mag bieden, jij ook. Wie het hoogste biedt, betaalt de bank en krijgt het eigendomsbewijs. Elk bedrag mag, ook heel laag.',
                ),
                p(
                    'Komt een speler op een vak met een eigenaar, dan betaalt hij de huur van het eigendomsbewijs aan die eigenaar. Een straat die verhypothekeerd is (omgekeerd ligt), levert geen huur op.',
                ),
                tip(
                    'Vraag de huur voordat de volgende speler gooit. Vergeten? Dan is hij weg.',
                ),
            ]),
            text(5, `Hele kleuren en ${words.houses}`, [
                p(
                    'Heb je alle straten van één kleur, dan is de huur van die straten zonder bebouwing het dubbele.',
                ),
                p(
                    `Met een hele kleur mag je bouwen. Een ${words.house} kost ${money(cheapest)} tot ${money(dearest)}, afhankelijk van de kleur (zie de prijslijst). Je bouwt gelijkmatig: tussen de straten van een kleur zit nooit meer dan één ${words.house} verschil.`,
                ),
                p(
                    `Een straat krijgt hooguit 4 ${words.houses}. Wil je meer, dan geef je die 4 ${words.houses} terug en betaal je de bouwprijs nog eens voor een ${words.hotel}. Een straat heeft maximaal één ${words.hotel}.`,
                ),
                p(
                    `Er zijn ${String(houses)} ${words.houses} en ${String(hotels)} ${words.hotels}. Zijn ze op, dan kun je pas bouwen als iemand er een verkoopt. Verkopen kan altijd, voor de helft van de bouwprijs, en ook gelijkmatig.`,
                ),
            ]),
            text(6, `${capitalize(words.stations)} en ${words.utilities}`, [
                p(
                    `Op ${words.stations} bouw je niet. De huur hangt af van het aantal ${words.stations} dat de eigenaar heeft: ${money(stationRent[0])}, ${money(stationRent[1])}, ${money(stationRent[2])} of ${money(stationRent[3])} bij 1, 2, 3 of 4 ${words.stations}.`,
                ),
                p(
                    `Ook op ${words.utilities} bouw je niet. De huur hangt van de worp af. Heeft de eigenaar er één, dan betaal je ${String(utilityRent[0])} keer het aantal ogen dat je net gooide. Heeft hij beide, dan is het ${String(utilityRent[1])} keer.`,
                ),
            ]),
            text(7, `${words.chance}, ${words.chest} en belasting`, [
                p(
                    `Op een vak ${words.chance} of ${words.chest} pak je de bovenste kaart van die stapel, lees je hem hardop voor en doe je wat er staat. Daarna gaat de kaart onderaan de stapel. Een kaart om uit ${words.jail} te komen mag je bewaren tot je hem nodig hebt.`,
                ),
                p(
                    `Op een belastingvak betaal je de bank ${tax1 === undefined ? '' : money(tax1.amount)}${tax2 === undefined ? '' : ` of ${money(tax2.amount)}`}, het bedrag dat op het vak staat.`,
                ),
                p(
                    `Op ${words.parking} gebeurt niets. Het is een plek om even uit te rusten.`,
                ),
            ]),
            text(8, capitalize(words.jail), [
                p(
                    `Je gaat naar ${words.jail} als je op het vak “${words.goToJail}” komt, als een kaart het zegt of als je drie keer achter elkaar dubbel gooit. Je beurt is dan meteen voorbij en je krijgt geen ${money(start)} van ${words.start}.`,
                ),
                p(
                    `Je komt weer vrij als je dubbel gooit, als je ${money(JAIL_FINE)} betaalt voordat je gooit, of als je een vrijkaart inlevert. Na drie beurten zonder dubbel betaal je ${money(JAIL_FINE)} en zet je je pion met de laatste worp vooruit.`,
                ),
                p(
                    'Terwijl je vastzit, mag je gewoon huur innen, bieden, bouwen en ruilen. Sta je op het hoekvak zonder dat je vastzit, dan ben je alleen op bezoek.',
                ),
            ]),
            text(9, 'Hypotheek en ruilen', [
                p(
                    'Te weinig geld? Je mag een straat verhypothekeren, maar alleen als er geen bebouwing op staat. Draai het eigendomsbewijs om en ontvang het hypotheekbedrag van de bank. Zolang de straat verhypothekeerd is, krijg je er geen huur voor.',
                ),
                p(
                    `Aflossen kan op elk moment: je betaalt het hypotheekbedrag plus een tiende erbovenop. Staan er in een kleur nog ${words.houses}, dan verkoop je die eerst.`,
                ),
                p(
                    'Ruilen mag op elk moment met elke speler: straten, geld, vrijkaarten of een combinatie. Bebouwing ruil je niet; verkoop die eerst aan de bank.',
                ),
            ]),
            text(10, 'Failliet en winnen', [
                p(
                    'Kun je een schuld niet betalen, ook niet door te verkopen en te verhypothekeren, dan ben je failliet en doe je niet meer mee.',
                ),
                p(
                    'Was de schuld aan een andere speler, dan krijgt die al je eigendomsbewijzen en je kaarten. Was het aan de bank, dan veilt de bankier je straten één voor één.',
                ),
                p(
                    'De laatste speler die overblijft wint. Spelen jullie op tijd? Dan wint wie op het eind het meest waard is: geld, straten en bebouwing samen, tegen de aankoopprijs.',
                ),
            ]),
            priceList(
                ctx,
                'Prijslijst',
                'Straten, deel 1',
                ['brown', 'lightblue', 'pink', 'orange'],
                `Huur is zonder bebouwing. Hotel is de huur met een ${words.hotel}. Bouwen is de prijs van één ${words.house}.`,
            ),
            priceList(
                ctx,
                'Prijslijst',
                'Straten, deel 2',
                ['red', 'yellow', 'green', 'darkblue', 'station', 'utility'],
                `${capitalize(words.station)}: huur bij 1 / 2 / 3 / 4 ${words.stations}. ${capitalize(words.utility)}: keer de ogen bij 1 / 2 ${words.utilities}.`,
            ),
            {
                kind: 'houseRules',
                kicker: 'Onze afspraken',
                title: 'Huisregels',
                intro:
                    ctx.houseRules.length > 0
                        ? 'Deze afspraken gelden bij ons, boven de regels van dit boekje.'
                        : 'Spreek vooraf af wat voor jullie gelden en schrijf het hier op.',
                rules: [...ctx.houseRules],
                blankLines: 9,
            },
            {
                kind: 'notes',
                kicker: 'Aantekeningen',
                title: 'Wie wat bezit',
                intro: 'Houd bij wie wat heeft gekocht, of schrijf de stand van het spel op.',
                players: 'Speler',
                // One row per player: the game is for 2 to 8 (bug 34 of test round 4).
                lines: 8,
            },
            { ...back },
        ];
    }

    return [
        cover,
        text(1, `Welcome to ${ctx.name}`, [
            p(
                `This is your own edition of a game where you buy land, put ${words.houses} on it and collect rent from the players who land there. This booklet explains the rules in short pieces, with the prices of your own board.`,
            ),
            p('In the box:'),
            items([
                'the board',
                `${String(standardEdition.components.titleDeeds)} title deeds`,
                `${String(cards.chance)} ${words.chance} cards and ${String(cards.chest)} ${words.chest} cards`,
                moneyItem ??
                    (ctx.noMoney === true
                        ? 'one pawn per player; the play money comes from your own game'
                        : 'play money and one pawn per player'),
            ]),
            // Houses, hotels and dice are not printed (B200): they come from your own game (B236).
            p(
                `From your own game you take ${String(houses)} ${words.houses}, ${String(hotels)} ${words.hotels} and 2 dice.`,
            ),
            p(
                players === 8
                    ? 'You play with 2 to 8 players. A game takes an hour or two. If you want to stop earlier, agree on an end time first.'
                    : `You play with 2 to ${String(players)} players: that is how much play money is in the box. A game takes an hour or two. If you want to stop earlier, agree on an end time first.`,
            ),
        ]),
        text(2, 'Goal and set-up', [
            p(
                'The goal is to be the last player left. A player who cannot pay a debt drops out.',
            ),
            items(
                [
                    'Pick a banker. The banker looks after the money, the title deeds and the building supply, and plays like everyone else.',
                    `Everyone gets ${money(standardEdition.money.startingCash.total)} to start with: ${startSplit(ctx)}.`,
                    `Put all pawns on ${words.start}.`,
                    `Shuffle the ${words.chance} and ${words.chest} cards and put each pile face down on its spot on the board.`,
                    'Everyone rolls both dice. The highest roll goes first, then play passes clockwise.',
                ],
                true,
            ),
        ]),
        text(3, 'Your turn', [
            items(
                [
                    'Roll both dice.',
                    'Move your pawn clockwise as many spaces as the dice show together.',
                    'Do what the space you land on asks. The next pages explain each one.',
                    'Pass the dice on.',
                ],
                true,
            ),
            p(
                'Before or after your roll you may build, mortgage a street or trade with other players.',
            ),
            p(
                `If you roll two of the same number (a double), you roll again after your move. Three doubles in a row send you straight to ${words.jail}.`,
            ),
            p(
                `Whenever you pass ${words.start} or land on it, you collect ${money(start)} from the bank.`,
            ),
        ]),
        text(4, 'Buying and paying rent', [
            p(
                `If you land on a street, ${words.station} or ${words.utility} that nobody owns, you may buy it for the price on the space. You get the title deed and put it face up in front of you.`,
            ),
            p(
                'If you do not want it, the banker auctions it straight away. Everyone may bid, you too. The highest bidder pays the bank and takes the title deed. Any amount is allowed, even a very low one.',
            ),
            p(
                'If you land on a space that has an owner, you pay that owner the rent on its title deed. A street that is mortgaged (turned face down) earns no rent.',
            ),
            tip(
                'Ask for the rent before the next player rolls. Forgot? Then it is gone.',
            ),
        ]),
        text(5, `Full colours and ${words.houses}`, [
            p(
                'If you own every street of one colour, the rent on those streets is doubled while they have nothing built on them.',
            ),
            p(
                `With a full colour you may build. A ${words.house} costs ${money(cheapest)} to ${money(dearest)}, depending on the colour (see the price list). Build evenly: the streets of a colour never differ by more than one ${words.house}.`,
            ),
            p(
                `A street holds at most 4 ${words.houses}. To go further, hand back those 4 ${words.houses} and pay the building price once more for a ${words.hotel}. A street has at most one ${words.hotel}.`,
            ),
            p(
                `There are ${String(houses)} ${words.houses} and ${String(hotels)} ${words.hotels}. When they run out, you can only build once someone sells one. You can always sell, for half the building price, and evenly too.`,
            ),
        ]),
        text(6, `${capitalize(words.stations)} and ${words.utilities}`, [
            p(
                `You cannot build on ${words.stations}. The rent depends on how many ${words.stations} the owner has: ${money(stationRent[0])}, ${money(stationRent[1])}, ${money(stationRent[2])} or ${money(stationRent[3])} for 1, 2, 3 or 4 ${words.stations}.`,
            ),
            p(
                `You cannot build on ${words.utilities} either. The rent depends on the roll. If the owner has one, you pay ${String(utilityRent[0])} times the number you just rolled. If the owner has both, it is ${String(utilityRent[1])} times.`,
            ),
        ]),
        text(7, `${words.chance}, ${words.chest} and tax`, [
            p(
                `On a ${words.chance} or ${words.chest} space you take the top card of that pile, read it aloud and do what it says. Then it goes to the bottom of the pile. A card that lets you out of ${words.jail} may be kept until you need it.`,
            ),
            p(
                `On a tax space you pay the bank ${tax1 === undefined ? '' : money(tax1.amount)}${tax2 === undefined ? '' : ` or ${money(tax2.amount)}`}, the amount on the space.`,
            ),
            p(
                `On ${words.parking} nothing happens. It is a place to catch your breath.`,
            ),
        ]),
        text(8, capitalize(words.jail), [
            p(
                `You go to ${words.jail} when you land on “${words.goToJail}”, when a card says so, or when you roll three doubles in a row. Your turn ends at once and you do not collect ${money(start)} from ${words.start}.`,
            ),
            p(
                `You get out by rolling a double, by paying ${money(JAIL_FINE)} before you roll, or by handing in a free card. After three turns without a double you pay ${money(JAIL_FINE)} and move your pawn with that last roll.`,
            ),
            p(
                'While you are inside you may still collect rent, bid, build and trade. If you land on the corner space without being locked up, you are only visiting.',
            ),
        ]),
        text(9, 'Mortgages and trading', [
            p(
                'Short of money? You may mortgage a street, but only if nothing is built on it. Turn the title deed face down and take the mortgage amount from the bank. While the street is mortgaged it earns no rent.',
            ),
            p(
                `You can pay it off at any time: the mortgage amount plus a tenth on top. If a colour still has ${words.houses} on it, sell those first.`,
            ),
            p(
                'You may trade with any player at any time: streets, money, free cards or a mix. Buildings cannot be traded; sell them to the bank first.',
            ),
        ]),
        text(10, 'Bankrupt and winning', [
            p(
                'If you cannot pay a debt, even by selling and mortgaging, you are bankrupt and out of the game.',
            ),
            p(
                'If you owed another player, that player gets all your title deeds and cards. If you owed the bank, the banker auctions your streets one by one.',
            ),
            p(
                'The last player left wins. Playing against the clock? Then whoever is worth the most at the end wins: money, streets and buildings together, at purchase price.',
            ),
        ]),
        priceList(
            ctx,
            'Price list',
            'Streets, part 1',
            ['brown', 'lightblue', 'pink', 'orange'],
            `Rent is with nothing built. Hotel is the rent with a ${words.hotel}. Build is the price of one ${words.house}.`,
        ),
        priceList(
            ctx,
            'Price list',
            'Streets, part 2',
            ['red', 'yellow', 'green', 'darkblue', 'station', 'utility'],
            `${capitalize(words.station)}: rent with 1 / 2 / 3 / 4 ${words.stations}. ${capitalize(words.utility)}: times the dice with 1 / 2 ${words.utilities}.`,
        ),
        {
            kind: 'houseRules',
            kicker: 'Our agreements',
            title: 'House rules',
            intro:
                ctx.houseRules.length > 0
                    ? 'These apply at our table, on top of the rules in this booklet.'
                    : 'Agree on what applies at your table and write it down here.',
            rules: [...ctx.houseRules],
            blankLines: 9,
        },
        {
            kind: 'notes',
            kicker: 'Notes',
            title: 'Who owns what',
            intro: 'Keep track of who bought what, or write down the score.',
            players: 'Player',
            lines: 8,
        },
        { ...back },
    ];
}
