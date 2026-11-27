import { useEffect } from 'react';

import { EditionPanel } from '@/features/edition/editor/edition-panel';
import { ElementPanel } from '@/features/edition/editor/element-panel';
import { writePlainEnabled } from '@/features/edition/editor/shortcuts';
import {
    CardSideTabs,
    DeedViewTabs,
    PreviewSection,
} from '@/features/edition/editor/workspace/preview-section';
import { useWorkspace } from '@/features/edition/editor/workspace/use-workspace';
import {
    useWorkspaceCommands,
    type WorkspaceParts,
} from '@/features/edition/editor/workspace/use-workspace-commands';
import { useWorkspaceShortcuts } from '@/features/edition/editor/workspace/use-workspace-shortcuts';
import {
    PhoneActions,
    PhoneBar,
    WorkspaceSaveStatus,
    WorkspaceAlerts,
} from '@/features/edition/editor/workspace/workspace-chrome';
import { WorkspaceDialogs } from '@/features/edition/editor/workspace/workspace-dialogs';
import { NavColumn } from '@/features/edition/editor/workspace/workspace-nav';
import { WorkspaceStage } from '@/features/edition/editor/workspace/workspace-stage';
import type { EditionSession } from '@/features/edition/session';
import EditorLayout from '@/layouts/editor-layout';
import { spaceKey } from '@/lib/render/edition-keys';
import { isCustomized } from '@/lib/render/editor-catalogue';
import { deedsFor } from '@/lib/render/standard-edition';
import { cn } from '@/lib/utils';

type EditorWorkspaceProps = {
    session: EditionSession;
};

type Parts = WorkspaceParts;

const isTextTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    return (
        target.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
    );
};

// Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl+Y outside text fields; inside them the browser keeps its own undo.
const useUndoKeys = (session: EditionSession): void => {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent): void => {
            if (
                event.defaultPrevented ||
                event.altKey ||
                !(event.ctrlKey || event.metaKey) ||
                isTextTarget(event.target)
            ) {
                return;
            }
            const letter = event.key.toLowerCase();
            if (letter === 'z') {
                event.preventDefault();
                if (event.shiftKey) {
                    session.redo();
                } else {
                    session.undo();
                }
            } else if (letter === 'y' && event.ctrlKey && !event.shiftKey) {
                event.preventDefault();
                session.redo();
            }
        };
        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, [session]);
};

const PreviewTabs = ({ ws, commands }: Parts) => {
    const { view, navigation } = ws;
    const { editKind, key } = view;
    const deck = key.split('.')[1];

    if (navigation.editionOpen) {
        return null;
    }

    return (
        <>
            {(editKind === 'card' || editKind === 'cardBack') &&
                (deck === 'chance' || deck === 'chest') && (
                    <CardSideTabs
                        deck={deck}
                        back={editKind === 'cardBack'}
                        onSelect={commands.select}
                    />
                )}
            {view.deedKey !== undefined && (
                <DeedViewTabs
                    deed={view.showDeed}
                    onDeedView={(deed) =>
                        ws.navigate({ type: 'deed-view', deed })
                    }
                />
            )}
        </>
    );
};

const PreviewColumn = ({ ws, commands }: Parts) => {
    const { view, navigation, data, photo } = ws;

    return (
        <PreviewSection
            mobileElement={navigation.mobileElement}
            editionOpen={navigation.editionOpen}
            foldable={ws.fold.foldable}
            folded={ws.fold.folded}
            label={ws.label}
            onToggleFold={ws.fold.togglePreview}
            centerHint={
                !navigation.editionOpen &&
                view.tab === 'board' &&
                view.key === 'board_center'
            }
            tabs={<PreviewTabs ws={ws} commands={commands} />}
            stage={
                <WorkspaceStage
                    session={ws.session}
                    edition={data.edition}
                    resolved={data.resolved}
                    photos={data.photos}
                    view={view}
                    editionOpen={navigation.editionOpen}
                    wide={ws.wide}
                    size={ws.size}
                    gestures={photo.gestures}
                    layers={ws.layers}
                    layerId={ws.layerId}
                    frameKey={`${view.target.key}|${photo.photo?.photoId ?? ''}|${photo.info === undefined ? '' : 'loaded'}`}
                    frameRef={photo.frameRef}
                    onSelectLayer={(id) =>
                        ws.setLayerSel({ key: view.editKey, id })
                    }
                    onPick={commands.goTo}
                    onPickSpace={commands.pickSpace}
                />
            }
        />
    );
};

