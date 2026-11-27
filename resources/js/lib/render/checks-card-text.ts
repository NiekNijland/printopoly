import { issue } from './checks-issue';
import type { CheckCardAmount, CheckIssue } from './checks-types';
import type { CardTextProblem } from './edition-card-text-problems';

/** The list as text: "a", "a and b", "a, b and c". */
const listOf = (items: readonly string[], and: string): string => {
    return items.length < 2
        ? (items[0] ?? '')
        : `${items.slice(0, -1).join(', ')} ${and} ${items[items.length - 1] ?? ''}`;
};

const unknownTokens = (
    elementKey: string,
    problems: readonly CardTextProblem[],
): CheckIssue[] => {
    const unknown = problems.flatMap((p) =>
        p.kind === 'unknown-token' ? [p.token] : [],
    );

    if (unknown.length === 0) {
        return [];
    }

    return [
        issue('text.unknown-token', elementKey, 'text', 'warning', {
            nl: `${listOf(unknown, 'en')} ${unknown.length === 1 ? 'is geen variabele' : 'zijn geen variabelen'} die Printopoly kent. Het staat zo op de kaart. Haal het weg of kies een variabele met Invoegen.`,
            en: `${listOf(unknown, 'and')} ${unknown.length === 1 ? 'is not a variable' : 'are not variables'} Printopoly knows. It is printed on the card as typed. Remove it, or pick a variable with Insert.`,
        }),
    ];
};

const amountMissing = (
    elementKey: string,
    problems: readonly CardTextProblem[],
): CheckIssue[] => {
    if (!problems.some((p) => p.kind === 'amount-missing')) {
        return [];
    }

    return [
        issue('text.amount-missing', elementKey, 'text', 'warning', {
            nl: 'De tekst gebruikt het bedrag van de kaart, maar er is geen bedrag ingevuld. Vul een bedrag in of haal de variabele weg.',
            en: 'The text uses the amount of the card, but no amount is filled in. Fill in an amount or remove the variable.',
        }),
    ];
};

const amountTwice = (
    elementKey: string,
    problems: readonly CardTextProblem[],
): CheckIssue[] => {
    const twice = problems.find((p) => p.kind === 'amount-twice');

    if (twice === undefined) {
        return [];
    }

    return [
        issue('text.amount-twice', elementKey, 'text', 'warning', {
            nl: `De tekst noemt ${String(twice.amount)}, en dat bedrag staat al onderaan de kaart. Laat het op één plek staan: in de tekst of onderaan.`,
            en: `The text mentions ${String(twice.amount)}, and the amount is already printed at the bottom of the card. Keep it in one place: in the text or at the bottom.`,
        }),
    ];
};

const amountDiffers = (
    elementKey: string,
    problems: readonly CardTextProblem[],
    cardAmount: CheckCardAmount | undefined,
): CheckIssue[] => {
    const differs = problems.find((p) => p.kind === 'amount-differs');

    if (differs === undefined || cardAmount === undefined) {
        return [];
    }
    const mentioned = differs.mentioned;
    const allowed = mentioned >= cardAmount.min && mentioned <= cardAmount.max;
    const said = String(mentioned);

    return [
        issue(
            'text.amount-differs',
            elementKey,
            'text',
            'warning',
            allowed
                ? {
                      nl: `De tekst noemt ${said}, maar onderaan de kaart staat ${cardAmount.shown}. Zet het bedrag op ${said}, of haal het getal uit de tekst.`,
                      en: `The text says ${said}, but the bottom of the card says ${cardAmount.shown}. Set the amount to ${said}, or take the number out of the text.`,
                  }
                : {
                      nl: `De tekst noemt ${said}, maar onderaan de kaart staat ${cardAmount.shown}. Het bedrag van deze kaart kan van ${String(cardAmount.min)} tot ${String(cardAmount.max)}. Pas de tekst aan, of kies Geen bedrag.`,
                      en: `The text says ${said}, but the bottom of the card says ${cardAmount.shown}. This card's amount can be ${String(cardAmount.min)} to ${String(cardAmount.max)}. Change the text, or choose No amount.`,
                  },
            {
                mentioned: Math.sign(cardAmount.value) * mentioned,
                allowed,
            },
        ),
    ];
};

const amountDirection = (
    elementKey: string,
    problems: readonly CardTextProblem[],
    cardAmount: CheckCardAmount | undefined,
): CheckIssue[] => {
    const direction = problems.find(
        (p) => p.kind === 'direction-differs' || p.kind === 'direction-both',
    );

    if (direction === undefined || cardAmount === undefined) {
        return [];
    }
    const receives = cardAmount.value > 0;
    const line = {
        nl: `${receives ? 'Ontvang' : 'Betaal'} ${cardAmount.shown}`,
        en: `${receives ? 'Collect' : 'Pay'} ${cardAmount.shown}`,
    };

    return [
        issue(
            'text.amount-direction',
            elementKey,
            'text',
            'warning',
            direction.kind === 'direction-both'
                ? {
                      nl: `De tekst zegt betalen én ontvangen, maar onderaan de kaart staat alleen "${line.nl}". Kies in de tekst één van de twee.`,
                      en: `The text says both pay and collect, but the bottom of the card only says "${line.en}". Pick one of the two in the text.`,
                  }
                : direction.says === 'pay'
                  ? {
                        nl: `De tekst zegt betalen, maar onderaan de kaart staat "${line.nl}": de speler krijgt geld. Kies Betalen bij het bedrag, of pas de tekst aan.`,
                        en: `The text says pay, but the bottom of the card says "${line.en}": the player gets money. Choose Pay at the amount, or change the text.`,
                    }
                  : {
                        nl: `De tekst zegt ontvangen, maar onderaan de kaart staat "${line.nl}": de speler betaalt. Kies Ontvangen bij het bedrag, of pas de tekst aan.`,
                        en: `The text says collect, but the bottom of the card says "${line.en}": the player pays. Choose Collect at the amount, or change the text.`,
                    },
            direction.kind === 'direction-differs'
                ? { says: direction.says }
                : undefined,
        ),
    ];
};

const staleNames = (
    elementKey: string,
    problems: readonly CardTextProblem[],
): CheckIssue[] => {
    const stale = problems.flatMap((p) => (p.kind === 'stale-name' ? [p] : []));

    if (stale.length === 0) {
        return [];
    }

    return [
        issue('text.stale-name', elementKey, 'text', 'warning', {
            nl: `Deze tekst noemt ${listOf(
                stale.map((p) => `${p.was} (dat vak heet nu ${p.now})`),
                'en',
            )}. Vervang de naam door een variabele met Invoegen, dan blijft hij bij.`,
            en: `This text mentions ${listOf(
                stale.map(
                    (p) => `${p.was} (that space is now called ${p.now})`,
                ),
                'and',
            )}. Replace the name with a variable using Insert and it stays in sync.`,
        }),
    ];
};

/** B131: unknown variables, `{amount}` without an amount, and names that predate a rename. One issue per kind. */
export const checkCardText = (
    elementKey: string,
    problems: readonly CardTextProblem[],
    cardAmount?: CheckCardAmount,
): CheckIssue[] => {
    return [
        ...unknownTokens(elementKey, problems),
        ...amountMissing(elementKey, problems),
        ...amountTwice(elementKey, problems),
        ...amountDiffers(elementKey, problems, cardAmount),
        ...amountDirection(elementKey, problems, cardAmount),
        ...staleNames(elementKey, problems),
    ];
};
