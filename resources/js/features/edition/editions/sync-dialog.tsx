import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import type { AccountSync } from '@/features/edition/use-account-sync';
import { useTranslation, useTranslationChoice } from '@/hooks/use-translation';

/**
 * The one question after login (B81, Mijn-edities design): "Je hebt 3 edities in deze browser. Wil je ze in je account
 * bewaren?" and the result of the answer, including a full account and editions that were not overwritten.
 */
export function SyncDialog({ sync }: { sync: AccountSync }) {
    const t = useTranslation();
    const tc = useTranslationChoice();
    const { question } = sync;

    return (
        <>
            <Dialog open={question !== null}>
                <DialogContent
                    onEscapeKeyDown={sync.decline}
                    onInteractOutside={(event) => event.preventDefault()}
                >
                    {question !== null && (
                        <>
                            <DialogTitle>{question.title}</DialogTitle>
                            <DialogDescription>
                                {question.body}
                            </DialogDescription>
                            {question.overLimit !== null && (
                                <p role="note" className="mt-3 mb-0 text-sm">
                                    {question.overLimit.message}{' '}
                                    {t('sync.room', {
                                        count: question.overLimit.room,
                                    })}
                                </p>
                            )}
                            <div className="mt-6 flex justify-end gap-3">
                                <Button
                                    variant="secondary"
                                    disabled={sync.working}
                                    onClick={sync.decline}
                                >
                                    {question.decline}
                                </Button>
                                <Button
                                    disabled={sync.working}
                                    onClick={sync.accept}
                                >
                                    {question.accept}
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {sync.outcome !== null && (
                <div
                    role="status"
                    className="rounded-control border-2 border-ink bg-card p-4"
                >
                    {sync.outcome.imported > 0 && (
                        <p className="m-0">
                            {tc('sync.imported', sync.outcome.imported)}
                        </p>
                    )}
                    {sync.outcome.conflicts > 0 && (
                        <p className="m-0">
                            {tc('sync.conflicts', sync.outcome.conflicts)}
                        </p>
                    )}
                    {sync.outcome.overLimit > 0 && (
                        <p className="m-0">
                            {tc('sync.over_limit', sync.outcome.overLimit)}
                        </p>
                    )}
                </div>
            )}
            {sync.problem !== null && (
                <p
                    role="alert"
                    className="m-0 rounded-control border-2 border-press bg-card p-4"
                >
                    {t(`sync.problem_${sync.problem}`)}
                </p>
            )}
        </>
    );
}
