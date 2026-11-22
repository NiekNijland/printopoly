import { Fragment } from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
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
    /** The tabs this edition has, in order: the number keys follow them (bug 37, ronde 3). */
    tabNames?: readonly string[];
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
    tabNames,
}: ShortcutsDialogProps) {
    const t = useTranslation();
    const count = tabNames?.length ?? 4;
    const range = count === 1 ? '1' : `1…${String(count)}`;
    const describe = (id: string): string => {
        if (id !== 'tabs' || tabNames === undefined) {
            return t(`shortcuts.${id}`);
        }
        const names =
            tabNames.length < 2
                ? (tabNames[0] ?? '')
                : `${tabNames.slice(0, -1).join(', ')} ${t('shortcuts.or')} ${tabNames[tabNames.length - 1] ?? ''}`;

        return t('shortcuts.tabs_named', { names });
    };
    const keysOf = (id: string, keys: string[][]): string[][] =>
        id === 'tabs' ? [[range], ['Alt', range]] : keys;

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
                                            {describe(item.id)}
                                        </dt>
                                        <dd className="m-0 flex flex-none flex-wrap items-center justify-end gap-x-2 gap-y-1">
                                            {keysOf(item.id, item.keys).map(
                                                (combo, index) => (
                                                    <Fragment
                                                        key={combo.join('+')}
                                                    >
                                                        {index > 0 && (
                                                            <span className="text-sm text-ink-soft">
                                                                {t(
                                                                    'shortcuts.or',
                                                                )}
                                                            </span>
                                                        )}
                                                        <span className="inline-flex items-center gap-1">
                                                            {combo.map(
                                                                (key) => (
                                                                    <Kbd
                                                                        key={
                                                                            key
                                                                        }
                                                                    >
                                                                        {keyLabel(
                                                                            key,
                                                                        )}
                                                                    </Kbd>
                                                                ),
                                                            )}
                                                        </span>
                                                    </Fragment>
                                                ),
                                            )}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    ))}
                </div>

                <label className="mt-6 flex min-h-11 cursor-pointer items-start gap-3 text-base">
                    <Switch
                        className="mt-0.5 flex-none"
                        checked={plain}
                        onCheckedChange={onPlainChange}
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
