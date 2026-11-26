import { useState } from 'react';

import { Button } from '@/components/ui/button';
import type { CollectionBox } from '@/features/edition/boxes/use-collection-box';
import { useTranslation } from '@/hooks/use-translation';

type Confirming = 'delete' | 'renew';

const LINK_BUTTON =
    'min-h-11 cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold underline underline-offset-4 disabled:cursor-default disabled:opacity-40';

const ConfirmBox = ({
    confirming,
    busy,
    onYes,
    onCancel,
}: {
    confirming: Confirming;
    busy: boolean;
    onYes: () => void;
    onCancel: () => void;
}) => {
    const t = useTranslation();

    return (
        <div
            role="alertdialog"
            aria-label={t(
                confirming === 'delete' ? 'collect.delete' : 'collect.renew',
            )}
            className={`flex flex-col gap-3 rounded-control border-2 p-4 ${confirming === 'delete' ? 'border-press' : 'border-ink'}`}
        >
            <p className="m-0 font-semibold">
                {t(
                    confirming === 'delete'
                        ? 'collect.delete_confirm'
                        : 'collect.renew_confirm',
                )}
            </p>
            <div className="flex flex-wrap gap-2">
                <Button variant="secondary" disabled={busy} onClick={onYes}>
                    {t(
                        confirming === 'delete'
                            ? 'collect.delete_yes'
                            : 'collect.renew_yes',
                    )}
                </Button>
                <Button variant="ghost" onClick={onCancel}>
                    {t('collect.cancel')}
                </Button>
            </div>
        </div>
    );
};

export const TogetherManage = ({
    collect,
    closed,
    failed,
}: {
    collect: CollectionBox;
    closed: boolean;
    failed: string | null;
}) => {
    const t = useTranslation();
    const [confirming, setConfirming] = useState<Confirming | null>(null);

    return (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
            <h4 className="m-0 text-sm font-semibold">
                {t('edition_panel.manage')}
            </h4>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                {!closed && (
                    <button
                        type="button"
                        disabled={collect.busy}
                        onClick={() => {
                            setConfirming(null);
                            void collect.close().catch(() => undefined);
                        }}
                        className={LINK_BUTTON}
                    >
                        {t('collect.close')}
                    </button>
                )}
                <button
                    type="button"
                    disabled={collect.busy}
                    aria-expanded={confirming === 'renew'}
                    onClick={() => {
                        setConfirming('renew');
                    }}
                    className={LINK_BUTTON}
                >
                    {t('collect.renew')}
                </button>
                <button
                    type="button"
                    disabled={collect.busy}
                    aria-expanded={confirming === 'delete'}
                    onClick={() => {
                        setConfirming('delete');
                    }}
                    className={`${LINK_BUTTON} ml-auto text-press`}
                >
                    {t('collect.delete')}
                </button>
            </div>
            {confirming !== null && (
                <ConfirmBox
                    confirming={confirming}
                    busy={collect.busy}
                    onYes={() => {
                        setConfirming(null);
                        void (
                            confirming === 'delete'
                                ? collect.remove()
                                : collect.renew()
                        ).catch(() => undefined);
                    }}
                    onCancel={() => setConfirming(null)}
                />
            )}
            {failed !== null && (
                <p
                    role="alert"
                    className="m-0 text-sm font-semibold text-press"
                >
                    {failed}
                </p>
            )}
        </div>
    );
};
