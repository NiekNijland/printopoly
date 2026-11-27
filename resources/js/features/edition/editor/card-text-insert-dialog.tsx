import { useState } from 'react';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    insertChoices,
    parseOnly,
} from '@/features/edition/editor/card-text-tokens';
import { useTranslation } from '@/hooks/use-translation';
import {
    AMOUNT_TOKEN,
    CURRENCY_TOKEN,
    spaceToken,
    wordToken,
    type CardTextToken,
} from '@/lib/render/edition-card-text';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';

type InsertChoicesProps = {
    resolved: ResolvedEdition;
    amount: number | undefined;
    withAmount: boolean;
    onPick: (token: CardTextToken) => void;
};

const InsertChoices = ({
    resolved,
    amount,
    withAmount,
    onPick,
}: InsertChoicesProps) => {
    const t = useTranslation();
    const [search, setSearch] = useState('');
    const { items, words, wordKind } = insertChoices(resolved, search, t);

    return (
        <div className="mt-4 flex flex-col gap-3">
            <Input
                type="search"
                aria-label={t('editor.card_text_search')}
                placeholder={t('editor.card_text_search')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
            />
            <ul className="m-0 flex max-h-72 list-none flex-col gap-1 overflow-auto p-0">
                <li>
                    <ChoiceButton
                        onClick={() => onPick(parseOnly(CURRENCY_TOKEN))}
                        name={`${t('editor.card_text_currency_item')} (${resolved.currency.symbol})`}
                    />
                </li>
                {withAmount && (
                    <li>
                        <ChoiceButton
                            onClick={() => onPick(parseOnly(AMOUNT_TOKEN))}
                            name={t('editor.card_text_amount_item')}
                            note={
                                amount === undefined
                                    ? t('editor.card_text_amount_unset')
                                    : undefined
                            }
                        />
                    </li>
                )}
                {words.map((item) => (
                    <li key={item.word}>
                        <ChoiceButton
                            onClick={() =>
                                onPick(parseOnly(wordToken(item.word)))
                            }
                            name={item.name}
                            note={wordKind}
                        />
                    </li>
                ))}
                {items.map((item) => (
                    <li key={item.position}>
                        <ChoiceButton
                            onClick={() =>
                                onPick(parseOnly(spaceToken(item.position)))
                            }
                            name={item.name}
                            note={item.kind}
                        />
                    </li>
                ))}
                {items.length === 0 && words.length === 0 && (
                    <li
                        role="status"
                        className="px-3 py-2 text-base font-normal text-ink-soft"
                    >
                        {t('editor.card_text_no_results')}
                    </li>
                )}
            </ul>
        </div>
    );
};

type CardTextInsertDialogProps = InsertChoicesProps & {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCloseAutoFocus: (event: Event) => void;
};

export const CardTextInsertDialog = ({
    open,
    onOpenChange,
    onCloseAutoFocus,
    resolved,
    amount,
    withAmount,
    onPick,
}: CardTextInsertDialogProps) => {
    const t = useTranslation();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent onCloseAutoFocus={onCloseAutoFocus}>
                <DialogTitle>{t('editor.card_text_insert_title')}</DialogTitle>
                <DialogDescription>
                    {t(
                        withAmount
                            ? 'editor.card_text_insert_hint'
                            : 'editor.card_text_insert_hint_names',
                    )}
                </DialogDescription>
                <InsertChoices
                    resolved={resolved}
                    amount={amount}
                    withAmount={withAmount}
                    onPick={onPick}
                />
            </DialogContent>
        </Dialog>
    );
};

const ChoiceButton = ({
    name,
    note,
    onClick,
}: {
    name: string;
    note?: string | undefined;
    onClick: () => void;
}) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-control border-0 bg-transparent px-3 py-2 text-left text-base font-semibold text-ink hover:bg-table"
        >
            <span>{name}</span>
            {note !== undefined && (
                <span className="text-sm font-normal text-ink-soft">
                    {note}
                </span>
            )}
        </button>
    );
};
