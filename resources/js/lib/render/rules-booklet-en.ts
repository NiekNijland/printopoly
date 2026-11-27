import { standardEdition } from '@/lib/render/standard-edition';

import type { BookletPageContent, RulesContext } from './rules-booklet';
import {
    JAIL_FINE,
    capitalize,
    startSplit,
    type BookletFacts,
} from './rules-booklet-facts';
import { priceList } from './rules-booklet-prices';

const englishOpening = (
    ctx: RulesContext,
    facts: BookletFacts,
): BookletPageContent[] => {
    const { words } = ctx;
    const {
        money,
        players,
        moneyItem,
        start,
        houses,
        hotels,
        text,
        p,
        items,
        cards,
        cover,
    } = facts;

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
    ];
};

const englishPlay = (
    ctx: RulesContext,
    facts: BookletFacts,
): BookletPageContent[] => {
    const { words } = ctx;
    const {
        money,
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
        tip,
    } = facts;

    return [
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
    ];
};

const englishClosing = (
    ctx: RulesContext,
    facts: BookletFacts,
): BookletPageContent[] => {
    const { words } = ctx;
    const { money, start, text, p, back } = facts;

    return [
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
};

export const englishPages = (
    ctx: RulesContext,
    facts: BookletFacts,
): BookletPageContent[] => {
    return [
        ...englishOpening(ctx, facts),
        ...englishPlay(ctx, facts),
        ...englishClosing(ctx, facts),
    ];
};
