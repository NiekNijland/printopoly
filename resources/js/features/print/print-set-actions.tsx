import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
    ShareSetButton,
    type ShareFile,
} from '@/features/print/share-set-button';
import { useSmallPhone, useWideScreen } from '@/hooks/use-media-query';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import type { PrintSet } from '@/types/generated';

type PrintSetActionsProps = {
    set: PrintSet;
    allDone: boolean;
    blocked: boolean;
    busy: boolean;
    left: number;
    onMake: () => void;
    zipReady: boolean;
    zipUrl: string;
    shareFiles: boolean;
    files: () => ShareFile[];
    title: string;
};

const ZipButton = ({
    set,
    allDone,
    zipReady,
    zipUrl,
    shareFiles,
}: Pick<
    PrintSetActionsProps,
    'set' | 'allDone' | 'zipReady' | 'zipUrl' | 'shareFiles'
>) => {
    const t = useTranslation();
    const narrow = !useWideScreen();

    if (zipReady) {
        return (
            <Button
                asChild
                variant={
                    allDone && !(shareFiles && narrow) ? 'primary' : 'secondary'
                }
                className={cn(!(allDone && shareFiles) && 'max-md:flex-1')}
            >
                <a href={zipUrl} aria-label={t(`print.zip.${set}`)}>
                    {/* The long label ran over the edge of a phone (bug 8 of test round 4). */}
                    <span className="md:hidden">
                        {allDone && shareFiles
                            ? t('print.zip_tiny')
                            : t('print.zip_short')}
                    </span>
                    <span className="max-md:hidden">
                        {t(`print.zip.${set}`)}
                    </span>
                </a>
            </Button>
        );
    }

    return allDone ? (
        // Everything is made, the order sheet is not yet: the ZIP waits for it (R5-25).
        <Button variant="secondary" disabled className="gap-2 max-md:flex-1">
            <Spinner aria-hidden="true" />
            {t('print.zip_preparing')}
        </Button>
    ) : (
        <Button
            variant="secondary"
            disabled
            className={
                // A phone, also on its side, shows the download only once it can be used: the bar
                // stays one row and the estimate keeps its room (B179).
                'max-md:hidden low:hidden'
            }
        >
            {t(`print.zip.${set}`)}
        </Button>
    );
};

/** The main route stays in reach: make the set, then download it. */
export const PrintSetActions = (props: PrintSetActionsProps) => {
    const t = useTranslation();
    const smallPhone = useSmallPhone();
    const { set, allDone, left } = props;

    return (
        <>
            <Button
                variant={allDone ? 'secondary' : 'primary'}
                // When all is done the download takes its place on a phone: one row of buttons.
                className={allDone ? 'max-md:hidden' : 'max-md:flex-1'}
                disabled={props.blocked || left === 0 || allDone}
                onClick={props.onMake}
            >
                {props.busy && left === 0 && !allDone
                    ? t('print.working')
                    : smallPhone
                      ? t('print.make_set_short')
                      : t(`print.make_set.${set}`)}
            </Button>
            {/* On a phone that can hand files to another app the set goes out file by file: Android does not
                open a ZIP (R5-30). The ZIP stays next to it, small. */}
            {props.zipReady && allDone && props.shareFiles && (
                <ShareSetButton
                    files={props.files()}
                    title={props.title}
                    short={smallPhone}
                    className="flex-1 md:hidden"
                />
            )}
            <ZipButton {...props} />
        </>
    );
};
