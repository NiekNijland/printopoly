import type { ChipView } from '@/features/edition/editor/card-text-chips';
import type { useTranslation } from '@/hooks/use-translation';
import {
    cardTextContext,
    parseCardText,
    tokenValue,
    type CardTextToken,
} from '@/lib/render/edition-card-text';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import { wordOf, type CardTextWord } from '@/lib/render/edition-words';

type Translate = ReturnType<typeof useTranslation>;

/** Space types a card text can name. Chance and Community Chest spaces have no name of their own. */
const NAMEABLE = new Set(['street', 'station', 'utility', 'corner', 'tax']);

/** The words the insert list offers (B177); plurals stay as typed tokens, they come with the standard texts. */
const OFFERED_WORDS: readonly CardTextWord[] = [
    'station',
    'utility',
    'house',
    'hotel',
    'jail',
];

export const describeToken = (
    token: CardTextToken,
    resolved: ResolvedEdition,
    amount: number | undefined,
    t: Translate,
): ChipView => {
    const context = cardTextContext(
        {
            elements: {},
            language: resolved.language,
            currency: resolved.currency.id,
        },
        amount,
    );
    switch (token.type) {
        case 'space': {
            const space = resolved.spaces.find(
                (candidate) => candidate.position === token.position,
            );
            const name =
                space === undefined
                    ? ''
                    : space.name.trim() || space.base.name[resolved.language];
            const kind = t(
                space?.base.type === 'street' ||
                    space?.base.type === 'station' ||
                    space?.base.type === 'utility'
                    ? `editor.token_${space.base.type}`
                    : 'editor.token_space',
            );

            return {
                text: name,
                label: `${kind}: ${name}`,
                broken: space === undefined,
            };
        }
        case 'currency':
            return {
                text: resolved.currency.symbol,
                label: `${t('editor.token_currency')}: ${resolved.currency.name[resolved.language]}`,
                broken: false,
            };
        case 'amount': {
            const shown = tokenValue(token, context);

            return {
                text: shown ?? t('editor.token_amount_unset'),
                label:
                    shown === undefined
                        ? t('editor.token_amount_unset')
                        : `${t('editor.token_amount')}: ${shown}`,
                broken: shown === undefined,
            };
        }
        case 'word': {
            const word = wordOf(resolved.words, token.word);

            return {
                text: word,
                label: `${t('editor.token_word')}: ${word}`,
                broken: false,
            };
        }
        case 'unknown':
            return {
                text: token.raw,
                label: `${t('editor.token_unknown')}: ${token.raw}`,
                broken: true,
            };
    }
};

export const insertChoices = (
    resolved: ResolvedEdition,
    search: string,
    t: Translate,
) => {
    const needle = search.trim().toLowerCase();
    const items = resolved.spaces
        .filter((space) => NAMEABLE.has(space.base.type))
        .map((space) => ({
            position: space.position,
            name: space.name.trim() || space.base.name[resolved.language],
            kind: t(
                space.base.type === 'street' ||
                    space.base.type === 'station' ||
                    space.base.type === 'utility'
                    ? `editor.token_${space.base.type}`
                    : 'editor.token_space',
            ),
        }))
        .filter(
            (item) =>
                needle === '' ||
                item.name.toLowerCase().includes(needle) ||
                item.kind.toLowerCase().includes(needle),
        );
    const wordKind = t('editor.token_word');
    const words = OFFERED_WORDS.map((word) => ({
        word,
        name: wordOf(resolved.words, word),
    })).filter(
        (item) =>
            needle === '' ||
            item.name.toLowerCase().includes(needle) ||
            wordKind.toLowerCase().includes(needle),
    );

    return { items, words, wordKind };
};

export const parseOnly = (token: string): CardTextToken => {
    const [segment] = parseCardText(token);

    if (segment === undefined || segment.type === 'text') {
        throw new RangeError(`Not a token: ${token}`);
    }

    return segment;
};
