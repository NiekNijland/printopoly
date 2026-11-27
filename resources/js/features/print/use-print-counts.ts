import { useMemo } from 'react';
import {
    EXTRA_PARTS,
    GAME_PARTS,
    printEditionOf,
    type Choice,
} from '@/features/print/print-page-setup';
import type { PrintPageProps } from '@/features/print/use-print-page';
import type { Edition, PrintSelection } from '@/lib/render/edition-types';
import { moneyAmountOf, pawnKeysOf } from '@/lib/render/print-compose-pieces';
import { cardCountOf } from '@/lib/render/print-edition';
import { editionInSet, inPrintSelection } from '@/lib/render/print-selection';
import type { SetPart } from '@/lib/render/print-selection';
import type {
    BoardForm,
    PrintJobData,
    PrintPart,
    PrintSet,
} from '@/types/generated';

const PARTS: SetPart[] = [...GAME_PARTS, ...EXTRA_PARTS];

type Counts = {
    job: PrintJobData | null;
    edition: PrintPageProps['edition'];
    drawn: Edition;
    checked: Edition | null;
    selection: PrintSelection;
    set: PrintSet;
    choice: Choice;
};

export const usePrintCounts = (c: Counts) => {
    const { drawn, selection, set, choice } = c;
    // The pawns in the set, for the advice under "Hoeveel geld?" (R5-29).
    const pawnsInSet = inPrintSelection(selection, 'tokens')
        ? pawnKeysOf(printEditionOf(drawn, 'four')).length
        : 0;
    const moneyAmount = choice.moneyAmount ?? moneyAmountOf(drawn, set);
    const boardForm: BoardForm =
        set === 'printer' ? choice.boardForm : 'panels';
    const counted = useMemo(
        () =>
            printEditionOf(drawn, moneyAmount, {
                boardForm,
                invitations: choice.invitations,
            }),
        [drawn, moneyAmount, boardForm, choice.invitations],
    );
    // Only the parts in the set give messages, the same as in the editor (B197).
    const inSet = useMemo(
        () => editionInSet(c.checked ?? drawn, selection),
        [c.checked, drawn, selection],
    );
    const cardCount = c.job === null ? cardCountOf(drawn) : c.edition.cards;
    const selected: PrintPart[] = PARTS.filter((part) =>
        inPrintSelection(selection, part),
    );

    return {
        pawnsInSet,
        moneyAmount,
        boardForm,
        counted,
        inSet,
        cardCount,
        selected,
    };
};
