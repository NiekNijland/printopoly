import { BoardFormChoice } from '@/features/print/board-form-choice';
import { INVITATIONS_PER_SHEET } from '@/features/print/estimate';
import { InvitationCount } from '@/features/print/invitation-count';
import { MoneyChoice } from '@/features/print/money-choice';
import type { Choice } from '@/features/print/print-page-setup';
import { useTranslation, useTranslationChoice } from '@/hooks/use-translation';
import type { SetPart } from '@/lib/render/print-selection';
import type { PrintSet } from '@/types/generated';

type PartChoiceProps = {
    part: SetPart;
    set: PrintSet;
    choice: Choice;
    moneyNote: { note?: string; warn?: boolean };
    boardSize: string;
    active: (part: SetPart) => boolean;
    onChoose: (change: Partial<Choice>) => void;
};

export const PartChoice = ({
    part,
    set,
    choice,
    moneyNote,
    boardSize,
    active,
    onChoose,
}: PartChoiceProps) => {
    const t = useTranslation();
    const tc = useTranslationChoice();

    if (part === 'money') {
        return (
            <MoneyChoice
                value={choice.moneyAmount}
                perSet={t('print.money.recommended')}
                {...moneyNote}
                disabled={active('money')}
                onChange={(amount) => {
                    onChoose({ moneyAmount: amount });
                }}
            />
        );
    }
    if (part === 'board' && set === 'printer') {
        return (
            <BoardFormChoice
                value={choice.boardForm}
                size={boardSize}
                disabled={active('board')}
                onChange={(form) => {
                    onChoose({ boardForm: form });
                }}
            />
        );
    }
    if (part === 'invitation') {
        return (
            <InvitationCount
                value={choice.invitations}
                note={
                    set === 'home'
                        ? tc(
                              'print.invitations.home_note',
                              Math.ceil(
                                  choice.invitations / INVITATIONS_PER_SHEET,
                              ),
                          )
                        : t('print.invitations.printer_note')
                }
                onChange={(count) => {
                    onChoose({ invitations: count });
                }}
            />
        );
    }

    return undefined;
};
