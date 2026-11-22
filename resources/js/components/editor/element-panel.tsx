import { usePage } from '@inertiajs/react';
import { useState, useSyncExternalStore } from 'react';

import { useTranslation } from '@/hooks/use-translation';
import type { CheckIssue } from '@/lib/checks/types';
import { baselineField } from '@/lib/edition/baseline';
import { amountIntoText } from '@/lib/edition/card-text';
import { groupColorName } from '@/lib/edition/group-names';
import {
    ALLOWED_FIELDS,
    PAWN_COUNT,
    groupKey,
    parseKey,
    spaceKey,
} from '@/lib/edition/keys';
import { resolvedCardOf, type ResolvedEdition } from '@/lib/edition/resolve';
import type { EditionSession } from '@/lib/edition/session';
import type { Edition } from '@/lib/edition/types';
import { elementLabel, holdsPhoto } from '@/lib/editor/catalogue';
import { editElement } from '@/lib/editor/edit';
import {
    layerOffFold,
    replaceLayer,
    type LayerArea,
} from '@/lib/editor/layers';
import {
    panelSections,
    spaceOfKey,
    type PanelSection as SectionId,
} from '@/lib/editor/panel-sections';
import type { PhotoCache } from '@/lib/editor/photo-cache';
import type {
    PlacementAction,
    PlacementContext,
} from '@/lib/editor/placements';
import type { Locale } from '@/lib/game/types';
import { cornerOf } from '@/lib/render/corners';
import { cn } from '@/lib/utils';

import { changedAmounts } from './amount-fields';
import { AmountSection } from './panel/amount-section';
import { FriendsSection, type FriendsProps } from './panel/friends-section';
import { ImageSection, centerLayoutOf } from './panel/image-section';
import { PanelHeader } from './panel/panel-header';
import { FieldIssues, PanelSection } from './panel/panel-parts';
import { PlacedList } from './panel/placed-list';
import { StyleSection } from './panel/style-section';
import { TextSection } from './panel/text-section';
import { usePhotoUpload } from './panel/use-photo-upload';

export interface ElementPanelProps {
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
}

export interface ElementStatus {
    text: string;
    announce: (text: string) => void;
    /** The element left the set: the line goes along to the next element once. */
    carry: () => void;
}

/**
 * The status line under the field panel ("Dorpsstraat en Kerkpad gewisseld"). A line belongs to the element it was
 * said for; after "Kaart weghalen" the panel moves on to the next card, and the line goes with it once.
 */
export function useElementStatus(editKey: string): ElementStatus {
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
}

type Translate = ReturnType<typeof useTranslation>;

/**
 * The second line of the panel head: what kind of element this is, in a few words ("Straat · bruin", "Station",
 * "Biljet · 30 stuks", "Pion 3 van 8").
 */
