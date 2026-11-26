import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { formatClock } from '@/features/edition/save-status';
import type { EditionConflict } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import { messages } from '@/lib/render/edition-strings';
import type { Locale } from '@/types/game';

interface ConflictDialogProps {
    conflict: EditionConflict | null;
    locale: Locale;
    onResolve: (choice: 'mine' | 'theirs') => void;
}

/**
 * Two windows changed the same edition (B60, B81, Staten): nothing wins silently, the person
 * picks which version stays. The dialog cannot be dismissed without a choice.
 */
export function ConflictDialog({
    conflict,
    locale,
    onResolve,
}: ConflictDialogProps) {
    const t = useTranslation();
    const m = messages[locale].conflict;

    return (
        <Dialog open={conflict !== null}>
            <DialogContent
                onEscapeKeyDown={(event) => event.preventDefault()}
                onPointerDownOutside={(event) => event.preventDefault()}
                onInteractOutside={(event) => event.preventDefault()}
            >
                {conflict !== null && (
                    <>
                        <DialogTitle>
                            {t('editor.conflict_title', {
                                name: conflict.editionName,
                            })}
                        </DialogTitle>
                        <DialogDescription>
                            {t('editor.conflict_body')}
                        </DialogDescription>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {(
                                [
                                    [m.thisWindow, conflict.mine],
                                    [m.otherWindow, conflict.theirs],
                                ] as const
                            ).map(([label, side]) => (
                                <div
                                    key={label}
                                    className="rounded-control border-2 border-ink p-3 text-sm"
                                >
                                    <strong>{label}</strong>
                                    <br />
                                    {formatClock(side.at, locale)} ·{' '}
                                    {side.summary}
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 flex flex-wrap justify-end gap-3">
                            <Button
                                variant="secondary"
                                onClick={() => onResolve('theirs')}
                            >
                                {t('editor.conflict_theirs')}
                            </Button>
                            <Button onClick={() => onResolve('mine')}>
                                {t('editor.conflict_mine')}
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
