import type { ReactNode } from 'react';

import { CloseIcon, SearchIcon } from '@/components/icons';
import { useTranslation } from '@/hooks/use-translation';
import type { EditorTab } from '@/lib/editor/catalogue';
import { cn } from '@/lib/utils';

interface ListSearchProps {
    tab: EditorTab;
    value: string;
    onChange: (value: string) => void;
    /**
     * A paste of several lines: the names go over the spaces, as in a name row (R5-10). Returns whether it used
     * the paste; otherwise the field searches for it.
     */
    onPasteLines?: (text: string) => boolean;
    /** Next to the field: the photo button of the board list (B237), the other way to fill many spaces at once. */
    trailing?: ReactNode;
}

/**
 * Enter opens the first hit and puts the focus in its row, so you can type its name right away; arrow down only
 * moves the focus there (B165, bug 15). A row without a name field gets the focus on the row itself.
 */
function openFirstHit(search: HTMLElement, { open }: { open: boolean }): void {
    const first = search
        .closest('[data-scroll-list]')
        ?.querySelector<HTMLElement>('[data-row-open], [data-card-tile]');
    if (first === null || first === undefined) {
        return;
    }
    if (open) {
        first.click();
    }
    const row = first.closest('li') ?? first;
    const target =
        row.querySelector<HTMLInputElement>('input[data-name-input]') ?? first;
    // After React has shown the element. On a phone the list is hidden or gone by then, and the browser leaves the
    // focus with the screen of the element.
    requestAnimationFrame(() => {
        if (target.isConnected) {
            target.focus();
            if (target instanceof HTMLInputElement) {
                target.select();
            }
        }
    });
}

/**
 * The search on top of the left list (B161, UX 2): part of the list itself, it stays in view while the list
 * scrolls. Enter opens the first match, arrow down goes to it, Escape empties the field.
 */
export function ListSearch({
    tab,
    value,
    onChange,
    onPasteLines,
    trailing,
}: ListSearchProps) {
    const t = useTranslation();
    const label = t(
        tab === 'cards' ? 'editor.search_cards' : 'editor.search_spaces',
    );

    return (
        <div
            data-list-sticky
            // The fade under the field shows that rows scroll on beneath it, instead of looking cut off (bug 28).
            className="@container sticky top-0 z-10 -mx-1 bg-table px-1 pt-1 pb-2 after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-4 after:bg-linear-to-b after:from-table after:to-transparent"
        >
            <div className="flex items-center gap-2">
                <div className="@container/search relative flex min-w-0 flex-1 items-center">
                    <SearchIcon
                        size={18}
                        className="pointer-events-none absolute left-2.5 text-ink-soft"
                    />
                    <input
                        type="search"
                        data-list-search
                        aria-label={label}
                        // Typing and pasting names in the rows works, but nothing said so (vindbaarheid point 3). The
                        // hint of the board list lies over the field below, short where the field is narrow.
                        placeholder={tab === 'cards' ? label : undefined}
                        value={value}
                        autoComplete="off"
                        enterKeyHint="go"
                        onChange={(event) => onChange(event.target.value)}
                        onPaste={(event) => {
                            if (
                                onPasteLines?.(
                                    event.clipboardData.getData('text/plain'),
                                ) === true
                            ) {
                                event.preventDefault();
                            }
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Escape' && value !== '') {
                                event.preventDefault();
                                onChange('');
                            } else if (
                                event.key === 'Enter' ||
                                event.key === 'ArrowDown'
                            ) {
                                event.preventDefault();
                                openFirstHit(event.currentTarget, {
                                    open: event.key === 'Enter',
                                });
                            }
                        }}
                        className={cn(
                            'h-11 w-full rounded-control border-2 border-line-strong bg-card pl-9 text-base text-ink outline-none placeholder:text-ink-soft focus:border-ink [&::-webkit-search-cancel-button]:hidden',
                            // Room for the clear button only while there is something to clear, so the hint fits
                            // next to the photo button (B237).
                            value === '' ? 'pr-2' : 'pr-11',
                        )}
                    />
                    {tab !== 'cards' && value === '' && (
                        // Next to the photo button the whole hint did not fit at 320 px or in a tablet's list
                        // (R6 Kees: "plak nam"); below 16rem it says it shorter.
                        <span
                            aria-hidden="true"
                            data-search-hint
                            className="pointer-events-none absolute inset-x-0 truncate pr-2 pl-9 text-base text-ink-soft"
                        >
                            <span className="@[16rem]/search:hidden">
                                {t('editor.search_spaces_hint_short')}
                            </span>
                            <span className="hidden @[16rem]/search:inline">
                                {t('editor.search_spaces_hint')}
                            </span>
                        </span>
                    )}
                    {value !== '' && (
                        <button
                            type="button"
                            aria-label={t('editor.search_clear')}
                            onClick={() => onChange('')}
                            className="absolute right-0 flex size-11 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-ink"
                        >
                            <CloseIcon size={18} />
                        </button>
                    )}
                </div>
                {trailing}
            </div>
        </div>
    );
}
