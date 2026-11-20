import { WarningIcon } from '@/components/icons';
import { useTranslation, useTranslationChoice } from '@/hooks/use-translation';
import { summarize } from '@/lib/checks/summary';
import type { CheckIssue } from '@/lib/checks/types';
import { parseKey } from '@/lib/edition/keys';
import type { Edition } from '@/lib/edition/types';
import { elementLabel, tabOfKey } from '@/lib/editor/catalogue';
import type { Locale } from '@/lib/game/types';

interface CheckPanelProps {
    issues: readonly CheckIssue[];
    edition: Edition;
    locale: Locale;
    onOpen: (key: string) => void;
}

const TAB_NAME: Record<Locale, Record<ReturnType<typeof tabOfKey>, string>> = {
    nl: { board: 'Bord', cards: 'Kaarten', money: 'Geld', box: 'Doos' },
    en: { board: 'Board', cards: 'Cards', money: 'Money', box: 'Box' },
};

/** The Controle list (B94): every row opens the element it is about. */
export function CheckPanel({
    issues,
    edition,
    locale,
    onOpen,
}: CheckPanelProps) {
    const t = useTranslation();
    const tc = useTranslationChoice();
    const summary = summarize(issues, locale);

    return (
        <div
            role="dialog"
            aria-label={t('editor.check_title')}
            className="absolute top-2 right-2 z-30 flex w-[min(28rem,calc(100vw-16px))] flex-col gap-2 rounded-control border-2 border-ink bg-card p-4"
        >
            {issues.length === 0 ? (
                <p className="m-0 text-base">
                    <strong>{t('editor.check_title')}:</strong>{' '}
                    {summary.label.split(': ').slice(1).join(': ')}
                </p>
            ) : (
                <>
                    <p className="m-0 font-semibold">
                        {tc('editor.check_count', issues.length)}
                    </p>
                    <ul className="m-0 flex list-none flex-col gap-2 p-0">
                        {issues.map((issue) => {
                            const openable =
                                parseKey(issue.elementKey) !== null;
                            const label = openable
                                ? `${elementLabel(issue.elementKey, edition, locale)} · ${TAB_NAME[locale][tabOfKey(issue.elementKey)]}`
                                : issue.elementKey === 'board'
                                  ? TAB_NAME[locale].board
                                  : t('editor.check_parts');
                            const body = (
                                <>
                                    <WarningIcon
                                        size={20}
                                        className="mt-0.5 shrink-0"
                                    />
                                    <span>
                                        <strong>{label}</strong>
                                        <br />
                                        <span className="sr-only">
                                            {issue.severityLabel[locale]}:{' '}
                                        </span>
                                        {issue.message[locale]}
                                    </span>
                                </>
                            );

                            return (
                                <li key={issue.id}>
                                    {openable ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onOpen(issue.elementKey)
                                            }
                                            className="flex w-full cursor-pointer items-start gap-2 rounded-control border-2 border-ink bg-warning p-3 text-left text-sm"
                                        >
                                            {body}
                                        </button>
                                    ) : (
                                        <div className="flex items-start gap-2 rounded-control border-2 border-ink bg-warning p-3 text-sm">
                                            {body}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
        </div>
    );
}
