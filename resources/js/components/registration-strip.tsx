import { cn } from '@/lib/utils';

/**
 * The colour strip of the header and footer (B110): the four process colours
 * of a print, as on the edge of a printed sheet. Decoration only.
 */
export const RegistrationStrip = ({ className }: { className?: string }) => {
    return (
        <div aria-hidden="true" className={cn('flex h-1.5', className)}>
            <span className="flex-1 bg-print-cyan" />
            <span className="flex-1 bg-print-magenta" />
            <span className="flex-1 bg-print-riso-yellow" />
            <span className="flex-1 bg-press" />
        </div>
    );
};
