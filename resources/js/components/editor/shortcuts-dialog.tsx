import { Fragment } from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/hooks/use-translation';
import {
    SHORTCUTS,
    keyLabel,
    type ShortcutGroup,
} from '@/lib/editor/shortcuts';

const GROUPS: ShortcutGroup[] = ['navigate', 'photo', 'edit', 'general'];

interface ShortcutsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    plain: boolean;
    onPlainChange: (plain: boolean) => void;
}

function Kbd({ children }: { children: string }) {
    return (
        <kbd className="inline-flex min-h-7 min-w-7 items-center justify-center rounded-control border-2 border-ink bg-paper px-1.5 font-mono text-xs font-medium text-ink">
            {children}
        </kbd>
    );
}

/** The "Sneltoetsen" help dialog, opened with `?` or from the editor header. */
export function ShortcutsDialog({
    open,
    onOpenChange,
    plain,
    onPlainChange,
}: ShortcutsDialogProps) {
    const t = useTranslation();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogTitle>{t('shortcuts.title')}</DialogTitle>
                <DialogDescription>{t('shortcuts.lead')}</DialogDescription>

                <div className="mt-6 flex flex-col gap-6">
                    {GROUPS.map((group) => (
                        <section key={group} className="flex flex-col gap-2">
                            <h3 className="m-0 font-display text-lg font-extrabold">
                                {t(`shortcuts.group_${group}`)}
                            </h3>
                            <dl className="m-0 flex flex-col">
                                {SHORTCUTS.filter(
                                    (item) => item.group === group,
                                ).map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between gap-4 border-t border-ink/20 py-2 first:border-t-0"
                                    >
                                        <dt className="min-w-0 text-base">
                                            {t(`shortcuts.${item.id}`)}
                                        </dt>
                                        <dd className="m-0 flex flex-none flex-wrap items-center justify-end gap-x-2 gap-y-1">
                                            {item.keys.map((combo, index) => (
                                                <Fragment key={combo.join('+')}>
                                                    {index > 0 && (
                                                        <span className="text-sm text-ink-soft">
                                                            {t('shortcuts.or')}
                                                        </span>
                                                    )}
                                                    <span className="inline-flex items-center gap-1">
                                                        {combo.map((key) => (
                                                            <Kbd key={key}>
                                                                {keyLabel(key)}
                                                            </Kbd>
                                                        ))}
                                                    </span>
                                                </Fragment>
                                            ))}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    ))}
                </div>

                <label className="mt-6 flex min-h-11 items-start gap-3 text-base">
                    <input
                        type="checkbox"
                        className="mt-0.5 size-5 flex-none accent-ink"
                        checked={plain}
                        onChange={(event) =>
                            onPlainChange(event.target.checked)
                        }
                    />
                    <span>
                        {t('shortcuts.plain')}
                        <span className="block text-sm text-ink-soft">
                            {t('shortcuts.plain_hint')}
                        </span>
                    </span>
                </label>

                <div className="mt-6 flex justify-end">
                    <DialogClose asChild>
                        <Button>{t('app.done')}</Button>
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    );
}
