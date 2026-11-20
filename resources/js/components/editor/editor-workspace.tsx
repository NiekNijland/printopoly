import { Link, usePage } from '@inertiajs/react';
import {
    useEffect,
    useMemo,
    useState,
    useSyncExternalStore,
    type ReactNode,
} from 'react';

import { BoardList, BoardNavigator } from '@/components/editor/board-navigator';
import { CheckPanel } from '@/components/editor/check-panel';
import { useChecks } from '@/components/editor/check-probe';
import { ConflictDialog } from '@/components/editor/conflict-dialog';
import { ElementList } from '@/components/editor/element-list';
import { ElementPanel } from '@/components/editor/element-panel';
import {
    ElementPreview,
    previewSize,
} from '@/components/editor/element-preview';
import { ElementStage } from '@/components/editor/element-stage';
import { LayerOverlay } from '@/components/editor/layer-overlay';
import { SettingsDialog } from '@/components/editor/settings-dialog';
import {
    ChevronLeftIcon,
    RedoIcon,
    UndoIcon,
    WarningIcon,
} from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
    SegmentedTabs,
    SegmentedTabsList,
    SegmentedTabsTrigger,
} from '@/components/ui/segmented-tabs';
import { useSaveStatus, useSessionSnapshot } from '@/hooks/use-edition-session';
import { useServices } from '@/hooks/use-editions';
import { useRemotePush } from '@/hooks/use-remote-push';
import { useTranslation } from '@/hooks/use-translation';
import EditorLayout from '@/layouts/editor-layout';
import {
    ALLOWED_FIELDS,
    cardBackKey,
    cardKey,
    parseKey,
    spaceKey,
} from '@/lib/edition/keys';
import { usedPhotoIds } from '@/lib/edition/repository';
import { resolveEdition } from '@/lib/edition/resolve';
import type { EditionSession } from '@/lib/edition/session';
import {
    BOARD_ORDER,
    deedKeyForSpace,
    elementLabel,
    firstKey,
    spacePosition,
    stepKey,
    tabCounts,
    tabKeys,
    tabOfKey,
    visibleTabs,
    type EditorTab,
} from '@/lib/editor/catalogue';
import { readProbe } from '@/lib/editor/checks-input';
import { editElement } from '@/lib/editor/edit';
import { centerZones, replaceLayer } from '@/lib/editor/layers';
import { lookupResolved } from '@/lib/editor/lookup';
import { PhotoCache } from '@/lib/editor/photo-cache';
import {
    FULL_BLEED_MM,
    actOnPlacement,
    type PlacementAction,
    type PlacementContext,
} from '@/lib/editor/placements';
import type { Size } from '@/lib/print/types';
import { cn } from '@/lib/utils';
import { redirect as googleRedirect } from '@/routes/auth/google';
import {
    index as editionsIndex,
    print as editionsPrint,
} from '@/routes/editions';

const TAB_LABEL: Record<EditorTab, string> = {
    board: 'editor.tab_board',
    cards: 'editor.tab_cards',
    money: 'editor.tab_money',
    box: 'editor.tab_box',
};

function sameSize(a: Size | null, b: Size | null): boolean {
    return a === b || (a !== null && b !== null && a.w === b.w && a.h === b.h);
}

interface EditorWorkspaceProps {
    session: EditionSession;
}

/**
 * The editor (B73, B93): tabs per part, the board as navigator, the chosen element large in the
 * middle, and its fields on the right. On a phone the overview and the element are two screens.
 */
