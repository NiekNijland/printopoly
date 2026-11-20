import { useEffect, useRef } from 'react';

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
    onOpen: (key: string, field: string) => void;
    /** Closes the list and puts the focus back on its button. */
    onClose: () => void;
}

/** "Niets gevonden" disappears by itself after this long (ms). */
const CLEAN_RESULT_MS = 6000;

const TAB_NAME: Record<Locale, Record<ReturnType<typeof tabOfKey>, string>> = {
    nl: {
        board: 'Bord',
        cards: 'Kaarten',
        money: 'Geld',
        box: 'Doos',
        style: 'Stijl',
    },
    en: {
        board: 'Board',
        cards: 'Cards',
        money: 'Money',
        box: 'Box',
        style: 'Style',
    },
};

/** The Controle list (B94): every row opens the element it is about. */
export function CheckPanel({
    issues,
    edition,
    locale,
    onOpen,
    onClose,
}: CheckPanelProps) {
    const t = useTranslation();
    const tc = useTranslationChoice();
    const summary = summarize(issues, locale);
    const panel = useRef<HTMLDivElement>(null);
    const close = useRef(onClose);

    useEffect(() => {
        close.current = onClose;
    });
    // The list takes the focus when it opens, so the keyboard can reach its rows and its close button.
    useEffect(() => {
        panel.current?.focus();
    }, []);
    // A clean result is only news for a moment: it must not stay over the fields it covers.
    const clean = issues.length === 0;
    useEffect(() => {
        if (!clean) {
            return;
        }
        const timer = window.setTimeout(() => close.current(), CLEAN_RESULT_MS);

        return () => window.clearTimeout(timer);
    }, [clean]);

    return (
        <div
            ref={panel}
            tabIndex={-1}
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
                                ? `${elementLabel(issue.elementKey, edition, locale)} · ${
                                      parseKey(issue.elementKey)?.kind ===
                                      'words'
                                          ? t('editor.check_words')
                                          : TAB_NAME[locale][
                                                tabOfKey(issue.elementKey)
                                            ]
                                  }`
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
                                                onOpen(
                                                    issue.elementKey,
                                                    issue.field,
                                                )
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
            <button
                type="button"
                onClick={onClose}
                className="min-h-11 cursor-pointer self-end border-0 bg-transparent px-2 text-sm font-semibold underline underline-offset-4"
            >
                {t('editor.check_close')}
            </button>
        </div>
    );
}