const FieldsColumn = ({ ws, commands }: Parts) => {
    const { data, navigation, view, session } = ws;
    const { editionOpen, mobileElement } = navigation;

    return (
        <div
            onScrollCapture={ws.fold.onFieldsScroll}
            className={cn(
                'min-h-0 flex-col border-ink bg-card md:col-start-2 md:row-start-2 md:flex lg:col-start-3 lg:row-start-1 lg:border-l-2 phone-low:col-start-2 phone-low:row-start-1 phone-low:border-l-2 tablet-low:col-start-3 tablet-low:row-start-1 tablet-low:border-l-2',
                editionOpen ? 'md:overflow-clip' : 'md:overflow-auto',
                mobileElement ? 'flex flex-1' : 'hidden',
                mobileElement && !editionOpen && 'overflow-auto',
            )}
        >
            {editionOpen ? (
                <EditionPanel
                    session={session}
                    edition={data.edition}
                    resolved={data.resolved}
                    interfaceLanguage={data.locale}
                    issues={data.issues}
                    collect={data.collect}
                    friends={data.friends}
                    onOpenElement={commands.select}
                    request={navigation.sectionRequest}
                />
            ) : (
                <ElementPanel
                    session={session}
                    edition={data.edition}
                    resolved={data.resolved}
                    editKey={view.editKey}
                    title={ws.editLabel}
                    context={ws.photo.context}
                    onAct={ws.photo.act}
                    cache={data.cache}
                    issues={data.issues}
                    siblings={ws.tabKeyList.slice(
                        ws.tabKeyList.indexOf(view.key) + 1,
                    )}
                    area={ws.size}
                    selectedLayer={ws.layerId}
                    onSelectLayer={(id) =>
                        ws.setLayerSel({ key: view.editKey, id })
                    }
                    onRemoved={ws.leaveRemoved}
                    status={ws.elementStatus}
                    onOpenWords={() => commands.openEdition('words')}
                    friends={data.friends}
                />
            )}
        </div>
    );
};

const WorkspacePhoneBar = ({ ws, commands }: Parts) => {
    const { data, navigation, view, elementActions } = ws;
    const element =
        !navigation.editionOpen && elementActions.actions.length > 0
            ? { title: ws.editLabel, items: elementActions.items }
            : undefined;

    return (
        <PhoneBar
            label={ws.label}
            subtitle={ws.subtitle}
            editionName={data.edition.name}
            editionOpen={navigation.editionOpen}
            customized={isCustomized(data.edition, view.key)}
            tab={view.tab}
            menu={commands.menu}
            printHref={ws.printHref}
            element={element}
            dialogs={elementActions.dialogs}
            waiting={data.contributions.length}
            onBack={() => ws.navigate({ type: 'close-element' })}
        />
    );
};

