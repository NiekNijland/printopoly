import { Link } from '@inertiajs/react';
import type { ComponentProps } from 'react';

import {
    SegmentedTabs,
    SegmentedTabsList,
    SegmentedTabsTrigger,
} from '@/components/ui/segmented-tabs';
import { PartThumb } from '@/features/print/part-thumb';
import { useTranslation, useTranslationChoice } from '@/hooks/use-translation';
import type { Edition } from '@/lib/render/edition-types';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import type { PrintSet } from '@/types/generated';

type PrintHeaderProps = {
    edition: Edition;
    photos: PhotoInfos;
    editorHref: ComponentProps<typeof Link>['href'];
    name: string;
    parts: number;
    cards: number;
    set: PrintSet;
    onSet: (set: PrintSet) => void;
};

const SetSwitch = ({ set, onSet }: Pick<PrintHeaderProps, 'set' | 'onSet'>) => {
    const t = useTranslation();

    return (
        <div className="flex min-w-0 flex-col gap-2 md:max-w-md lg:max-w-sm lg:flex-none lg:self-end">
            <p id="print-set-hint" className="sr-only">
                {t('print.set_hint')}
            </p>
            {/* Each set names its shop right above its own tab. */}
            {/* The home set first: most people print at home or at a copy shop (B199). */}
            <div
                aria-hidden="true"
                className="grid grid-cols-2 gap-2 text-center text-xs leading-tight font-semibold text-ink-soft"
            >
                <span>{t('print.set_for.home')}</span>
                <span>{t('print.set_for.printer')}</span>
            </div>
            <SegmentedTabs
                value={set}
                onValueChange={(value) => {
                    onSet(value === 'printer' ? 'printer' : 'home');
                }}
            >
                <SegmentedTabsList
                    aria-label={t('print.set_tabs')}
                    aria-describedby="print-set-hint"
                >
                    <SegmentedTabsTrigger value="home">
                        {t('print.set.home')}
                    </SegmentedTabsTrigger>
                    <SegmentedTabsTrigger value="printer">
                        {t('print.set.printer')}
                    </SegmentedTabsTrigger>
                </SegmentedTabsList>
            </SegmentedTabs>
        </div>
    );
};

/** The edition on the table: its board as a proof, the name, the way back and the choice of set. */
export const PrintHeader = (props: PrintHeaderProps) => {
    const t = useTranslation();
    const tc = useTranslationChoice();
    const { edition, photos, name } = props;

    return (
        <header className="border-b-2 border-ink bg-board">
            <div className="mx-auto flex max-w-content flex-col gap-4 px-4 py-6 md:px-8 md:py-8 lg:flex-row lg:items-center lg:gap-8">
                <div className="flex items-center gap-4 lg:contents">
                    <span
                        aria-hidden="true"
                        className="flex size-16 flex-none -rotate-2 items-center justify-center border border-line-strong bg-card shadow-print md:size-32"
                    >
                        <span className="hidden md:block">
                            <PartThumb
                                part="board"
                                edition={edition}
                                size={124}
                                photos={photos}
                            />
                        </span>
                        <span className="md:hidden">
                            <PartThumb
                                part="board"
                                edition={edition}
                                size={60}
                                photos={photos}
                            />
                        </span>
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <Link
                            href={props.editorHref}
                            className="-my-1.5 inline-flex min-h-11 items-center self-start text-sm font-semibold no-underline hover:text-press"
                        >
                            ‹ {t('print.back_to_editor')}
                        </Link>
                        <h1 className="m-0 font-display text-2xl leading-none font-extrabold [overflow-wrap:anywhere] md:text-hero">
                            {name === ''
                                ? t('print.title')
                                : t('print.heading', { name })}
                        </h1>
                        <p className="m-0 hidden text-ink-soft md:block">
                            {tc('print.meta', props.parts, {
                                parts: props.parts,
                                cards: props.cards,
                            })}
                        </p>
                    </div>
                </div>
                {/* Which set suits which shop, right above the choice (B185). */}
                <SetSwitch set={props.set} onSet={props.onSet} />
            </div>
        </header>
    );
};
