import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

import { WarningIcon } from '@/components/icons';
import { useTranslation } from '@/hooks/use-translation';
import type { Edition, PartId } from '@/lib/render/edition-types';
import { elementLabel, isCustomized } from '@/lib/render/editor-catalogue';
import { setPartOf } from '@/lib/render/print-selection';
import { cn } from '@/lib/utils';
import { print as editionsPrint } from '@/routes/editions';
import type { Locale } from '@/types/game';

export type ListBase = {
    edition: Edition;
    interfaceLanguage: Locale;
    selected: string;
    onSelect: (key: string) => void;
    warned: ReadonlySet<string>;
    inSet: ReadonlySet<PartId> | undefined;
};

export const isOut = (base: ListBase, part: PartId): boolean =>
    base.inSet !== undefined && !base.inSet.has(part);

export const outClass = (base: ListBase, part: PartId) =>
    isOut(base, part)
        ? 'opacity-60 hover:opacity-100 focus-within:opacity-100'
        : '';

// A part that is not in the set: lighter, with a word that says why (vindbaarheid point 1, B198).
// A tap on it goes to the row of the part on the print page, where you put it in the set (R6 Kees).
export const OutTag = ({ base, part }: { base: ListBase; part: PartId }) => {
    const t = useTranslation();
    const { edition, interfaceLanguage } = base;
    if (!isOut(base, part)) {
        return null;
    }
    const row = setPartOf(part);

    return (
        <Link
            href={
                editionsPrint(
                    { locale: interfaceLanguage, edition: edition.id },
                    row === undefined ? {} : { query: { part: row } },
                ).url
            }
            data-not-in-set={part}
            aria-label={t('editor.not_in_set_link')}
            className="group/out -my-1.5 inline-flex min-h-11 flex-none items-center no-underline focus-visible:outline-none"
        >
            <span className="rounded-full border border-line-strong bg-paper px-2 py-0.5 font-sans text-xs font-semibold text-ink-soft group-hover/out:border-ink group-hover/out:text-ink group-focus-visible/out:outline-3 group-focus-visible/out:outline-offset-2 group-focus-visible/out:outline-ink">
                {t('editor.not_in_set')}
            </span>
        </Link>
    );
};

type ListRowProps = {
    base: ListBase;
    elementKey: string;
    label?: string;
    leading?: ReactNode;
    part?: PartId;
};

export const ListRow = ({
    base,
    elementKey: key,
    label,
    leading,
    part,
}: ListRowProps) => {
    const t = useTranslation();
    const { edition, interfaceLanguage, selected, onSelect, warned } = base;

    return (
        <li
            className={cn(
                'flex items-center gap-2',
                part !== undefined && outClass(base, part),
            )}
        >
            <button
                type="button"
                aria-current={selected === key}
                onClick={() => onSelect(key)}
                className={cn(
                    'flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-control border-0 bg-transparent px-2 text-left text-base',
                    selected === key
                        ? 'bg-card font-semibold shadow-[inset_4px_0_0_var(--color-press)]'
                        : 'hover:bg-card/60',
                )}
            >
                {leading}
                <span className="flex-1">
                    {label ?? elementLabel(key, edition, interfaceLanguage)}
                </span>
                {isCustomized(edition, key) && (
                    <span
                        aria-label={t('editor.customized')}
                        className="size-2 rounded-full bg-ink"
                    />
                )}
                {warned.has(key) && (
                    <WarningIcon
                        size={18}
                        aria-label={t('editor.has_warning')}
                    />
                )}
            </button>
            {part !== undefined && <OutTag base={base} part={part} />}
        </li>
    );
};

export const ListHeading = ({
    base,
    text,
    part,
}: {
    base: ListBase;
    text: string;
    part?: PartId;
}) => (
    <span className="flex items-center gap-2 px-2 py-1 text-sm font-semibold text-ink-soft">
        <span className="min-w-0 flex-1">{text}</span>
        {part !== undefined && <OutTag base={base} part={part} />}
    </span>
);
