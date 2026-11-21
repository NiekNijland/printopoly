import { memo } from 'react';

import { ChevronLeftIcon } from '@/components/icons';
import { Board } from '@/components/render';
import { Scaled } from '@/components/table/scaled';
import { useTranslation } from '@/hooks/use-translation';
import type { ResolvedEdition } from '@/lib/edition/resolve';
import { messages } from '@/lib/edition/strings';
import { renderWords } from '@/lib/edition/words';
import type { Locale } from '@/lib/game/types';
import { buildStyle } from '@/lib/render/style';
import { cn } from '@/lib/utils';

/** The board of the edition as a stamp, so the row shows theme and colours at a glance. */
const BoardStamp = memo(function BoardStamp({
    resolved,
}: {
    resolved: ResolvedEdition;
}) {
    const style = buildStyle(resolved);

    return (
        <Scaled
            widthMm={resolved.boardProfile.outer}
            heightMm={resolved.boardProfile.outer}
            width={44}
            className="rounded-sm flex-none border border-ink"
        >
            <Board
                theme={resolved.theme}
                locale={resolved.language}
                currency={resolved.currency.id}
                words={renderWords(resolved.words)}
                {...(style === undefined ? {} : { style })}
                editionName={resolved.boardCenter.name ?? resolved.name}
                profile={resolved.boardProfile}
                spaces={Object.fromEntries(
                    resolved.spaces.map((space) => [
                        space.position,
                        { name: space.name },
                    ]),
                )}
            />
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
 * "Editie" at the top of the left column (B145): the edition as an element, with a stamp of the board, the theme,
 * the language and the currency. Choosing it shows the whole board and the edition panel.
 */
export function EditionRow({
    resolved,
    interfaceLanguage,
    selected,
    onSelect,
}: EditionRowProps) {
    const t = useTranslation();
    const m = messages[interfaceLanguage];
    const meta = [
        m.themeName[resolved.theme],
        m.languageName[resolved.language],
        resolved.words.currencySymbol,
    ].join(' · ');

    return (
        <button
            type="button"
            data-edition-row
            aria-current={selected}
            aria-label={t('editor.edition_row_label', { meta })}
            onClick={onSelect}
            className={cn(
                'flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-control border-2 border-ink bg-card px-3 py-2 text-left text-ink transition-colors hover:bg-paper',
                selected && 'shadow-[inset_4px_0_0_var(--color-press)]',
            )}
        >
            <BoardStamp resolved={resolved} />
            <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-display text-lg leading-tight font-extrabold">
                    {t('editor.edition_row')}
                </span>
                <span className="truncate text-sm text-ink-soft">{meta}</span>
            </span>
            <ChevronLeftIcon
                size={16}
                className="flex-none rotate-180 lg:hidden"
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

    return (
        <button
            type="button"
            data-friends-row
            aria-label={t('editor.friends_row_label', { count })}
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