export function EditorWorkspace({ session }: EditorWorkspaceProps) {
    const t = useTranslation();
    const { locale, auth } = usePage().props;
    const { repository } = useServices();
    const { edition, canUndo, canRedo, conflict, deletedElsewhere } =
        useSessionSnapshot(session);
    const push = useRemotePush(session);
    const { text: saveText } = useSaveStatus(session, {
        loggedIn: push.loggedIn,
        pendingSync: push.pending,
        syncedAt: push.syncedAt,
    });

    const [selectedKey, setSelectedKey] = useState('space.01');
    const [deedView, setDeedView] = useState(false);
    const [checkOpen, setCheckOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [mobileElement, setMobileElement] = useState(false);
    const [announcement, setAnnouncement] = useState('');
    const [measured, setMeasured] = useState<Size | null>(null);
    const [layerSel, setLayerSel] = useState<{
        key: string;
        id: string | null;
    }>({ key: '', id: null });

    const resolved = useMemo(() => resolveEdition(edition), [edition]);
    const [cache] = useState(
        () => new PhotoCache((id) => repository.getPhoto(id)),
    );
    const photos = useSyncExternalStore(cache.subscribe, cache.getSnapshot);
    const photoIds = [...usedPhotoIds(edition.elements)].sort().join(',');

    useEffect(() => {
        cache.request(photoIds === '' ? [] : photoIds.split(','));
    }, [cache, photoIds]);
    useEffect(() => () => cache.dispose(), [cache]);

    const { issues, probe } = useChecks(edition, photos);

    // Warnings per element; a deed's warning also marks its space on the board.
    const warned = useMemo(() => {
        const keys = new Set<string>();
        for (const issue of issues) {
            keys.add(issue.elementKey);
            if (parseKey(issue.elementKey)?.kind === 'deed') {
                const index = Number(issue.elementKey.split('.')[1]);
                resolved.deeds
                    ?.filter((deed) => deed.index === index)
                    .forEach((deed) => keys.add(spaceKey(deed.space.position)));
            }
        }

        return keys;
    }, [issues, resolved]);

    // A key that is no longer in a visible part (switched off in the settings) falls back to the board.
    const tabs = visibleTabs(edition.parts);
    const activeTab = tabOfKey(selectedKey);
    const valid =
        tabs.includes(activeTab) &&
        tabKeys(activeTab, edition.parts, edition.elements).includes(
            selectedKey,
        );
    const key = valid ? selectedKey : 'space.01';
    const tab = tabOfKey(key);
    const position = spacePosition(key);
    const deedKey =
        position === undefined || !edition.parts.deeds
            ? undefined
            : deedKeyForSpace(position);
    const showDeed = deedView && deedKey !== undefined;
    const editKey = showDeed ? deedKey : key;
    const target = { key, deed: showDeed };
    const editKind = parseKey(editKey)?.kind;
    const hasLayers =
        editKind !== undefined && ALLOWED_FIELDS[editKind].includes('layers');
    const layerId = layerSel.key === editKey ? layerSel.id : null;
    const layers = edition.elements[editKey]?.layers ?? [];

    const part = lookupResolved(resolved, editKey);
    const layout = part?.layout ?? 'text';
    const photo = part?.photo;
    const bleed = layout === 'full' && photo !== undefined ? FULL_BLEED_MM : 0;
    const size = previewSize(target, edition);

    const info = photo === undefined ? undefined : photos.get(photo.photoId);
    const frame =
        measured === null
            ? null
            : { w: measured.w - 2 * bleed, h: measured.h - 2 * bleed };
    const context: PlacementContext | null =
        info !== undefined && frame !== null
            ? {
                  source: { w: info.width, h: info.height },
                  frame,
                  bleed: layout === 'full' ? FULL_BLEED_MM : 0,
              }
            : null;

    const select = (next: string): void => {
        setSelectedKey(next);
        setDeedView(false);
        setCheckOpen(false);
        setMobileElement(true);
    };

    const act = (action: PlacementAction, text?: string): void => {
        if (photo === undefined || context === null) {
            return;
        }
        editElement(
            session,
            editKey,
            { photo: actOnPlacement(photo, context, action) },
            `photo:${editKey}`,
        );
        if (text !== undefined) {
            setAnnouncement(text);
        }
    };

    const zoomText = (scale: number): string =>
        t('editor.zoom_announce', { percent: Math.round(scale * 100) });

    const tabKeyList = tabKeys(tab, edition.parts, edition.elements);
    const siblings = tabKeyList.slice(tabKeyList.indexOf(key) + 1);
    const neighbours = (step: 1 | -1) =>
        stepKey(tab === 'board' ? BOARD_ORDER : tabKeyList, key, step);

    const label = elementLabel(key, edition, locale);
    const kind = parseKey(key)?.kind;
    const subtitle = t(`editor.kind_${kind ?? 'space'}`);
    const printHref = editionsPrint({ locale, edition: edition.id }).url;

    const saveStatus: ReactNode = (
        <>
            {saveText.message}
            {saveText.actionLabel !== null &&
                auth.user === null &&
                auth.googleLoginEnabled && (
                    <>
                        {' · '}
                        <a
                            href={googleRedirect().url}
                            className="font-semibold"
                        >
                            {saveText.actionLabel}
                        </a>
                    </>
                )}
        </>
    );

    const measureFrame = (node: HTMLDivElement | null): void => {
        if (node === null) {
            return;
        }
        const next = readProbe(node).frame;
        setMeasured((previous) => (sameSize(previous, next) ? previous : next));
    };

    const canGesture = photo !== undefined && context !== null;
    const gestures = canGesture
        ? {
              label: t('editor.photo_frame_label'),
              announcement,
              onPan: (dxMm: number, dyMm: number) =>
                  act({ type: 'pan', dxMm, dyMm }),
              onNudge: (direction: 'left' | 'right' | 'up' | 'down') =>
                  act(
                      { type: 'nudge', direction },
                      t('editor.moved', {
                          direction: t(`editor.dir_${direction}`),
                      }),
                  ),
              onZoomFactor: (factor: number) =>
                  act({
                      type: 'zoom-to',
                      scale: photo.scale * factor,
                  }),
              onZoomStep: (direction: 1 | -1) =>
                  act(
                      { type: 'zoom-by', delta: 0.1 * direction },
                      zoomText(
                          Math.min(
                              3,
                              Math.max(1, photo.scale + 0.1 * direction),
                          ),
                      ),
                  ),
          }
        : undefined;

    return (
        <EditorLayout
            editionName={edition.name}
            saveStatus={saveStatus}
            checkCount={issues.length}
            checkOpen={checkOpen}
            printHref={printHref}
            canUndo={canUndo}
            canRedo={canRedo}
            onOpenSettings={() => setSettingsOpen(true)}
            onToggleCheck={() => setCheckOpen((open) => !open)}
            onUndo={() => session.undo()}
            onRedo={() => session.redo()}
        >
            <div className="relative flex h-full min-h-0 flex-col md:grid md:grid-cols-[minmax(280px,340px)_minmax(0,1fr)_minmax(300px,360px)]">
                {deletedElsewhere && (
                    <p
                        role="alert"
                        className="absolute inset-x-0 top-0 z-40 m-0 border-b-2 border-ink bg-warning px-4 py-3 text-sm"
                    >
                        {t('editor.deleted_elsewhere')}{' '}
                        <Link
                            href={editionsIndex(locale)}
                            className="font-semibold"
                        >
                            {t('editor.back_to_editions')}
                        </Link>
                    </p>
                )}
                {push.problem !== null && (
                    <p
                        role="alert"
                        className="absolute inset-x-0 top-0 z-40 m-0 border-b-2 border-ink bg-warning px-4 py-3 text-sm"
                    >
                        {t(`editor.sync_${push.problem}`)}
                    </p>
                )}
                {checkOpen && (
                    <CheckPanel
                        issues={issues}
                        edition={edition}
                        locale={locale}
                        onOpen={select}
                    />
                )}

                <nav
                    aria-label={t('editor.parts_nav')}
                    className={cn(
                        'min-h-0 flex-col gap-4 overflow-auto border-r-2 border-ink p-4 md:flex',
                        mobileElement ? 'hidden' : 'flex',
                    )}
                >
                    <p className="m-0 text-sm text-ink-soft md:hidden">
                        {saveStatus}
                    </p>
                    <div className="flex flex-col gap-1">
                        <div
                            role="tablist"
                            aria-label={t('editor.part')}
                            className="grid grid-cols-4 overflow-hidden rounded-control border-2 border-ink bg-card md:grid-cols-2 md:gap-2 md:overflow-visible md:border-0 md:bg-transparent"
                        >
                            {tabs.map((id) => {
                                const counts = tabCounts(id, edition);

                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        role="tab"
                                        aria-selected={id === tab}
                                        onClick={() => {
                                            const first = firstKey(
                                                id,
                                                edition.parts,
                                                edition.elements,
                                            );
                                            if (first !== undefined) {
                                                setSelectedKey(first);
                                                setDeedView(false);
                                            }
                                        }}
                                        className={cn(
                                            'flex min-h-11 cursor-pointer items-center justify-center border-0 px-1 text-sm font-semibold md:justify-between md:rounded-control md:border-2 md:border-ink md:px-3',
                                            id === tab
                                                ? 'bg-ink text-paper'
                                                : 'bg-card text-ink',
                                        )}
                                    >
                                        {id === 'box' ? (
                                            <>
                                                <span className="md:hidden">
                                                    {t('editor.tab_box_short')}
                                                </span>
                                                <span className="hidden md:inline">
                                                    {t(TAB_LABEL[id])}
                                                </span>
                                            </>
                                        ) : (
                                            t(TAB_LABEL[id])
                                        )}
                                        <span className="hidden font-mono text-xs font-normal md:inline">
                                            {counts.customized}/{counts.total}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            type="button"
                            onClick={() => setSettingsOpen(true)}
                            className="min-h-10 cursor-pointer self-start border-0 bg-transparent p-0 text-sm font-semibold underline underline-offset-4"
                        >
                            {t('editor.choose_parts')}
                        </button>
                    </div>

                    {tab === 'board' ? (
                        <>
                            <BoardNavigator
                                edition={edition}
                                interfaceLanguage={locale}
                                selected={key}
                                onSelect={(next) => {
                                    setSelectedKey(next);
                                    setDeedView(false);
                                }}
                                warned={warned}
                            />
                            <BoardList
                                edition={edition}
                                interfaceLanguage={locale}
                                selected={key}
                                onSelect={select}
                                warned={warned}
                            />
                        </>
                    ) : (
                        <ElementList
                            tab={tab}
                            edition={edition}
                            interfaceLanguage={locale}
                            selected={key}
                            onSelect={select}
                            warned={warned}
                            session={session}
                        />
                    )}
                </nav>

                <section
                    aria-label={t('editor.preview')}
                    className={cn(
                        'min-h-0 flex-col gap-3 p-4 md:flex',
                        mobileElement
                            ? 'flex h-[48dvh] shrink-0 md:h-auto'
                            : 'hidden',
                    )}
                >
                    <div className="flex items-center gap-2 md:hidden">
                        <Button
                            variant="icon"
                            aria-label={t('editor.back_to_board')}
                            onClick={() => setMobileElement(false)}
                        >
                            <ChevronLeftIcon />
                        </Button>
                        <div className="min-w-0">
                            <p className="m-0 truncate font-display text-xl font-extrabold">
                                {label}
                            </p>
                            <p className="m-0 text-sm text-ink-soft">
                                {subtitle}
                            </p>
                        </div>
                    </div>

                    {(editKind === 'card' || editKind === 'cardBack') &&
                        (() => {
                            const deck = key.split('.')[1];
                            if (deck !== 'chance' && deck !== 'chest') {
                                return null;
                            }

                            return (
                                <SegmentedTabs
                                    value={
                                        editKind === 'card' ? 'front' : 'back'
                                    }
                                    onValueChange={(value) =>
                                        select(
                                            value === 'back'
                                                ? cardBackKey(deck)
                                                : cardKey(deck, 1),
                                        )
                                    }
                                    className="self-center"
                                >
                                    <SegmentedTabsList
                                        aria-label={t('editor.card_side')}
                                    >
                                        <SegmentedTabsTrigger value="front">
                                            {t('editor.side_front')}
                                        </SegmentedTabsTrigger>
                                        <SegmentedTabsTrigger value="back">
                                            {t('editor.side_back')}
                                        </SegmentedTabsTrigger>
                                    </SegmentedTabsList>
                                </SegmentedTabs>
                            );
                        })()}

                    {deedKey !== undefined && (
                        <SegmentedTabs
                            value={showDeed ? 'deed' : 'space'}
                            onValueChange={(value) =>
                                setDeedView(value === 'deed')
                            }
                            className="self-center"
                        >
                            <SegmentedTabsList aria-label={t('editor.view')}>
                                <SegmentedTabsTrigger value="space">
                                    {t('editor.view_space')}
                                </SegmentedTabsTrigger>
                                <SegmentedTabsTrigger value="deed">
                                    {t('editor.view_deed')}
                                </SegmentedTabsTrigger>
                            </SegmentedTabsList>
                        </SegmentedTabs>
                    )}

                    <ElementStage
                        widthMm={size.w}
                        heightMm={size.h}
                        bleedMm={bleed}
                        gestures={gestures}
                        overlay={
                            hasLayers
                                ? ({ pxPerMm }) => (
                                      <LayerOverlay
                                          layers={layers}
                                          area={size}
                                          pxPerMm={pxPerMm}
                                          selectedId={layerId}
                                          zones={
                                              editKind === 'boardCenter'
                                                  ? centerZones(
                                                        edition.boardProfile,
                                                    )
                                                  : undefined
                                          }
                                          onSelect={(id) =>
                                              setLayerSel({ key: editKey, id })
                                          }
                                          onChange={(layer, group) =>
                                              editElement(
                                                  session,
                                                  editKey,
                                                  {
                                                      layers: replaceLayer(
                                                          session.edition
                                                              .elements[editKey]
                                                              ?.layers ?? [],
                                                          layer,
                                                      ),
                                                  },
                                                  `${group}:${editKey}`,
                                              )
                                          }
                                          onRemove={(id) => {
                                              editElement(session, editKey, {
                                                  layers: layers.filter(
                                                      (item) => item.id !== id,
                                                  ),
                                              });
                                              setLayerSel({
                                                  key: editKey,
                                                  id: null,
                                              });
                                          }}
                                      />
                                  )
                                : undefined
                        }
                    >
                        {/* The key makes the frame be measured again when the layout or photo changes. */}
                        <div
                            key={`${editKey}|${layout}|${photo?.photoId ?? ''}`}
                            ref={measureFrame}
                        >
                            <ElementPreview
                                target={target}
                                resolved={resolved}
                                photos={photos}
                                bleedMm={bleed}
                            />
                        </div>
                    </ElementStage>

                    {tab === 'board' && key === 'board_center' && (
                        <p className="m-0 text-center text-sm text-ink-soft">
                            {t('editor.center_hint')}
                        </p>
                    )}
                </section>

                <div
                    className={cn(
                        'min-h-0 flex-col border-l-2 border-ink md:flex md:overflow-auto',
                        mobileElement ? 'flex flex-1' : 'hidden',
                    )}
                >
                    <ElementPanel
                        session={session}
                        edition={edition}
                        resolved={resolved}
                        editKey={editKey}
                        title={label}
                        subtitle={subtitle}
                        context={context}
                        onAct={act}
                        layout={layout}
                        cache={cache}
                        issues={issues}
                        siblings={siblings}
                        position={
                            showDeed || tab === 'board' ? position : undefined
                        }
                        area={size}
                        selectedLayer={layerId}
                        onSelectLayer={(id) =>
                            setLayerSel({ key: editKey, id })
                        }
                        onRemovePawn={() => {
                            const next = neighbours(1);
                            setSelectedKey(
                                next === undefined || next === key
                                    ? (firstKey(
                                          'box',
                                          edition.parts,
                                          session.edition.elements,
                                      ) ?? 'space.01')
                                    : next,
                            );
                        }}
                    />
                </div>

                {/* Phone: the actions sit at the bottom (Mobiel-bord, Editor-mobiel). */}
                <nav
                    aria-label={t('editor.actions')}
                    className="flex flex-none items-center gap-2 border-t-2 border-ink bg-card p-2 md:hidden"
                >
                    {mobileElement && (
                        <Button
                            variant="icon"
                            aria-label={t('editor.previous')}
                            onClick={() => {
                                const prev = neighbours(-1);
                                if (prev !== undefined) {
                                    setSelectedKey(prev);
                                    setDeedView(false);
                                }
                            }}
                        >
                            <ChevronLeftIcon />
                        </Button>
                    )}
                    <Button
                        variant={issues.length > 0 ? 'warning' : 'secondary'}
                        className="flex-1"
                        aria-expanded={checkOpen}
                        onClick={() => setCheckOpen((open) => !open)}
                    >
                        {issues.length > 0 && <WarningIcon />}
                        {t('editor.check', { count: issues.length })}
                    </Button>
                    <Button
                        variant="icon"
                        aria-label={t('editor.undo')}
                        disabled={!canUndo}
                        onClick={() => session.undo()}
                    >
                        <UndoIcon />
                    </Button>
                    <Button
                        variant="icon"
                        aria-label={t('editor.redo')}
                        disabled={!canRedo}
                        onClick={() => session.redo()}
                    >
                        <RedoIcon />
                    </Button>
                    {mobileElement ? (
                        <Button
                            variant="icon"
                            aria-label={t('editor.next')}
                            onClick={() => {
                                const next = neighbours(1);
                                if (next !== undefined) {
                                    setSelectedKey(next);
                                    setDeedView(false);
                                }
                            }}
                        >
                            <ChevronLeftIcon className="rotate-180" />
                        </Button>
                    ) : (
                        <Button asChild>
                            <Link href={printHref}>{t('editor.print')}</Link>
                        </Button>
                    )}
                </nav>
            </div>

            {probe}

            <SettingsDialog
                session={session}
                edition={edition}
                interfaceLanguage={locale}
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
            />
            <ConflictDialog
                conflict={conflict ?? push.conflict}
                locale={locale}
                onResolve={(choice) =>
                    conflict === null
                        ? push.resolve(choice)
                        : void session.resolveConflict(choice)
                }
            />
        </EditorLayout>
    );
}
