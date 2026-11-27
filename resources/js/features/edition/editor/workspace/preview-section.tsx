import type { ReactNode } from 'react';

import { ChevronDownIcon } from '@/components/ui/icons';
import {
    SegmentedTabs,
    SegmentedTabsList,
    SegmentedTabsTrigger,
} from '@/components/ui/segmented-tabs';
import { useTranslation } from '@/hooks/use-translation';
import { cardBackKey, cardKey } from '@/lib/render/edition-keys';
import { cn } from '@/lib/utils';

type FoldBarProps = {
    folded: boolean;
    label: string;
    onToggle: () => void;
};

// Phone and tablet upright: a bar under the preview folds it to one line and brings it back. It
// sits in the flow under the hints, never on top of them (bug 29, UX 5).
const FoldBar = ({ folded, label, onToggle }: FoldBarProps) => {
    const t = useTranslation();

    return (
        <button
            type="button"
            aria-expanded={!folded}
            onClick={onToggle}
            data-fold
            className={cn(
                'order-last flex min-h-11 w-full flex-none cursor-pointer items-center gap-2 border-0 text-sm font-semibold text-ink',
                folded
                    ? 'bg-card px-4 text-left'
                    : '-mx-4 -mb-4 w-[calc(100%+2rem)] justify-center border-t border-line bg-paper/70',
            )}
        >
            <ChevronDownIcon
                size={16}
                aria-hidden="true"
                className={cn('flex-none', !folded && 'rotate-180')}
            />
            {folded ? (
                <>
                    <span className="flex-none">
                        {t('editor.preview_show')}
                    </span>
                    <span className="min-w-0 truncate font-normal text-ink-soft">
                        {label}
                    </span>
                </>
            ) : (
                t('editor.preview_fold')
            )}
        </button>
    );
};

export const CardSideTabs = ({
    deck,
    back,
    onSelect,
}: {
    deck: 'chance' | 'chest';
    back: boolean;
    onSelect: (key: string) => void;
}) => {
    const t = useTranslation();

    return (
        <SegmentedTabs
            value={back ? 'back' : 'front'}
            onValueChange={(value) =>
                onSelect(
                    value === 'back' ? cardBackKey(deck) : cardKey(deck, 1),
                )
            }
            className="self-center"
        >
            <SegmentedTabsList aria-label={t('editor.card_side')}>
                <SegmentedTabsTrigger value="front">
                    {t('editor.side_front')}
                </SegmentedTabsTrigger>
                <SegmentedTabsTrigger value="back">
                    {t('editor.side_back')}
                </SegmentedTabsTrigger>
            </SegmentedTabsList>
        </SegmentedTabs>
    );
};

export const DeedViewTabs = ({
    deed,
    onDeedView,
}: {
    deed: boolean;
    onDeedView: (deed: boolean) => void;
}) => {
    const t = useTranslation();

    return (
        <SegmentedTabs
            value={deed ? 'deed' : 'space'}
            onValueChange={(value) => onDeedView(value === 'deed')}
            className="self-center"
        >
            <SegmentedTabsList aria-label={t('editor.view')}>
                <SegmentedTabsTrigger value="space">
                    {t('editor.view_space')}
                </SegmentedTabsTrigger>
                <SegmentedTabsTrigger
                    value="deed"
                    aria-label={t('editor.view_deed')}
                >
                    {/* The middle column of a small desktop is narrow: a short word there (bug 39). */}
                    <span className="lg:max-xl:hidden phone-low:hidden tablet-low:hidden">
                        {t('editor.view_deed')}
                    </span>
                    <span
                        aria-hidden="true"
                        className="hidden lg:max-xl:inline phone-low:inline tablet-low:inline"
                    >
                        {t('editor.view_deed_short')}
                    </span>
                </SegmentedTabsTrigger>
            </SegmentedTabsList>
        </SegmentedTabs>
    );
};

type PreviewSectionProps = {
    mobileElement: boolean;
    editionOpen: boolean;
    foldable: boolean;
    folded: boolean;
    label: string;
    centerHint: boolean;
    onToggleFold: () => void;
    tabs: ReactNode;
    stage: ReactNode;
};

export const PreviewSection = (props: PreviewSectionProps) => {
    const t = useTranslation();
    const { mobileElement, editionOpen, folded } = props;

    return (
        <section
            aria-label={t('editor.preview')}
            data-preview
            tabIndex={-1}
            data-folded={folded ? 'true' : undefined}
            className={cn(
                'relative min-h-0 flex-col gap-3 p-4 outline-none md:col-start-2 md:row-start-1 md:flex phone-low:col-start-1 phone-low:row-start-1',
                mobileElement
                    ? cn(
                          'flex shrink-0 in-data-[keyboard=open]:h-auto in-data-[keyboard=open]:min-h-0',
                          folded
                              ? 'h-auto min-h-0'
                              : editionOpen
                                ? 'h-[30dvh] max-h-64 min-h-44'
                                : 'h-[36dvh] max-h-80 min-h-56',
                      )
                    : 'hidden',
                // A phone on its side: the preview fills the left column next to the fields.
                'phone-low:h-auto phone-low:max-h-none phone-low:min-h-0 phone-low:p-2',
                // Tablet: on top of the panel, a third of the screen at most.
                'tablet-tall:max-h-none tablet-tall:border-b-2 tablet-tall:border-ink',
                folded
                    ? // Folded: only the bar that brings it back (phone and tablet).
                      'gap-0 border-b-2 border-ink bg-card p-0 tablet-tall:h-auto tablet-tall:min-h-0 [&>*:not([data-fold])]:hidden'
                    : 'tablet-tall:h-[min(36dvh,24rem)] tablet-tall:min-h-56',
                // A low tablet screen (a big phone on its side): the preview in the middle column.
                'tablet-low:h-auto tablet-low:max-h-none tablet-low:min-h-0 tablet-low:p-2',
                'lg:col-start-2 lg:row-start-1 lg:h-auto lg:max-h-none lg:min-h-0',
            )}
        >
            {props.foldable && (
                <FoldBar
                    folded={folded}
                    label={props.label}
                    onToggle={props.onToggleFold}
                />
            )}
            {props.tabs}
            {props.stage}
            {props.centerHint && (
                <p className="m-0 text-center text-sm text-ink-soft">
                    {t('editor.center_hint')}
                </p>
            )}
        </section>
    );
};
