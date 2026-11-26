import { usePage } from '@inertiajs/react';
import { useState, useSyncExternalStore } from 'react';

import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import type { CheckIssue } from '@/lib/render/checks-types';
import { cornerOf } from '@/lib/render/corners';
import { groupColorName } from '@/lib/render/edition-group-names';
import {
    ALLOWED_FIELDS,
    PAWN_COUNT,
    parseKey,
} from '@/lib/render/edition-keys';
import {
    resolvedCardOf,
    type ResolvedEdition,
} from '@/lib/render/edition-resolve';
import type { Edition } from '@/lib/render/edition-types';
import { elementLabel, holdsPhoto } from '@/lib/render/editor-catalogue';
import type { LayerArea } from '@/lib/render/editor-layers';
import {
    panelSections,
    spaceOfKey,
    type PanelSection as SectionId,
} from '@/lib/render/editor-panel-sections';
import type { PhotoCache } from '@/lib/render/editor-photo-cache';
import type {
    PlacementAction,
    PlacementContext,
} from '@/lib/render/editor-placements';
import { cn } from '@/lib/utils';
import type { Locale, Space } from '@/types/game';

import { elementIssues, friendsFor } from './panel/element-issues';
import { FriendsSection, type FriendsProps } from './panel/friends-section';
import { IssueFix } from './panel/issue-fix';
import { PanelHeader } from './panel/panel-header';
import { FieldIssues, PanelSection } from './panel/panel-section';
import { SectionBody } from './panel/section-body';
import { sectionSummary } from './panel/section-summary';
import { usePhotoUpload } from './panel/use-photo-upload';

export type ElementPanelProps = {
    session: EditionSession;
    edition: Edition;
    resolved: ResolvedEdition;
    /** The key whose override is edited: the deed key when a space is shown as its title deed. */
    editKey: string;
    title: string;
    /** What the photo is measured against, or `null` without a photo or a frame. */
    context: PlacementContext | null;
    onAct: (action: PlacementAction, announcement?: string) => void;
    cache: PhotoCache;
    issues: readonly CheckIssue[];
    /** Elements after this one in the list, for a photo choice with several files. */
    siblings: readonly string[];
    /** Size of the element in mm, for the free layers. */
    area?: LayerArea;
    selectedLayer?: string | null;
    onSelectLayer?: (id: string | null) => void;
    /** Called after a pawn or an extra card left the set, so the editor can show another element. */
    onRemoved?: () => void;
    /** Opens the words of the edition (the names of the decks). */
    onOpenWords?: () => void;
    /** What friends sent (B128); "Van vrienden" shows the ones for this element. */
    friends?: FriendsProps;
    /**
     * The status line, when the editor also acts on the element elsewhere (the phone's top bar menu, B151). Without
     * it the panel keeps its own.
     */
    status?: ElementStatus;
};

export type ElementStatus = {
    text: string;
    announce: (text: string) => void;
    /** The element left the set: the line goes along to the next element once. */
    carry: () => void;
};

/**
 * The status line under the field panel ("Dorpsstraat en Kerkpad gewisseld"). A line belongs to the element it was
 * said for; after "Kaart weghalen" the panel moves on to the next card, and the line goes with it once.
 */
export const useElementStatus = (editKey: string): ElementStatus => {
    const [text, setText] = useState('');
    const [shownFor, setShownFor] = useState(editKey);
    const [carrying, setCarrying] = useState(false);
    if (shownFor !== editKey) {
        setShownFor(editKey);
        if (carrying) {
            setCarrying(false);
        } else {
            setText('');
        }
    }

    return { text, announce: setText, carry: () => setCarrying(true) };
};

type Translate = ReturnType<typeof useTranslation>;

/**
 * The second line of the panel head: what kind of element this is, in a few words ("Straat · bruin", "Station",
 * "Biljet · 30 stuks", "Pion 3 van 8").
 */
export const kindLine = (
    key: string,
    edition: Edition,
    resolved: ResolvedEdition,
    t: Translate,
    locale: Locale,
): string => {
    const kind = parseKey(key)?.kind;
    const space = spaceOfKey(key);

    if (kind === 'space' && space !== undefined) {
        if (space.type === 'street') {
            return t('editor.kind_street', {
                group: groupColorName(edition, space.group, locale).name,
            });
        }

        return space.type === 'chance' || space.type === 'chest'
            ? t('editor.kind_space')
            : t(`editor.kind_${space.type}`);
    }
    if (kind === 'card') {
        return resolvedCardOf(resolved, key)?.extra === true
            ? t('editor.kind_extraCard')
            : t('editor.kind_card');
    }
    if (kind === 'note') {
        const note = resolved.money?.notes.find(
            (candidate) => `note.${candidate.value}` === key,
        );

        return t('editor.kind_note_count', { count: note?.count ?? 0 });
    }
    if (kind === 'pawn') {
        const pawns = resolved.pawns ?? [];
        const position = pawns.findIndex((pawn) => pawn.key === key);

        return t('editor.kind_pawn_of', {
            n: position >= 0 ? position + 1 : Number(key.split('.')[1]),
            total: pawns.length > 0 ? pawns.length : PAWN_COUNT,
        });
    }
    if (kind === 'cardBack') {
        return elementLabel(key, edition, locale).split(':')[0] ?? '';
    }
    if (kind === 'boardCenter') {
        return t('editor.tab_board');
    }

    return t(`editor.kind_${kind ?? 'space'}`);
};

