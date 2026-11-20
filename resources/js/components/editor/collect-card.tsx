import { UsersIcon } from '@/components/icons';
import { useTranslation, useTranslationChoice } from '@/hooks/use-translation';

interface CollectCardProps {
    /** Contributions waiting for the owner. */
    count: number;
    onOpen: () => void;
}

/**
 * The invitation to "Samen maken" (B128) at the top of the element list, where a phone has no header buttons. A
 * little tilted, like a card left on the table (B104); a badge shows what is waiting.
 */
export function CollectCard({ count, onOpen }: CollectCardProps) {
    const t = useTranslation();
    const choice = useTranslationChoice();

    return (
        <button
            type="button"
            data-collect-card
            onClick={onOpen}
            className="flex w-full -rotate-1 cursor-pointer items-start gap-3 rounded-control border-2 border-ink bg-board p-3 text-left text-ink transition-transform hover:rotate-0 motion-reduce:rotate-0 motion-reduce:transition-none"
        >
            <span className="mt-0.5 flex size-10 flex-none items-center justify-center rounded-full border-2 border-ink bg-card">
                <UsersIcon />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-display text-lg leading-tight font-extrabold">
                    {t('collect.card_title')}
                </span>
                <span className="text-sm text-ink-soft">
                    {t('collect.card_body')}
                </span>
                {count > 0 && (
                    <span className="mt-1 inline-flex self-start rounded-control bg-press px-2 py-0.5 text-sm font-semibold text-white">
                        {choice('collect.card_new', count)}
                    </span>
                )}
            </span>
        </button>
    );
}