const Dialogs = ({ ws, commands }: Parts) => {
    const { data, navigation, view, dialogs, session } = ws;
    const { snapshot, push } = data;

    return (
        <WorkspaceDialogs
            edition={data.edition}
            stored={data.stored}
            resolved={data.resolved}
            photos={data.photos}
            locale={data.locale}
            warned={data.warned}
            issues={data.issues}
            boardSelected={
                navigation.editionOpen || view.tab !== 'board'
                    ? 'space.00'
                    : view.key
            }
            bigBoard={{
                open: navigation.bigBoard,
                onOpenChange: (open) =>
                    ws.navigate({ type: 'big-board', open }),
            }}
            preview={{
                open: dialogs.previewOpen,
                onOpenChange: dialogs.setPreviewOpen,
                onClosed: commands.returnFromPreview,
            }}
            messages={{
                open: dialogs.messagesOpen,
                onOpenChange: dialogs.setMessagesOpen,
            }}
            share={{
                open: dialogs.shareOpen,
                onOpenChange: dialogs.setShareOpen,
            }}
            shortcuts={{
                open: dialogs.shortcutsOpen,
                onOpenChange: dialogs.setShortcutsOpen,
                plain: dialogs.plainShortcuts,
                onPlainChange: (next) => {
                    dialogs.setPlainShortcuts(next);
                    writePlainEnabled(next);
                },
            }}
            flash={ws.flash}
            conflict={snapshot.conflict ?? push.conflict}
            getPhoto={(id) => data.repository.getPhoto(id)}
            onPickSpace={commands.pickSpace}
            onSwap={commands.swapSpaces}
            onJump={(next) => {
                if (next.startsWith('deed.')) {
                    const space = deedsFor()[Number(next.slice(5)) - 1];

                    if (space !== undefined) {
                        ws.navigate({
                            type: 'select',
                            key: spaceKey(space.position),
                            deed: true,
                        });
                    }

                    return;
                }

                commands.select(next);
            }}
            onOpenMessage={(key, field) =>
                ws.navigate({ type: 'open-from-check', key, field })
            }
            onResolve={(choice) =>
                snapshot.conflict === null
                    ? push.resolve(choice)
                    : void session.resolveConflict(choice)
            }
        />
    );
};

/**
 * The editor (B73, B93, B144, B145): tabs per part, the board as navigator, the chosen element large in the
 * middle, and its fields on the right. The edition itself is an element too: the row "Overzicht" on top of the left
 * column shows the whole board and the edition panel. On a phone the overview and the element (or the edition)
 * are two screens, each with one back arrow.
 */
export const EditorWorkspace = ({ session }: EditorWorkspaceProps) => {
    const ws = useWorkspace(session);
    const commands = useWorkspaceCommands(ws);
    const { data, navigation } = ws;
    const { snapshot } = data;
    useUndoKeys(session);
    useWorkspaceShortcuts(ws, commands);

    return (
        <EditorLayout
            editionName={data.edition.name}
            saveStatus={<WorkspaceSaveStatus ws={ws} />}
            printHref={ws.printHref}
            canUndo={snapshot.canUndo}
            canRedo={snapshot.canRedo}
            onOpenPreview={commands.openPreview}
            onUndo={() => session.undo()}
            onRedo={() => session.redo()}
            menu={commands.menu}
            phoneBar={
                navigation.mobileElement ? (
                    <WorkspacePhoneBar ws={ws} commands={commands} />
                ) : undefined
            }
        >
            {/*
                Phone: the list, or the element with its preview on top. A phone on its side puts the preview beside
                the fields. Tablet (B155): the list on the left; the preview, which folds, on top of the panel on the
                right; on a low tablet screen the three side by side. Desktop: list, preview and panel.
            */}
            <div
                data-workspace
                className={cn(
                    'relative flex h-full min-h-0 flex-col',
                    navigation.mobileElement &&
                        'phone-low:grid phone-low:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] phone-low:grid-rows-[minmax(0,1fr)_auto]',
                    'md:grid md:grid-cols-[minmax(240px,300px)_minmax(0,1fr)] md:grid-rows-[auto_minmax(0,1fr)]',
                    'tablet-low:grid-cols-[minmax(240px,312px)_minmax(0,1fr)_minmax(300px,340px)] tablet-low:grid-rows-1',
                    'lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)_minmax(320px,380px)] lg:grid-rows-1',
                )}
            >
                <WorkspaceAlerts
                    deletedElsewhere={snapshot.deletedElsewhere}
                    problem={data.push.problem}
                    duplicateFailed={ws.duplicateFailed}
                    locale={data.locale}
                />
                <NavColumn ws={ws} commands={commands} />
                <PreviewColumn ws={ws} commands={commands} />
                <FieldsColumn ws={ws} commands={commands} />
                <PhoneActions
                    onElement={
                        navigation.mobileElement && !navigation.editionOpen
                    }
                    canUndo={snapshot.canUndo}
                    canRedo={snapshot.canRedo}
                    onStep={commands.step}
                    onUndo={() => session.undo()}
                    onRedo={() => session.redo()}
                    onPreview={commands.openPreview}
                />
            </div>

            {data.probe}

            <Dialogs ws={ws} commands={commands} />
        </EditorLayout>
    );
};
