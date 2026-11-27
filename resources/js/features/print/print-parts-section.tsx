import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

import { EXTRA_PARTS, GAME_PARTS } from '@/features/print/print-page-setup';
import { useTranslation } from '@/hooks/use-translation';
import type { SetPart } from '@/lib/render/print-selection';
import type { PrintSet } from '@/types/generated';

type PrintPartsSectionProps = {
    set: PrintSet;
    guideHref: string;
    rememberFailed: boolean;
    reusing: boolean;
    calibration: ReactNode;
    rowOf: (part: SetPart, index: number) => ReactNode;
};

const StatusLine = ({ children }: { children: ReactNode }) => (
    <p role="status" className="m-0 text-sm font-semibold text-ink-soft">
        {children}
    </p>
);

export const PrintPartsSection = (props: PrintPartsSectionProps) => {
    const t = useTranslation();
    const { rowOf } = props;

    return (
        <section
            aria-label={t('print.title')}
            className="flex min-w-0 flex-col gap-4"
        >
            <p className="m-0 max-w-prose">
                {t(`print.intro.${props.set}`)}{' '}
                {/* The guide explains each part; the page does not repeat it (B205). */}
                <Link
                    href={props.guideHref}
                    className="font-semibold underline underline-offset-4 hover:text-press"
                >
                    {t('print.guide_note')}
                </Link>
            </p>

            {props.rememberFailed && (
                <StatusLine>{t('print.remember_failed')}</StatusLine>
            )}

            {props.reusing && <StatusLine>{t('print.reusing')}</StatusLine>}

            <ul className="m-0 flex list-none flex-col gap-4 p-0">
                {/* The test sheet is made once, for home; what it says follows the set (R5-26). */}
                {props.calibration}
            </ul>

            <h2 className="m-0 mt-4 font-display text-2xl font-extrabold">
                {t('print.group.game')}
            </h2>
            <ul className="m-0 flex list-none flex-col gap-4 p-0">
                {GAME_PARTS.map((part, index) => rowOf(part, index))}
            </ul>

            <h2 className="m-0 mt-4 font-display text-2xl font-extrabold">
                {t('print.group.extra')}
            </h2>
            <ul className="m-0 flex list-none flex-col gap-4 p-0">
                {EXTRA_PARTS.map((part, index) =>
                    rowOf(part, index + GAME_PARTS.length),
                )}
            </ul>
        </section>
    );
};
