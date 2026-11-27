import { Button } from '@/components/ui/button';
import { ShareSetButton } from '@/features/print/share-set-button';
import { useTranslation } from '@/hooks/use-translation';
import { reportError } from '@/lib/bugsnag';
import type { PrintPart, PrintPartStatusData } from '@/types/generated';

const actionLabel = (
    status: 'idle' | 'failed',
    t: (key: string) => string,
    trial: boolean,
): string => {
    if (status === 'failed') {
        return t('print.retry');
    }

    return trial ? t('print.make_trial') : t('print.make_part');
};

const shareLink = (name: string, url: string): void => {
    void navigator
        .share({
            title: name,
            url: new URL(url, window.location.href).href,
        })
        .catch((error: unknown) => {
            // Closing the share sheet is no error.
            if (!(
                error instanceof DOMException && error.name === 'AbortError'
            )) {
                reportError(error);
            }
        });
};

const DoneActions = ({
    part,
    name,
    row,
    shareFiles,
}: {
    part: PrintPart;
    name: string;
    row: PrintPartStatusData;
    shareFiles: boolean;
}) => {
    const t = useTranslation();
    const canShare =
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function';

    return (
        <>
            {row.downloadUrl != null && (
                <Button variant="secondary" asChild>
                    <a
                        href={row.downloadUrl}
                        aria-label={t('print.pdf_of', { part: name })}
                    >
                        {t('print.pdf')}
                    </a>
                </Button>
            )}
            {row.imageUrl != null && shareFiles && (
                // A part with a picture (the invitation) shares the picture itself, not a link to the PDF:
                // a group app shows a picture at once (R6 Sara).
                <ShareSetButton
                    files={[
                        {
                            url: row.imageUrl,
                            name: `${part}.png`,
                            type: 'image/png',
                        },
                    ]}
                    title={name}
                    short
                    variant="secondary"
                    label={t('print.share_image_of', { part: name })}
                    className="md:hidden"
                />
            )}
            {row.downloadUrl != null &&
                canShare &&
                !(row.imageUrl != null && shareFiles) && (
                    <Button
                        variant="secondary"
                        className="md:hidden"
                        aria-label={t('print.share_of', { part: name })}
                        onClick={() => {
                            shareLink(name, row.downloadUrl ?? '');
                        }}
                    >
                        {t('print.share')}
                    </Button>
                )}
            {row.imageUrl != null && (
                <Button variant="secondary" asChild>
                    <a
                        href={row.imageUrl}
                        aria-label={t('print.png_of', { part: name })}
                    >
                        {t('print.png')}
                    </a>
                </Button>
            )}
        </>
    );
};

type PartActionsProps = {
    part: PrintPart;
    name: string;
    row: PrintPartStatusData | undefined;
    status: PrintPartStatusData['status'];
    skipped: boolean;
    inLine: boolean;
    trial: boolean;
    disabled: boolean;
    shareFiles: boolean;
    guideHref: string | undefined;
    onMake: () => void;
    onUnqueue: (() => void) | undefined;
};

export const PartActions = ({
    part,
    name,
    row,
    status,
    skipped,
    inLine,
    trial,
    disabled,
    shareFiles,
    guideHref,
    onMake,
    onUnqueue,
}: PartActionsProps) => {
    const t = useTranslation();
    return (
        <span className="flex flex-wrap gap-3">
            {inLine && (
                <Button
                    variant="link"
                    onClick={onUnqueue}
                    aria-label={`${t('print.unqueue')}: ${name}`}
                >
                    {t('print.unqueue')}
                </Button>
            )}
            {!skipped &&
                !inLine &&
                // A part made before a change is made again by itself, without a button (Niek, 22 nov).
                (status === 'idle' || status === 'failed') && (
                    // Making a part is the same kind of action everywhere on the page, so it has one look: the
                    // secondary button, as Proefvel maken (R6 Tom). The set button in the bar is the primary one.
                    <Button
                        variant="secondary"
                        onClick={onMake}
                        disabled={disabled}
                        aria-label={`${actionLabel(status, t, trial)}: ${name}`}
                    >
                        {actionLabel(status, t, trial)}
                    </Button>
                )}
            {status === 'done' && row !== undefined && (
                <DoneActions
                    part={part}
                    name={name}
                    row={row}
                    shareFiles={shareFiles}
                />
            )}
            {guideHref !== undefined && (
                <Button variant="link" asChild>
                    <a
                        href={guideHref}
                        aria-label={t('print.guide_link_of', {
                            part: name,
                        })}
                    >
                        {t('print.guide_link')}
                    </a>
                </Button>
            )}
        </span>
    );
};
