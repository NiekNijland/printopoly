import { Head, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

import { BoardNavigator } from '@/components/editor/board-navigator';
import {
    ElementPreview,
    previewSize,
} from '@/components/editor/element-preview';
import { ElementStage } from '@/components/editor/element-stage';
import { Button } from '@/components/ui/button';
import {
    SegmentedTabs,
    SegmentedTabsList,
    SegmentedTabsTrigger,
} from '@/components/ui/segmented-tabs';
import { sampleEdition } from '@/data/sample-edition';
import { useServices } from '@/hooks/use-editions';
import { useTranslation } from '@/hooks/use-translation';
import { resolveEdition } from '@/lib/edition/resolve';
import { deedKeyForSpace, elementLabel } from '@/lib/editor/catalogue';
import { show as editorShow } from '@/routes/editor';

const NO_WARNINGS: ReadonlySet<string> = new Set();

type View = 'space' | 'deed' | 'chance' | 'chest';

/** "Voorbeeld bekijken" (B97): the sample edition, read-only, with a button that copies it into a new local edition. */
export default function EditionsSample() {
    const t = useTranslation();
    const { locale } = usePage().props;
    const { repository } = useServices();
    const edition = useMemo(() => sampleEdition(locale), [locale]);
    const resolved = useMemo(() => resolveEdition(edition), [edition]);
    const [key, setKey] = useState('space.01');
    const [view, setView] = useState<View>('space');
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);

    const position = /^space\.(\d{2})$/.exec(key) === null ? undefined : key;
    const hasDeed =
        position !== undefined &&
        deedKeyForSpace(Number(position.split('.')[1])) !== undefined;
    const shown =
        view === 'chance'
            ? 'card.chance.01'
            : view === 'chest'
              ? 'card.chest.01'
              : key;
    const target = { key: shown, deed: view === 'deed' && hasDeed };
    const size = previewSize(target, edition);

    const start = (): void => {
        if (busy) {
            return;
        }
        setBusy(true);
        setFailed(false);
        repository
            .createFrom(edition)
            .then((created) =>
                router.visit(editorShow({ locale, edition: created.id })),
            )
            .catch(() => {
                setFailed(true);
                setBusy(false);
            });
    };

    return (
        <>
            <Head title={t('sample.title')} />
            <main className="mx-auto flex max-w-content flex-col gap-6 px-4 py-8 md:px-8 md:py-12">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="max-w-[40em]">
                        <h1 className="m-0 font-display text-3xl font-extrabold">
                            {t('sample.heading', { name: edition.name })}
                        </h1>
                        <p className="mt-2 mb-0 text-ink-soft">
                            {t('sample.intro')}
                        </p>
                    </div>
                    <Button onClick={start} disabled={busy}>
                        {t('sample.use')}
                    </Button>
                </div>
                {failed && (
                    <p role="alert" className="m-0 text-press">
                        {t('sample.failed')}
                    </p>
                )}

                <div className="grid gap-6 md:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
                    <div className="flex flex-col gap-4">
                        <BoardNavigator
                            edition={edition}
                            interfaceLanguage={locale}
                            selected={key}
                            warned={NO_WARNINGS}
                            onSelect={(next) => {
                                setKey(next);
                                setView('space');
                            }}
                        />
                        <p className="m-0 font-semibold">
                            {elementLabel(key, edition, locale)}
                        </p>
                    </div>
                    <div className="flex min-w-0 flex-col gap-3">
                        <SegmentedTabs
                            value={view}
                            onValueChange={(value) => setView(value as View)}
                            className="self-center"
                        >
                            <SegmentedTabsList aria-label={t('editor.view')}>
                                <SegmentedTabsTrigger value="space">
                                    {t('editor.tab_board')}
                                </SegmentedTabsTrigger>
                                {hasDeed && (
                                    <SegmentedTabsTrigger value="deed">
                                        {t('editor.view_deed')}
                                    </SegmentedTabsTrigger>
                                )}
                                <SegmentedTabsTrigger value="chance">
                                    {t('sample.chance')}
                                </SegmentedTabsTrigger>
                                <SegmentedTabsTrigger value="chest">
                                    {t('sample.chest')}
                                </SegmentedTabsTrigger>
                            </SegmentedTabsList>
                        </SegmentedTabs>
                        <div className="flex h-[420px] min-h-0 flex-col rounded-control bg-table md:h-[560px]">
                            <ElementStage widthMm={size.w} heightMm={size.h}>
                                <ElementPreview
                                    target={target}
                                    resolved={resolved}
                                    photos={new Map()}
                                    placeholder={false}
                                />
                            </ElementStage>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}
