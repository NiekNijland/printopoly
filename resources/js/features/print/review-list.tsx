import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { WarningIcon } from '@/components/ui/icons';
import { useTranslation, useTranslationChoice } from '@/hooks/use-translation';
import { listIssues, type ListedIssue } from '@/lib/render/checks-summary';
import type { CheckIssue } from '@/lib/render/checks-types';
import { parseKey } from '@/lib/render/edition-keys';
import type { Edition } from '@/lib/render/edition-types';
import { elementLabel } from '@/lib/render/editor-catalogue';
import { sectionOfKey } from '@/lib/render/editor-edition-panel';
import { show as editorShow } from '@/routes/editor';
import type { Locale } from '@/types/game';

/** Messages in sight before the rest folds away; a long list must not push the parts off the screen. */
const SHOWN = 3;

/** The anchor of the list, for the note in the print bar. */
export const REVIEW_ID = 'nakijken';

type ReviewListProps = {
    issues: readonly CheckIssue[];
    edition: Edition;
    locale: Locale;
};

/**
 * Where the button of a message opens the editor (B197, B210): at the element and its field
 * (`?element=card.chance.03&field=photo`; the editor opens a key of the edition panel in its section), or, for a
 * message without an element, at the list of open messages (`?check=1`).
 */
export const reviewQuery = (
    issue: Pick<CheckIssue, 'elementKey' | 'field'>,
): Record<string, string> => {
    return parseKey(issue.elementKey) === null
        ? { check: '1' }
        : { element: issue.elementKey, field: issue.field };
};

/**
 * "Nog even nakijken" (B197): everything the Controle still has open, as the step before printing. Each message has
 * a button that opens the editor at its field. Printing never waits for it. Nothing shows when there is nothing to
 * check.
 */
export const ReviewList = ({ issues, edition, locale }: ReviewListProps) => {
    const t = useTranslation();
    const tc = useTranslationChoice();
    const [open, setOpen] = useState(false);

    if (issues.length === 0) {
        return null;
    }

    // Many empty cards or names of an edition emptied on purpose are one row each kind (R5-13).
    const rows = listIssues(issues);
    const item = ({ issue, count, message }: ListedIssue) => {
        const openable = parseKey(issue.elementKey) !== null;
        const what =
            count > 1
                ? t(
                      issue.code === 'card.empty'
                          ? 'editor.tab_cards'
                          : 'editor.tab_board',
                  )
                : (issue.about?.[locale] ??
                  (openable
                      ? sectionOfKey(issue.elementKey) === null
                          ? elementLabel(issue.elementKey, edition, locale)
                          : `${t('print.review.edition')} · ${elementLabel(issue.elementKey, edition, locale)}`
                      : t('print.review.edition')));
        const href = editorShow(
            { locale, edition: edition.id },
            { query: reviewQuery(issue) },
        ).url;

        return (
            <li
                key={issue.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-ink/20 py-3 first:border-t-0"
            >
                <span className="flex min-w-0 flex-[1_1_16rem] items-start gap-2">
                    <WarningIcon
                        size={20}
                        aria-hidden="true"
                        className="mt-0.5 flex-none text-press"
                    />
                    <span className="min-w-0">
                        <strong className="block">{what}</strong>
                        <span className="sr-only">
                            {issue.severityLabel[locale]}:{' '}
                        </span>
                        {message[locale]}
                    </span>
                </span>
                <Button asChild variant="secondary" size="sm">
                    <a
                        href={href}
                        aria-label={t('print.review.open_of', {
                            what: `${what}, ${message[locale]}`,
                        })}
                    >
                        {t('print.review.open')}
                    </a>
                </Button>
            </li>
        );
    };

    const first = rows.slice(0, SHOWN);
    const rest = rows.slice(SHOWN);

    return (
        <section
            id={REVIEW_ID}
            aria-labelledby={`${REVIEW_ID}-title`}
            // A note on the table, a little askew like the sheets: something to look at, never a wall in the way.
            className="relative scroll-mt-4 border-2 border-ink bg-warning px-4 pt-4 pb-2 shadow-print md:-rotate-[0.4deg] md:px-6"
        >
            <h2
                id={`${REVIEW_ID}-title`}
                className="m-0 font-display text-2xl font-extrabold"
            >
                {t('print.review.title')}
            </h2>
            <p className="m-0 mt-1 max-w-prose text-sm">
                {tc('print.review.lead', rows.length)}
            </p>
            <Collapsible open={open} onOpenChange={setOpen}>
                <ul className="m-0 mt-2 list-none p-0">{first.map(item)}</ul>
                {rest.length > 0 && (
                    <>
                        <CollapsibleContent asChild>
                            <ul className="m-0 list-none border-t border-ink/20 p-0">
                                {rest.map(item)}
                            </ul>
                        </CollapsibleContent>
                        <CollapsibleTrigger asChild>
                            <Button variant="link" className="text-sm">
                                {open
                                    ? t('print.review.less')
                                    : tc('print.review.more', rest.length)}
                            </Button>
                        </CollapsibleTrigger>
                    </>
                )}
            </Collapsible>
        </section>
    );
};