export function kindLine(
    key: string,
    edition: Edition,
    resolved: ResolvedEdition,
    t: Translate,
    locale: Locale,
): string {
    const kind = parseKey(key)?.kind;
    const space = spaceOfKey(key);

    if (kind === 'space' && space !== undefined) {
        switch (space.type) {
            case 'street': {
                return t('editor.kind_street', {
                    group: groupColorName(edition, space.group, locale).name,
                });
            }
            case 'chance':
            case 'chest':
                return t('editor.kind_space');
            default:
                return t(`editor.kind_${space.type}`);
        }
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
}

/** Controle messages about amounts stay at their field; the rest go on top of the panel (B94, §3.3). */
const AMOUNT_FIELD = /^amounts?\b/;

/**
 * The field panel (B93, B141): a head with the ⋯ menu, the Controle messages of the element, then the fixed
 * sections Tekst, Afbeelding, Bedragen, Stijl and, when a friend sent something, Van vrienden. A section is only
 * there when the type has it (`lib/editor/panel-sections.ts`).
 */
export function ElementPanel({
    session,
    edition,
    resolved,
    editKey,
    title,
    context,
    onAct,
    cache,
    issues,
    siblings,
    area,
    selectedLayer = null,
    onSelectLayer,
    onRemoved,
    onOpenWords,
    friends,
    status: shared,
}: ElementPanelProps) {
    const t = useTranslation();
    const { locale: interfaceLocale } = usePage().props;
    const ownStatus = useElementStatus(editKey);
    const status = shared ?? ownStatus;
    const removed = (): void => {
        status.carry();
        onRemoved?.();
    };
    const kind = parseKey(editKey)?.kind;
    const sections = panelSections(editKey);
    const space = spaceOfKey(editKey);
    const iconSpace =
        kind === 'space' && space !== undefined && space.type !== 'street'
            ? space
            : undefined;
    const card =
        kind === 'card' ? resolvedCardOf(resolved, editKey) : undefined;
    const override = edition.elements[editKey];
    const allowed = kind === undefined ? [] : ALLOWED_FIELDS[kind];
    const canHold =
        kind === 'boardCenter'
            ? resolved.boardCenter.mode !== 'name'
            : holdsPhoto(editKey) && allowed.includes('photo');
    const photos = useSyncExternalStore(cache.subscribe, cache.getSnapshot);
    const upload = usePhotoUpload({
        session,
        edition,
        editKey,
        cache,
        siblings,
        canHold,
        labelOf: (key) => elementLabel(key, edition, interfaceLocale),
    });
    const corner =
        kind === 'space' && space !== undefined
            ? cornerOf(space.position)
            : undefined;
    const photoStyle =
        override?.photo !== undefined &&
        allowed.includes('photoStyle') &&
        corner === undefined;

    // Issues of a deed also count for its space, and the other way around, like on the board.
    // A message about a group, such as the pawns without a photo, shows on each of them (R5-09).
    const about = (issue: CheckIssue) =>
        issue.elementKey === editKey ||
        (issue.alsoKeys?.includes(editKey) ?? false);
    const own = issues.filter(
        (issue) =>
            about(issue) ||
            (space !== undefined &&
                issue.elementKey === spaceKey(space.position) &&
                AMOUNT_FIELD.test(issue.field)),
    );
    const top = own.filter(
        (issue) => about(issue) && !AMOUNT_FIELD.test(issue.field),
    );

    const targets = new Set([editKey]);
    if (space !== undefined) {
        targets.add(spaceKey(space.position));
        if (space.type === 'street') {
            targets.add(groupKey(space.group));
        }
    }
    const incoming =
        friends?.contributions.filter(
            (item) => targets.has(item.elementKey) && item.open.length > 0,
        ) ?? [];
    // The line after a decision stays with this element, also when nothing is left to decide (bug 30).
    const here = (element: string): boolean =>
        element === editKey || targets.has(element);
    const decided =
        friends !== undefined &&
        [friends.decision.note, friends.decision.problem].some(
            (line) => line !== null && here(line.element),
        );

    const summary = (id: SectionId): string | undefined => {
        switch (id) {
            case 'image':
                // The centre says its layout (B187): its photo can wait in the background of a name-only layout.
                if (kind === 'boardCenter') {
                    return t(`editor.center_mode_${centerLayoutOf(override)}`);
                }

                return override?.photo !== undefined
                    ? override.photoStyle === 'full'
                        ? t('editor.summary_photo_full')
                        : t('editor.summary_photo')
                    : override?.icon !== undefined
                      ? t('editor.summary_icon')
                      : t('editor.summary_no_photo');
            case 'amounts': {
                const count =
                    space !== undefined
                        ? changedAmounts(edition, space)
                        : override?.amount !== undefined
                          ? 1
                          : 0;

                return count > 0
                    ? t('editor.summary_changed', { count })
                    : undefined;
            }
            default:
                return undefined;
        }
    };

    const body = (id: SectionId) => {
        switch (id) {
            case 'text':
                return (
                    <TextSection
                        session={session}
                        edition={edition}
                        resolved={resolved}
                        editKey={editKey}
                        kind={kind ?? 'space'}
                        space={space}
                        card={card}
                        issues={own}
                        onOpenWords={onOpenWords}
                    />
                );
            case 'image':
                return (
                    <>
                        <ImageSection
                            session={session}
                            edition={edition}
                            resolved={resolved}
                            editKey={editKey}
                            kind={kind ?? 'space'}
                            iconSpace={iconSpace}
                            photoStyle={photoStyle}
                            context={context}
                            onAct={onAct}
                            cache={cache}
                            upload={upload}
                            onAnnounce={status.announce}
                        />
                        {/* After several photos at once: which went where, right under the photo field (UX 4). */}
                        {upload.placed?.kind === 'batch' && (
                            <PlacedList
                                placed={upload.placed}
                                photos={photos}
                                onUndo={upload.undoPlaced}
                                onClose={upload.dismissPlaced}
                                onMove={upload.movePlaced}
                                onPlaceMissed={(index, key) =>
                                    void upload.placeMissed(index, key)
                                }
                            />
                        )}
                    </>
                );
            case 'amounts':
                return (
                    <AmountSection
                        session={session}
                        edition={edition}
                        resolved={resolved}
                        editKey={editKey}
                        kind={kind ?? 'space'}
                        space={space}
                        card={card}
                        issues={own}
                    />
                );
            case 'style':
                return (
                    <StyleSection
                        session={session}
                        edition={edition}
                        resolved={resolved}
                        editKey={editKey}
                        kind={kind ?? 'space'}
                        space={space}
                        cache={cache}
                        area={area}
                        selectedLayer={selectedLayer}
                        onSelectLayer={onSelectLayer ?? (() => undefined)}
                    />
                );
        }
    };

    // "Bedrag aanpassen" (bug 8): the card text names another amount than the line under it, and that amount
    // is allowed, so one tap makes them agree.
    const fixAction = (issue: CheckIssue) => {
        // "Verschuiven" (B183, B187): the name, photo or logo goes to a free square, a layer off the fold.
        if (issue.code === 'center.on-fold') {
            return (
                <button
                    type="button"
                    onClick={() => {
                        const layerId = issue.field.startsWith('layer.')
                            ? issue.field.slice('layer.'.length)
                            : null;
                        const layers =
                            session.edition.elements[editKey]?.layers ?? [];
                        const layer = layers.find(
                            (candidate) => candidate.id === layerId,
                        );
                        if (layer !== undefined) {
                            editElement(session, editKey, {
                                layers: replaceLayer(
                                    layers,
                                    layerOffFold(layer, edition.boardProfile),
                                ),
                            });
                        } else {
                            editElement(session, editKey, {
                                centerPlace: undefined,
                                titleOffset: undefined,
                            });
                        }
                        status.announce(t('editor.fold_fixed'));
                    }}
                    className="min-h-11 cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold underline underline-offset-4"
                >
                    {t('editor.fold_fix')}
                </button>
            );
        }
        if (card === undefined) {
            return null;
        }
        const text = session.edition.elements[editKey]?.text;
        // "De tekst noemt 50, en dat staat al onderaan": the amount goes into the text once (R5-11).
        if (issue.code === 'text.amount-twice') {
            const amount = card.amount;
            const once =
                text === undefined || amount === undefined
                    ? null
                    : amountIntoText(text, amount);
            if (once === null) {
                return null;
            }

            return (
                <FixButton
                    label={t('editor.amount_once')}
                    onClick={() => {
                        editElement(session, editKey, { text: once });
                        status.announce(t('editor.amount_once_done'));
                    }}
                />
            );
        }
        // "De tekst zegt betalen, maar onderaan staat Ontvang": one tap turns the card (R5-11).
        const says = issue.data?.says;
        if (issue.code === 'text.amount-direction' && says !== undefined) {
            const amount = card.amount;
            if (amount === undefined || amount === 0) {
                return null;
            }
            const turned = (says === 'pay' ? -1 : 1) * Math.abs(amount);

            return (
                <FixButton
                    label={t(
                        says === 'pay'
                            ? 'editor.amount_turn_pay'
                            : 'editor.amount_turn_receive',
                    )}
                    onClick={() => {
                        editElement(session, editKey, {
                            amount:
                                turned === card.standardAmount &&
                                baselineField(edition, editKey, 'amount') ===
                                    undefined
                                    ? undefined
                                    : turned,
                        });
                        status.announce(
                            t(
                                says === 'pay'
                                    ? 'editor.amount_turned_pay'
                                    : 'editor.amount_turned_receive',
                            ),
                        );
                    }}
                />
            );
        }
        const mentioned = issue.data?.mentioned;
        if (
            issue.code !== 'text.amount-differs' ||
            issue.data?.allowed !== true ||
            mentioned === undefined
        ) {
            return null;
        }
        const standard = card.extra ? undefined : card.standardAmount;
        const baseline = baselineField(edition, editKey, 'amount');
        // The amount becomes the mentioned one and the number in the text becomes `{amount}`, so the card names it
        // once and the fix does not raise "the amount is already at the bottom" (Sem, R5-11).
        const into =
            text === undefined ? null : amountIntoText(text, mentioned);

        return (
            <FixButton
                label={t('editor.amount_fix')}
                onClick={() => {
                    editElement(session, editKey, {
                        // The standard amount is stored as no amount, unless the template set its own.
                        amount:
                            mentioned === standard && baseline === undefined
                                ? undefined
                                : mentioned,
                        ...(into === null ? {} : { text: into }),
                    });
                    status.announce(
                        t(
                            into === null
                                ? 'editor.amount_fixed'
                                : 'editor.amount_fixed_in_text',
                            { amount: Math.abs(mentioned) },
                        ),
                    );
                }}
            />
        );
    };

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
                    onRemoved={removed}
                    onAnnounce={status.announce}
                    photos={photos}
                />
            </div>

            {top.length > 0 && (
                <div className="flex flex-col gap-2">
                    <FieldIssues issues={top} action={fixAction} />
                </div>
            )}

            {/* The key starts every element with fresh sections: on a phone the first one is open. */}
            <div key={editKey} className="flex flex-col gap-4 md:gap-5">
                {sections.map((id, index) => (
                    <PanelSection
                        key={id}
                        id={id}
                        title={titles[id]}
                        summary={summary(id)}
                        defaultOpen={index === 0}
                    >
                        {body(id)}
                    </PanelSection>
                ))}
                {friends !== undefined && (incoming.length > 0 || decided) && (
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
                        <FriendsSection
                            {...friends}
                            contributions={incoming}
                            here={here}
                        />
                    </PanelSection>
                )}
            </div>

            <p role="status" className="m-0 min-h-5 text-sm">
                {status.text}
            </p>
        </aside>
    );
}

/** The link-style button under a warning that fixes it in one tap. */
function FixButton({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="min-h-11 cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold underline underline-offset-4"
        >
            {label}
        </button>
    );
}
