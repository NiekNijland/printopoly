import { Link, usePage } from '@inertiajs/react';

import { CopyIcon, MoreIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/hooks/use-translation';
import type { EditionSummary } from '@/lib/render/edition-types';
import { cn } from '@/lib/utils';
import { print as editionPrint } from '@/routes/editions';
import { show as editorShow } from '@/routes/editor';

import { EditionThumbnail } from './edition-thumbnail';

export const CardThumbnail = ({ edition }: { edition: EditionSummary }) => {
    const t = useTranslation();
    const { locale } = usePage().props;

    return (
        <Link
            href={editorShow({ locale, edition: edition.id })}
            tabIndex={-1}
            className="flex justify-center bg-table px-4 py-6 no-underline"
        >
            <EditionThumbnail
                editionId={edition.id}
                version={edition.updatedAt}
                label={t('editions.thumbnail', { name: edition.name })}
            />
        </Link>
    );
};

type CardSummaryProps = {
    edition: EditionSummary;
    inAccount: boolean;
    edited: string;
};

export const CardSummary = ({
    edition,
    inAccount,
    edited,
}: CardSummaryProps) => {
    const t = useTranslation();

    return (
        <div className="flex items-start gap-2 p-4 pr-[4.25rem]">
            <div className="min-w-0 flex-1">
                <h2
                    className={cn(
                        'm-0 font-display font-extrabold break-words',
                        edition.name.length > 32 ? 'text-lg' : 'text-xl',
                    )}
                >
                    {edition.name}
                </h2>
                <p className="m-0 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
                    {/* How much is your own: "40% aangepast", nothing at 0 (Niek 22 nov, replaces B178 here). */}
                    {edition.customizedPercent > 0
                        ? t('editions.meta', {
                              percent: edition.customizedPercent,
                              date: edited,
                          })
                        : t('editions.meta_edited', { date: edited })}
                </p>
                <p className="m-0 text-sm text-ink-soft">
                    {inAccount
                        ? t('editions.where_account')
                        : t('editions.where_browser')}
                </p>
            </div>
        </div>
    );
};

type CardButtonsProps = {
    edition: EditionSummary;
    busy: boolean;
    onDuplicate: () => void;
};

export const CardButtons = ({
    edition,
    busy,
    onDuplicate,
}: CardButtonsProps) => {
    const t = useTranslation();
    const { locale } = usePage().props;

    return (
        <div className="mt-auto grid grid-cols-2 gap-x-3 gap-y-1 px-4 pb-3">
            <Button asChild variant="secondary" className="flex-1">
                <Link
                    href={editorShow({ locale, edition: edition.id })}
                    aria-label={t('editions.open', { name: edition.name })}
                    data-edition-link
                >
                    {t('editions.open_action')}
                </Link>
            </Button>
            <Button asChild variant="secondary" className="flex-1">
                <Link
                    href={editionPrint({ locale, edition: edition.id })}
                    aria-label={t('editions.print_of', { name: edition.name })}
                >
                    {t('editions.print_action')}
                </Link>
            </Button>
            {/* In sight on the card, so a second edition starts from this one (UX 9). */}
            <Button
                variant="ghost"
                className="col-span-2 h-11 text-sm underline-offset-4 hover:underline"
                disabled={busy}
                aria-label={t('editions.duplicate_of', { name: edition.name })}
                onClick={onDuplicate}
            >
                <CopyIcon size={18} />
                {t('editions.duplicate_action')}
            </Button>
        </div>
    );
};

type CardMenuProps = {
    name: string;
    busy: boolean;
    onDuplicate: () => void;
    onRename: () => void;
    onDelete: () => void;
};

export const CardMenu = ({
    name,
    busy,
    onDuplicate,
    onRename,
    onDelete,
}: CardMenuProps) => {
    const t = useTranslation();

    return (
        <div className="absolute top-4 right-4">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="icon"
                        aria-label={t('editions.more', { name })}
                    >
                        <MoreIcon />
                    </Button>
                </DropdownMenuTrigger>
                {/* The same ⋯ as an element in the editor; Dupliceren here too (vindbaarheid 1.3). */}
                <DropdownMenuContent>
                    <DropdownMenuItem disabled={busy} onSelect={onDuplicate}>
                        {t('editions.duplicate_menu')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={onRename}>
                        {t('editions.rename')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="font-semibold text-press"
                        onSelect={onDelete}
                    >
                        {t('editions.delete')}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};
