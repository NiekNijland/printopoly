import { WarningIcon } from '@/components/icons';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { useTranslation, useTranslationChoice } from '@/hooks/use-translation';
import type { CheckIssue } from '@/lib/checks/types';
import { parseKey } from '@/lib/edition/keys';
import type { Edition } from '@/lib/edition/types';
import { elementLabel, tabOfKey, type EditorTab } from '@/lib/editor/catalogue';
import { sectionOfKey } from '@/lib/editor/edition-panel';
import type { Locale } from '@/lib/game/types';

interface OpenMessagesProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    issues: readonly CheckIssue[];
    edition: Edition;
    locale: Locale;
    /** Shows the element and puts the focus on the field the message is about. */
    onOpen: (key: string, field: string) => void;
}

type Place = EditorTab | 'edition';

const PLACES: readonly Place[] = ['edition', 'board', 'cards', 'money', 'box'];

const PLACE_LABEL: Record<Place, string> = {
    edition: 'editor.edition_row',
    board: 'editor.tab_board',
    cards: 'editor.tab_cards',
    money: 'editor.tab_money',
    box: 'editor.tab_box',
};

function placeOf(issue: CheckIssue): Place {
    if (sectionOfKey(issue.elementKey) !== null) {
        return 'edition';
    }

    return parseKey(issue.elementKey) === null
        ? 'board'
        : tabOfKey(issue.elementKey);
}

/**
 * The open messages in one list, behind the key C (B197): no button or counter in sight while you work. Every row
 * shows the element and the field it is about. The same list waits on the print page as "Nog even nakijken".
 */
export function OpenMessages({
    open,
    onOpenChange,
    issues,
    edition,
    locale,
    onOpen,
}: OpenMessagesProps) {
    const t = useTranslation();
    const tc = useTranslationChoice();

    return (
        <CommandDialog
            open={open}
            onOpenChange={onOpenChange}
            title={t('editor.messages_title')}
            description={
                issues.length === 0
                    ? t('editor.messages_none')
                    : tc('editor.messages_count', issues.length)
            }
            className="rounded-control border-2 border-ink bg-card sm:max-w-xl"
        >
            <div className="border-b border-line px-4 pt-4 pr-14 pb-3">
                <p className="m-0 font-display text-xl font-extrabold">
                    {t('editor.messages_title')}
                </p>
                <p className="m-0 text-sm text-ink-soft">
                    {issues.length === 0
                        ? t('editor.messages_none')
                        : tc('editor.messages_count', issues.length)}
                </p>
            </div>
            {issues.length > 0 && (
                <CommandInput placeholder={t('editor.messages_search')} />
            )}
            <CommandList className="max-h-[min(60dvh,28rem)]">
                {issues.length > 0 && (
                    <CommandEmpty>{t('editor.messages_no_match')}</CommandEmpty>
                )}
                {PLACES.map((place) => {
                    const here = issues.filter(
                        (issue) => placeOf(issue) === place,
                    );
                    if (here.length === 0) {
                        return null;
                    }

                    return (
                        <CommandGroup
                            key={place}
                            heading={t(PLACE_LABEL[place])}
                        >
                            {here.map((issue) => {
                                const openable =
                                    parseKey(issue.elementKey) !== null;
                                const label = openable
                                    ? elementLabel(
                                          issue.elementKey,
                                          edition,
                                          locale,
                                      )
                                    : t('editor.tab_board');

                                return (
                                    <CommandItem
                                        key={issue.id}
                                        value={`${issue.id} ${label} ${issue.message[locale]}`}
                                        disabled={!openable}
                                        data-message={issue.elementKey}
                                        onSelect={() => {
                                            onOpenChange(false);
                                            onOpen(
                                                issue.elementKey,
                                                issue.field,
                                            );
                                        }}
                                        className="cursor-pointer items-start gap-3 rounded-control text-sm data-[selected=true]:bg-table"
                                    >
                                        <span className="mt-0.5 flex size-6 flex-none items-center justify-center rounded-full border-2 border-ink bg-warning">
                                            <WarningIcon size={12} />
                                        </span>
                                        <span className="flex min-w-0 flex-col">
                                            <strong className="font-semibold">
                                                {label}
                                            </strong>
                                            <span>
                                                <span className="sr-only">
                                                    {
                                                        issue.severityLabel[
                                                            locale
                                                        ]
                                                    }
                                                    :{' '}
                                                </span>
                                                {issue.message[locale]}
                                            </span>
                                        </span>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    );
                })}
            </CommandList>
            <p className="m-0 border-t border-line px-4 py-2 text-xs text-ink-soft">
                {t('editor.messages_hint')}
            </p>
        </CommandDialog>
    );
}
