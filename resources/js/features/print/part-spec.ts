import { panelSize, partQuantity } from '@/features/print/estimate';
import { formatMm } from '@/features/print/print-format';
import type { Choice } from '@/features/print/print-page-setup';
import type {
    useTranslation,
    useTranslationChoice,
} from '@/hooks/use-translation';
import type { Edition } from '@/lib/render/edition-types';
import {
    composePages,
    type PrintEdition,
} from '@/lib/render/print-composition';
import {
    MONEY_PLAYERS,
    banknoteTotal,
    type MoneyAmount,
} from '@/lib/render/print-money';
import type { BoardForm, PrintPart, PrintSet } from '@/types/generated';

type Translate = ReturnType<typeof useTranslation>;
type TranslateChoice = ReturnType<typeof useTranslationChoice>;

export type SpecInput = {
    part: PrintPart;
    set: PrintSet;
    counted: PrintEdition;
    drawn: Edition;
    boardForm: BoardForm;
    choice: Choice;
    moneyAmount: MoneyAmount;
    cardCount: number;
    locale: string;
    t: Translate;
    tc: TranslateChoice;
};

const boardSpec = (s: SpecInput, sheets: number): string => {
    const { drawn, locale, t } = s;
    const panel = panelSize(drawn.boardProfile);

    if (s.set === 'home') {
        return t('print.spec.home.board', { sheets });
    }

    // One whole board or the panels for your own (B243).
    return s.boardForm === 'whole'
        ? t('print.spec.printer.board_whole', {
              w: formatMm(drawn.boardProfile.outer, locale),
          })
        : t('print.spec.printer.board', {
              panels: panel.count,
              w: formatMm(panel.w, locale),
              h: formatMm(panel.h, locale),
          });
};

const cardsSpec = (s: SpecInput, sheets: number): string | undefined => {
    const { set, choice, t } = s;
    // The pages of the PDF and the sheets of paper they make, so the row says what the PDF has (R5-29).
    // More sets are in the same PDF, each with its set mark, after one alignment test (B242).
    const pages = composePages('cards', set, {
        ...s.counted,
        sets: choice.copies,
    }).length;

    if (set === 'printer') {
        return choice.copies > 1
            ? t('print.spec.printer.cards_sets', {
                  cards: s.cardCount * choice.copies,
                  copies: choice.copies,
              })
            : undefined;
    }

    return choice.copies > 1
        ? t('print.spec.home.cards_sets', {
              pages,
              sheets: pages / 2,
              copies: choice.copies,
          })
        : t('print.spec.home.cards', { pages, sheets });
};

/** The spec line of a row, counted from the edition: sheets, notes and the size of the panels (bug 22). */
export const specOf = (s: SpecInput): string | undefined => {
    const { set, choice, moneyAmount, drawn, locale, t, tc } = s;
    const quantity = partQuantity(s.part, set, s.counted);

    switch (s.part) {
        case 'board':
            return boardSpec(s, quantity.count);
        case 'invitation':
            // The number chosen for the set (B244): four to a sheet at home, one card per piece at the shop.
            return set === 'home'
                ? tc('print.spec.home.invitations', quantity.count, {
                      invitations: choice.invitations,
                  })
                : tc('print.spec.printer.invitations', choice.invitations);
        case 'money':
            // More than one set: the notes for all of them, so a club knows what it gets (UX 3 of test round 4).
            return choice.copies > 1
                ? t(`print.spec.${set}.money_sets`, {
                      notes: banknoteTotal(moneyAmount),
                      total: banknoteTotal(moneyAmount) * choice.copies,
                      copies: choice.copies,
                      sheets: quantity.count,
                  })
                : t(`print.spec.${set}.money`, {
                      notes: banknoteTotal(moneyAmount),
                      sheets: quantity.count,
                  });
        case 'box_lid':
            // At home in pieces of A4 when it is larger (R5-29).
            return set === 'printer'
                ? t('print.spec.printer.box_lid', {
                      w: formatMm(drawn.boardProfile.boxLid.w, locale),
                      h: formatMm(drawn.boardProfile.boxLid.h, locale),
                  })
                : quantity.count > 1
                  ? t('print.spec.home.box_lid_pieces', {
                        sheets: quantity.count,
                    })
                  : t('print.spec.home.box_lid');
        case 'cards':
            return cardsSpec(s, quantity.count);
        case 'tokens':
        case 'rules_booklet':
        case 'calibration':
            return undefined;
    }
};

/**
 * The line under "Hoeveel geld?": what the recommended amount is for this set and, when the set has more pawns
 * than that money is for, the advice to choose more or use the money of your own box (R5-29, Ria). When the
 * person chose that amount themselves, the line stands out.
 */
export const moneyNoteOf = (
    s: Pick<SpecInput, 'set' | 'choice' | 'moneyAmount' | 'drawn' | 't'>,
    pawnsInSet: number,
): { note?: string; warn?: boolean } => {
    const { set, t } = s;
    const max = MONEY_PLAYERS[s.moneyAmount].max;
    const ownChoice =
        s.choice.moneyAmount !== null || s.drawn.moneyAmount !== undefined;

    if (pawnsInSet > max) {
        return {
            note: t('print.money.too_little', {
                pawns: pawnsInSet,
                players: max,
            }),
            warn: ownChoice,
        };
    }

    return ownChoice ? {} : { note: t(`print.money.recommended_for.${set}`) };
};
