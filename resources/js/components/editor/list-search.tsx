import { CloseIcon, SearchIcon } from '@/components/icons';
import { useTranslation } from '@/hooks/use-translation';
import type { EditorTab } from '@/lib/editor/catalogue';

interface ListSearchProps {
    tab: EditorTab;
    value: string;
    onChange: (value: string) => void;
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
export function ListSearch({ tab, value, onChange }: ListSearchProps) {
    const t = useTranslation();
    const label = t(
        tab === 'cards' ? 'editor.search_cards' : 'editor.search_spaces',
    );

    return (
        <div
            data-list-sticky
            className="sticky top-0 z-10 -mx-1 bg-table px-1 pt-1 pb-2"
        >
            <div className="relative flex items-center">
                <SearchIcon
                    size={18}
                    className="pointer-events-none absolute left-3 text-ink-soft"
                />
                <input
                    type="search"
                    data-list-search
                    aria-label={label}
                    placeholder={label}
                    value={value}
                    autoComplete="off"
                    enterKeyHint="go"
                    onChange={(event) => onChange(event.target.value)}
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
                    className="h-11 w-full rounded-control border-2 border-line-strong bg-card pr-11 pl-10 text-base text-ink outline-none placeholder:text-ink-soft focus:border-ink [&::-webkit-search-cancel-button]:hidden"
                />
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
        </div>
    );
}