/**
 * The field panel (B93, B141): a head with the ⋯ menu, the Controle messages of the element, then the fixed
 * sections Tekst, Afbeelding, Bedragen, Stijl and, when a friend sent something, Van vrienden. A section is only
 * there when the type has it (`lib/render/editor-panel-sections.ts`).
 */
export const ElementPanel = (props: ElementPanelProps) => {
    const { session, edition, resolved, editKey, title, cache } = props;
    const { friends, status: shared } = props;
    const t = useTranslation();
    const { locale: interfaceLocale } = usePage().props;
    const ownStatus = useElementStatus(editKey);
    const status = shared ?? ownStatus;
    const kind = parseKey(editKey)?.kind;
    const space = spaceOfKey(editKey);
    const card =
        kind === 'card' ? resolvedCardOf(resolved, editKey) : undefined;
    const allowed = kind === undefined ? [] : ALLOWED_FIELDS[kind];
    const photos = useSyncExternalStore(cache.subscribe, cache.getSnapshot);
    const upload = usePhotoUpload({
        session,
        edition,
        editKey,
        cache,
        siblings: props.siblings,
        canHold:
            kind === 'boardCenter'
                ? resolved.boardCenter.mode !== 'name'
                : holdsPhoto(editKey) && allowed.includes('photo'),
        labelOf: (key) => elementLabel(key, edition, interfaceLocale),
    });
    const { own, top } = elementIssues(props.issues, editKey, space);
    const titles: Record<SectionId, string> = {
        text: t('editor.section_text'),
        image: t('editor.section_image'),
        amounts: t('editor.section_amounts'),
        style: t('editor.section_style'),
    };

    return (
        <aside
            aria-label={t('editor.properties')}
            data-editor-panel
            {...upload.dropProps}
            className={cn(
                'flex min-h-0 flex-col gap-5 overflow-auto bg-card p-4 md:p-6',
                upload.dragging &&
                    'outline-3 -outline-offset-8 outline-ink outline-dashed',
            )}
        >
            <div className="hidden border-b border-line pb-4 md:block">
                <PanelHeader
                    session={session}
                    edition={edition}
                    editKey={editKey}
                    title={title}
                    kind={kindLine(
                        editKey,
                        edition,
                        resolved,
                        t,
                        interfaceLocale,
                    )}
                    onRemoved={() => {
                        status.carry();
                        props.onRemoved?.();
                    }}
                    onAnnounce={status.announce}
                    photos={photos}
                />
            </div>

            {top.length > 0 && (
                <div className="flex flex-col gap-2">
                    <FieldIssues
                        issues={top}
                        action={(issue) => (
                            <IssueFix
                                issue={issue}
                                session={session}
                                edition={edition}
                                editKey={editKey}
                                card={card}
                                photos={photos}
                                announce={status.announce}
                            />
                        )}
                    />
                </div>
            )}

            {/* The key starts every element with fresh sections: on a phone the first one is open. */}
            <div key={editKey} className="flex flex-col gap-4 md:gap-5">
                {panelSections(editKey).map((id, index) => (
                    <PanelSection
                        key={id}
                        id={id}
                        title={titles[id]}
                        summary={sectionSummary(
                            id,
                            { edition, editKey, kind, space },
                            t,
                        )}
                        defaultOpen={index === 0}
                    >
                        <SectionBody
                            {...props}
                            id={id}
                            kind={kind}
                            space={space}
                            iconSpace={
                                kind === 'space' && space?.type !== 'street'
                                    ? space
                                    : undefined
                            }
                            card={card}
                            own={own}
                            photoStyle={
                                edition.elements[editKey]?.photo !==
                                    undefined &&
                                allowed.includes('photoStyle') &&
                                (kind !== 'space' ||
                                    space === undefined ||
                                    cornerOf(space.position) === undefined)
                            }
                            upload={upload}
                            announce={status.announce}
                            selectedLayer={props.selectedLayer ?? null}
                        />
                    </PanelSection>
                ))}
                <FriendsPart
                    friends={friends}
                    editKey={editKey}
                    space={space}
                />
            </div>

            <p role="status" className="m-0 min-h-5 text-sm">
                {status.text}
            </p>
        </aside>
    );
};

const FriendsPart = ({
    friends,
    editKey,
    space,
}: {
    friends: FriendsProps | undefined;
    editKey: string;
    space: Space | undefined;
}) => {
    const t = useTranslation();
    const { incoming, here, decided } = friendsFor(friends, editKey, space);
    if (friends === undefined || (incoming.length === 0 && !decided)) {
        return null;
    }

    return (
        <PanelSection
            id="friends"
            title={t('editor.section_friends')}
            badge={
                incoming.length > 0 ? (
                    <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-press px-1.5 font-sans text-xs font-semibold text-white">
                        {incoming.length}
                    </span>
                ) : undefined
            }
            defaultOpen
        >
            <FriendsSection {...friends} contributions={incoming} here={here} />
        </PanelSection>
    );
};
