import { withCurrency } from '@/lib/render/standard-edition';
import type { Card, DeckId, StandardEdition } from '@/types/game';
import {
    applyAmounts,
    isExtraCardAmountAllowed,
    resolveCardAmount,
} from './edition-amounts';
import {
    cardTextContext,
    mapCardTextSegments,
    parseCardText,
    renderCardText,
} from './edition-card-text';
import { cardKey, extraCardKeys, spaceKey } from './edition-keys';
import type { ResolvedCard } from './edition-resolve';
import { base } from './edition-resolve-elements';
import type { Edition } from './edition-types';
import type { ResolvedWords } from './edition-words';

/** The salary for passing Start: the standard one and the one of the edition (B132). */
const salaryOf = (
    edition: Edition,
    standard: StandardEdition,
): { standard: number; own: number } => {
    const start = standard.spaces[0];
    const fallback = 200;
    if (start?.type !== 'corner' || start.salary === undefined) {
        return { standard: fallback, own: fallback };
    }
    const own = applyAmounts(start, edition.elements[spaceKey(0)]?.amounts);

    return {
        standard: start.salary,
        own:
            own.type === 'corner' ? (own.salary ?? start.salary) : start.salary,
    };
};

const resolveCard = (
    edition: Edition,
    standard: StandardEdition,
    deck: DeckId,
    card: Card,
    index: number,
    words: ResolvedWords,
    standardWords: ResolvedWords,
): ResolvedCard => {
    const key = cardKey(deck, index + 1);
    const override = edition.elements[key];
    const language = edition.language;
    const extra = override?.added === true;
    // An extra card has a free amount and no standard one (B135).
    const amount = extra
        ? override.amount !== undefined &&
          isExtraCardAmountAllowed(override.amount)
            ? override.amount
            : undefined
        : resolveCardAmount(card, override?.amount);
    const purpose = override?.purpose?.trim();

    // The standard texts follow the edition: renamed spaces, its own words and the currency sign before every
    // amount. The currency sign goes before the amounts in the plain text around the tokens (`{space:N}`,
    // `{currency}`, `{amount}`, `{station}` and the other words), which resolve to current values (B177).
    const standardTemplate = (text: string, w: ResolvedWords): string =>
        mapCardTextSegments(text, (plain) =>
            withCurrency(plain, edition.currency, language, w.customSymbol),
        );
    // A standard card without an amount of its own that names the salary ("Kom je langs Start, dan krijg je 200")
    // names the salary of the edition (B132, round 4 bug 3).
    const salary = salaryOf(edition, standard);
    const withSalary = (text: string): string =>
        card.amount !== undefined || salary.own === salary.standard
            ? text
            : mapCardTextSegments(text, (plain) =>
                  plain.replace(
                      new RegExp(
                          `(?<![\\p{N}.,])${String(salary.standard)}(?![\\p{N}]|[.,]\\p{N})`,
                          'gu',
                      ),
                      String(salary.own),
                  ),
              );
    const standardContext = cardTextContext(
        edition,
        card.amount,
        standardWords.customSymbol,
        standardWords,
    );
    const template =
        override?.text ??
        standardTemplate(withSalary(card.text[language]), words);
    const amountInText = parseCardText(template).some(
        (segment) => segment.type === 'amount',
    );

    return {
        ...base(edition, key),
        id: card.id,
        deck,
        base: card,
        extra,
        effect: renderCardText(
            standardTemplate(withSalary(card.effect[language]), words),
            cardTextContext(edition, card.amount, words.customSymbol, words),
        ),
        originalText: renderCardText(
            standardTemplate(card.text[language], standardWords),
            standardContext,
        ),
        template,
        text: renderCardText(
            template,
            cardTextContext(edition, amount, words.customSymbol, words),
        ),
        amount,
        standardAmount: card.amount,
        lineAmount: amountInText ? undefined : amount,
        purpose: purpose === undefined || purpose === '' ? undefined : purpose,
    };
};

/** An extra card (B135) starts empty: no text, no effect, no standard amount. */
const emptyCard = (deck: DeckId, number: number): Card => {
    const empty = { nl: '', en: '' };

    return {
        id: `${deck}.${String(number).padStart(2, '0')}`,
        effect: empty,
        text: empty,
    };
};

/** The standard cards of a deck, then the extra ones the edition added (B135). */
export const deckCards = (
    edition: Edition,
    standard: StandardEdition,
    deck: DeckId,
    words: ResolvedWords,
    standardWords: ResolvedWords,
): ResolvedCard[] => {
    const cards = standard.decks[deck];
    const extra = extraCardKeys(edition.elements, deck).map((key) =>
        Number(key.split('.')[2]),
    );

    return [
        ...cards.map((card, i) =>
            resolveCard(edition, standard, deck, card, i, words, standardWords),
        ),
        ...extra.map((number) =>
            resolveCard(
                edition,
                standard,
                deck,
                emptyCard(deck, number),
                number - 1,
                words,
                standardWords,
            ),
        ),
    ];
};
