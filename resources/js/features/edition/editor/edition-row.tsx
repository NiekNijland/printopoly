import { memo } from 'react';

import { Board } from '@/components/render/board';
import { boardPropsOf } from '@/components/render/board-props';
import { Scaled } from '@/components/render/table-scaled';
import { ChevronLeftIcon } from '@/components/ui/icons';
import { useTranslation, useTranslationChoice } from '@/hooks/use-translation';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import { messages } from '@/lib/render/edition-strings';
import { cn } from '@/lib/utils';
import type { Locale } from '@/types/game';

/** The board of the edition as a stamp, so the row shows theme and colours at a glance. */
const BoardStamp = memo(function BoardStamp({
    resolved,
}: {
    resolved: ResolvedEdition;
}) {
    return (
        <Scaled
            widthMm={resolved.boardProfile.outer}
            heightMm={resolved.boardProfile.outer}
            width={44}
            className="rounded-sm flex-none border border-ink"
        >
            <Board {...boardPropsOf(resolved)} />
        </Scaled>
    );
});

interface EditionRowProps {
    resolved: ResolvedEdition;
    interfaceLanguage: Locale;
    selected: boolean;
    onSelect: () => void;
}

/**
 * "Overzicht" (was "Editie", Niek 24 nov) at the top of the left column (B145): the edition as an element, with a stamp of the board and a line
 * that says what is behind it. Choosing it shows the whole board and the edition panel.
 */
export function EditionRow({
    resolved,
    interfaceLanguage,
    selected,
    onSelect,
}: EditionRowProps) {
    const t = useTranslation();
    const m = messages[interfaceLanguage];
    // What you find behind the row, not what is chosen (vindbaarheid point 13); the theme stays for the ear.
    const meta = t('editor.edition_row_meta');
    const label = `${meta} · ${m.themeName[resolved.theme]}`;

    return (
        <button
            type="button"
            data-edition-row
            aria-current={selected}
            aria-label={t('editor.edition_row_label', { meta: label })}
            title={t('editor.edition_row')}
            onClick={onSelect}
            className={cn(
                'flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-control border-2 border-ink bg-card px-3 py-2 text-left text-ink transition-colors hover:bg-paper',
                // On a low screen only the stamp, beside the tabs (designcheck ronde 5).
                'low:size-12 low:min-h-0 low:flex-none low:justify-center low:p-0',
                selected &&
                    'shadow-[inset_4px_0_0_var(--color-press)] low:border-press low:shadow-none',
            )}
        >
            <BoardStamp resolved={resolved} />
            <span className="flex min-w-0 flex-1 flex-col low:hidden">
                <span className="font-display text-lg leading-tight font-extrabold">
                    {t('editor.edition_row')}
                </span>
                <span className="truncate text-sm text-ink-soft">{meta}</span>
            </span>
            <ChevronLeftIcon
                size={16}
                className="flex-none rotate-180 md:hidden low:hidden"
            />
        </button>
    );
}

interface FriendsRowProps {
    count: number;
    onOpen: () => void;
}

/** "Van vrienden (n)", only while something waits (B146): it opens the first element with a contribution. */
export function FriendsRow({ count, onOpen }: FriendsRowProps) {
    const t = useTranslation();
    const tChoice = useTranslationChoice();

    return (
        <button
            type="button"
            data-friends-row
            aria-label={tChoice('editor.friends_row_label', count)}
            onClick={onOpen}
            className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-control border-2 border-ink bg-card px-3 text-left font-semibold text-ink hover:bg-paper"
        >
            <span
                aria-hidden="true"
                className="size-2.5 rounded-full bg-press"
            />
            <span className="flex-1">{t('editor.friends_row')}</span>
            <span
                aria-hidden="true"
                className="inline-flex min-w-7 items-center justify-center rounded-full bg-press px-2 py-0.5 text-sm text-white"
            >
                {count}
            </span>
        </button>
    );
}
