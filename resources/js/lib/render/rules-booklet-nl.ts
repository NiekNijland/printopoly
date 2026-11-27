import { standardEdition } from '@/lib/render/standard-edition';

import type { BookletPageContent, RulesContext } from './rules-booklet';
import {
    JAIL_FINE,
    capitalize,
    startSplit,
    type BookletFacts,
} from './rules-booklet-facts';
import { priceList } from './rules-booklet-prices';

const dutchOpening = (
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
    ];
};

const dutchPlay = (
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
    ];
};

const dutchClosing = (
    ctx: RulesContext,
    facts: BookletFacts,
): BookletPageContent[] => {
    const { words } = ctx;
    const { money, start, text, p, back } = facts;

    return [
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
};

export const dutchPages = (
    ctx: RulesContext,
    facts: BookletFacts,
): BookletPageContent[] => {
    return [
        ...dutchOpening(ctx, facts),
        ...dutchPlay(ctx, facts),
        ...dutchClosing(ctx, facts),
    ];
};
