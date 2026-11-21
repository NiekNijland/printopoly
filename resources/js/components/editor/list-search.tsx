import { CloseIcon, SearchIcon } from '@/components/icons';
import { useTranslation } from '@/hooks/use-translation';
import type { EditorTab } from '@/lib/editor/catalogue';

interface ListSearchProps {
    tab: EditorTab;
    value: string;
    onChange: (value: string) => void;
}

/**
 * The search on top of the left list (B161, UX 2): part of the list itself, it stays in view while the list
 * scrolls. Enter opens the first match, Escape empties the field.
 */
export function ListSearch({ tab, value, onChange }: ListSearchProps) {
    const t = useTranslation();
    const label = t(
        tab === 'cards' ? 'editor.search_cards' : 'editor.search_spaces',
    );

    return (
        <div className="sticky top-0 z-10 -mx-1 bg-table px-1 pt-1 pb-2">
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
                        } else if (event.key === 'Enter') {
                            event.preventDefault();
                            event.currentTarget
                                .closest('[data-scroll-list]')
                                ?.querySelector<HTMLElement>(
                                    '[data-row-open], [data-card-tile]',
                                )
                                ?.click();
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
