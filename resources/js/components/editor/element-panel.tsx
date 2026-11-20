import { usePage } from '@inertiajs/react';
import {
    useRef,
    useState,
    type ChangeEvent,
    type DragEvent,
    type ReactNode,
} from 'react';

import { LayerPanel } from '@/components/editor/layer-panel';
import { LayoutTiles } from '@/components/editor/layout-tiles';
import { WarningIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useServices } from '@/hooks/use-editions';
import { useTranslation } from '@/hooks/use-translation';
import { issuesFor } from '@/lib/checks/summary';
import type { CheckIssue } from '@/lib/checks/types';
import {
    ALLOWED_FIELDS,
    BANK_KEY,
    THEME_LAYOUTS,
    parseKey,
} from '@/lib/edition/keys';
import type { ResolvedEdition } from '@/lib/edition/resolve';
import type { EditionSession } from '@/lib/edition/session';
import type {
    Edition,
    ElementField,
    ElementOverride,
    LayoutId,
} from '@/lib/edition/types';
import { editElement, resetElement } from '@/lib/editor/edit';
import { ingestPhoto } from '@/lib/editor/ingest';
import type { LayerArea } from '@/lib/editor/layers';
import type { PhotoCache } from '@/lib/editor/photo-cache';
import {
    placementDpi,
    type PlacementAction,
    type PlacementContext,
} from '@/lib/editor/placements';
import {
    formatMoney,
    spaceAt,
    standardEdition,
} from '@/lib/game/standard-edition';
import { resolutionLabel } from '@/lib/photos/resolution';
import { MAX_ZOOM, MIN_ZOOM, defaultTransform } from '@/lib/photos/transform';
import type { PhotoError } from '@/lib/photos/validation';
import { cn } from '@/lib/utils';

export interface ElementPanelProps {
    session: EditionSession;
    edition: Edition;
    resolved: ResolvedEdition;
    /** The key whose override is edited: the deed key when a space is shown as its title deed. */
    editKey: string;
    title: string;
    subtitle: string;
    /** What the photo is measured against, or `null` without a photo or a frame. */
    context: PlacementContext | null;
    onAct: (action: PlacementAction, announcement?: string) => void;
    layout: LayoutId;
    cache: PhotoCache;
    issues: readonly CheckIssue[];
    /** Elements after this one in the list, for a photo choice with several files. */
    siblings: readonly string[];
    /** The spot of a space, for the price and colour group line. */
    position?: number;
    /** Size of the element in mm, for the free layers. */
    area?: LayerArea;
    selectedLayer?: string | null;
    onSelectLayer?: (id: string | null) => void;
    /** Called after a pawn is taken out of the set, so the editor can show another element. */
    onRemovePawn?: () => void;
}

type Upload =
    | { kind: 'working'; name: string; stage: 'converting' | 'resizing' }
    | { kind: 'error'; error: PhotoError }
    | { kind: 'storage-full'; name: string };

function currentName(
    resolved: ResolvedEdition,
    edition: Edition,
    key: string,
): string {
    const [kind, index] = key.split('.');
    const n = Number(index);

    switch (kind) {
        case 'space':
            return resolved.spaces[n]?.name ?? '';
        case 'deed':
            return resolved.deeds?.[n - 1]?.name ?? '';
        case 'pawn':
            return resolved.pawns?.[n - 1]?.name ?? '';
        case 'box_lid':
            return resolved.boxLid?.name ?? edition.name;
        case 'board_center':
            return resolved.boardCenter.name ?? edition.name;
        case 'bank':
            return resolved.money?.bankName ?? '';
        default:
            return '';
    }
}

function currentText(resolved: ResolvedEdition, key: string): string {
    if (key === 'house_rules') {
        return resolved.houseRules?.text ?? '';
    }
    const [, deck, index] = key.split('.');
    if (deck !== 'chance' && deck !== 'chest') {
        return '';
    }

    return resolved.decks?.[deck][Number(index) - 1]?.text ?? '';
}

/** Keeps what is being typed while the field is empty, so clearing it does not jump to the default. */
function useDraft(value: string): {
    shown: string;
    set: (next: string) => void;
    end: () => void;
} {
    const [draft, setDraft] = useState<string | null>(null);

    return {
        shown: draft ?? value,
        set: setDraft,
        end: () => setDraft(null),
    };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="flex flex-col gap-1 text-sm font-semibold">
            {label}
            {children}
        </label>
    );
}

/** The warning of the Controle list, shown again at the field it is about (B94, B98). */
function FieldIssues({ issues }: { issues: readonly CheckIssue[] }) {
    const { locale } = usePage().props;

    return (
        <>
            {issues.map((issue) => (
                <p
                    key={issue.id}
                    className="m-0 flex items-start gap-2 rounded-control bg-warning px-3 py-2 text-sm"
                >
                    <WarningIcon size={18} className="mt-0.5 shrink-0" />
                    <span>
                        <strong>{issue.severityLabel[locale]}:</strong>{' '}
                        {issue.message[locale]}
                    </span>
                </p>
            ))}
        </>
    );
}

export function ElementPanel({
    session,
    edition,
    resolved,
    editKey,
    title,
    subtitle,
    context,
    onAct,
    layout,
    cache,
    issues,
    siblings,
    position,
    area,
    selectedLayer = null,
    onSelectLayer,
    onRemovePawn,
}: ElementPanelProps) {
    const t = useTranslation();
    const { locale } = usePage().props;
    const { repository } = useServices();
    const kind = parseKey(editKey)?.kind;
    const allowed: readonly ElementField[] =
        kind === undefined ? [] : ALLOWED_FIELDS[kind];
    const override: ElementOverride | undefined = edition.elements[editKey];
    const placement = override?.photo;
    const fileInput = useRef<HTMLInputElement>(null);
    const [uploads, setUploads] = useState<Upload[]>([]);
    const [uploadsKey, setUploadsKey] = useState(editKey);
    // Errors belong to the element they were made for: another element starts clean.
    if (uploadsKey !== editKey) {
        setUploadsKey(editKey);
        setUploads((list) => list.filter((item) => item.kind === 'working'));
    }
    const [dragging, setDragging] = useState(false);
    const act = onAct;

    const dpi =
        placement !== undefined && context !== null
            ? placementDpi(placement, context)
            : null;
    const zoomPercent = Math.round((placement?.scale ?? 1) * 100);
    const supportedLayouts = THEME_LAYOUTS[edition.theme];
    const nameDraft = useDraft(
        override?.name ?? currentName(resolved, edition, editKey),
    );
    const textDraft = useDraft(
        override?.text ?? currentText(resolved, editKey),
    );
    const bankDraft = useDraft(edition.elements[BANK_KEY]?.name ?? '');
    const amountDraft = useDraft(
        override?.amount === undefined ? '' : String(override.amount),
    );
    const card = resolved.decks?.chance
        .concat(resolved.decks.chest)
        .find((candidate) => `card.${candidate.id}` === editKey);
    const isNote = kind === 'note';
    const noteColor = resolved.money?.notes.find(
        (note) => `note.${note.value}` === editKey,
    )?.color;
    const showPhoto = allowed.includes('photo') && kind !== 'boardCenter';

    const assign = async (files: File[]): Promise<void> => {
        // A new choice replaces the errors of the previous one.
        setUploads((list) => list.filter((item) => item.kind === 'working'));
        const targets = [editKey, ...siblings].slice(0, files.length);
        for (const [index, file] of files.entries()) {
            const key = targets[index];
            if (key === undefined) {
                break;
            }
            const result = await ingestPhoto(
                file,
                repository,
                edition.id,
                (stage) =>
                    setUploads((list) => [
                        ...list.filter(
                            (item) =>
                                item.kind !== 'working' ||
                                item.name !== file.name,
                        ),
                        { kind: 'working', name: file.name, stage },
                    ]),
            );
            setUploads((list) =>
                list.filter(
                    (item) =>
                        item.kind !== 'working' || item.name !== file.name,
                ),
            );
            if (!result.ok) {
                setUploads((list) => [
                    ...list,
                    'storageFull' in result
                        ? { kind: 'storage-full', name: result.fileName }
                        : { kind: 'error', error: result.error },
                ]);
                continue;
            }
            cache.add(result.record);
            const base = defaultTransform();
            const targetKind = parseKey(key)?.kind;
            const hasLayout =
                targetKind !== undefined &&
                ALLOWED_FIELDS[targetKind].includes('layout');
            const current = session.edition.elements[key];
            const needsFrame =
                hasLayout &&
                (current?.layout === undefined || current.layout === 'text');
            editElement(session, key, {
                photo: {
                    photoId: result.record.id,
                    cx: base.x,
                    cy: base.y,
                    scale: base.scale,
                    rotation: base.rotation,
                    grayscale: false,
                },
                ...(needsFrame ? { layout: 'frame' as const } : {}),
            });
        }
    };

    const onChoose = (event: ChangeEvent<HTMLInputElement>): void => {
        const files = [...(event.target.files ?? [])];
        event.target.value = '';
        if (files.length > 0) {
            void assign(files);
        }
    };

    const onDrop = (event: DragEvent<HTMLElement>): void => {
        event.preventDefault();
        setDragging(false);
        const files = [...event.dataTransfer.files];
        if (files.length > 0 && allowed.includes('photo')) {
            void assign(files);
        }
    };

    const layoutLabel = (id: LayoutId): string => {
        if (id === 'frame') {
            return t('editor.layout_frame');
        }
        if (id === 'text') {
            return t('editor.layout_text');
        }

        return t(
            kind === 'space'
                ? 'editor.layout_full_space'
                : 'editor.layout_full_card',
        );
    };

    const photoIssues = issuesFor(issues, editKey, 'photo');
    const textIssues = [
        ...issuesFor(issues, editKey, 'name'),
        ...issuesFor(issues, editKey, 'text'),
    ];
    const space = position === undefined ? undefined : spaceAt(position);
    const price =
        space !== undefined && 'price' in space
            ? formatMoney(space.price, resolved.currency.id, resolved.language)
            : null;
    const group =
        space?.type === 'street'
            ? standardEdition.groups.find(
                  (candidate) => candidate.id === space.group,
              )
            : undefined;

    return (
        <aside
            aria-label={t('editor.properties')}
            onDragOver={(event) => {
                if (allowed.includes('photo')) {
                    event.preventDefault();
                    setDragging(true);
                }
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
                'flex min-h-0 flex-col gap-5 overflow-auto bg-card p-4 md:p-6',
                dragging &&
                    'outline-3 -outline-offset-8 outline-ink outline-dashed',
            )}
        >
            <div className="hidden lg:block">
                <h2 className="m-0 font-display text-2xl font-extrabold">
                    {title}
                </h2>
                <p className="m-0 text-sm text-ink-soft">{subtitle}</p>
            </div>

            {allowed.includes('layout') && (
                <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
                    <legend className="mb-2 text-sm font-semibold">
                        {t('editor.layout')}
                    </legend>
                    <LayoutTiles
                        layouts={supportedLayouts}
                        value={layout}
                        label={layoutLabel}
                        onChange={(id) =>
                            editElement(session, editKey, { layout: id })
                        }
                    />
                </fieldset>
            )}

            {allowed.includes('name') && (
                <Field label={t('editor.name')}>
                    <Input
                        data-field="name"
                        value={nameDraft.shown}
                        aria-invalid={textIssues.length > 0}
                        onBlur={nameDraft.end}
                        onChange={(event) => {
                            nameDraft.set(event.target.value);
                            editElement(
                                session,
                                editKey,
                                {
                                    name:
                                        event.target.value === ''
                                            ? undefined
                                            : event.target.value,
                                },
                                `name:${editKey}`,
                            );
                        }}
                    />
                </Field>
            )}

            {allowed.includes('text') && (
                <Field
                    label={t(
                        kind === 'houseRules'
                            ? 'editor.kind_houseRules'
                            : 'editor.story',
                    )}
                >
                    <Textarea
                        data-field="text"
                        rows={kind === 'houseRules' ? 10 : 5}
                        value={textDraft.shown}
                        aria-invalid={textIssues.length > 0}
                        onBlur={textDraft.end}
                        onChange={(event) => {
                            textDraft.set(event.target.value);
                            editElement(
                                session,
                                editKey,
                                {
                                    text:
                                        event.target.value === ''
                                            ? undefined
                                            : event.target.value,
                                },
                                `text:${editKey}`,
                            );
                        }}
                    />
                    {kind === 'houseRules' && (
                        <span className="text-xs font-normal text-ink-soft">
                            {t('editor.house_rules_hint')}
                        </span>
                    )}
                </Field>
            )}
            <FieldIssues issues={textIssues} />

            {card !== undefined && (
                <div className="flex flex-col gap-1 rounded-control bg-paper p-3 text-sm">
                    <span className="text-ink-soft">
                        {t('editor.standard_card')}
                    </span>
                    <span>{card.originalText}</span>
                    <span className="text-ink-soft">
                        {t('editor.standard_effect')}: {card.effect}
                    </span>
                    <button
                        type="button"
                        disabled={override?.text === undefined}
                        onClick={() =>
                            editElement(session, editKey, { text: undefined })
                        }
                        className="min-h-11 cursor-pointer self-start border-0 bg-transparent p-0 text-sm font-semibold underline underline-offset-4 disabled:cursor-default disabled:opacity-40"
                    >
                        {t('editor.restore')}
                    </button>
                </div>
            )}

            {allowed.includes('amount') && (
                <Field label={t('editor.amount')}>
                    <Input
                        inputMode="numeric"
                        value={amountDraft.shown}
                        onBlur={amountDraft.end}
                        onChange={(event) => {
                            const raw = event.target.value.trim();
                            amountDraft.set(event.target.value);
                            const number = Number(raw);
                            if (raw === '') {
                                editElement(
                                    session,
                                    editKey,
                                    { amount: undefined },
                                    `amount:${editKey}`,
                                );
                            } else if (
                                Number.isInteger(number) &&
                                Math.abs(number) <= 100000
                            ) {
                                editElement(
                                    session,
                                    editKey,
                                    { amount: number },
                                    `amount:${editKey}`,
                                );
                            }
                        }}
                    />
                    <span className="text-xs font-normal text-ink-soft">
                        {t('editor.amount_hint')}
                    </span>
                </Field>
            )}

            {isNote && noteColor !== undefined && (
                <>
                    <div className="flex flex-col gap-2">
                        <span className="text-sm font-semibold">
                            {t('editor.color')}
                        </span>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                aria-label={t('editor.color')}
                                value={noteColor}
                                onChange={(event) =>
                                    editElement(
                                        session,
                                        editKey,
                                        { color: event.target.value },
                                        `color:${editKey}`,
                                    )
                                }
                                className="h-12 w-16 cursor-pointer rounded-control border-2 border-ink bg-card p-1"
                            />
                            <span className="font-mono text-sm">
                                {noteColor.toUpperCase()}
                            </span>
                            <button
                                type="button"
                                disabled={override?.color === undefined}
                                onClick={() =>
                                    editElement(session, editKey, {
                                        color: undefined,
                                    })
                                }
                                className="min-h-11 cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold underline underline-offset-4 disabled:cursor-default disabled:opacity-40"
                            >
                                {t('editor.restore')}
                            </button>
                        </div>
                    </div>
                    <Field label={t('editor.bank_name')}>
                        <Input
                            value={bankDraft.shown}
                            onBlur={bankDraft.end}
                            onChange={(event) => {
                                bankDraft.set(event.target.value);
                                editElement(
                                    session,
                                    BANK_KEY,
                                    {
                                        name:
                                            event.target.value === ''
                                                ? undefined
                                                : event.target.value,
                                    },
                                    `name:${BANK_KEY}`,
                                );
                            }}
                        />
                        <span className="text-xs font-normal text-ink-soft">
                            {t('editor.bank_hint')}
                        </span>
                    </Field>
                    <p className="m-0 text-base">
                        <span className="font-semibold">
                            {t('editor.count')}
                        </span>{' '}
                        {resolved.money?.notes.find(
                            (note) => `note.${note.value}` === editKey,
                        )?.count ?? ''}{' '}
                        <span className="text-ink-soft">
                            · {t('editor.fixed')}
                        </span>
                    </p>
                </>
            )}

            {allowed.includes('layers') && area !== undefined && (
                <LayerPanel
                    session={session}
                    edition={edition}
                    editKey={editKey}
                    area={area}
                    layers={override?.layers ?? []}
                    selectedId={selectedLayer}
                    onSelect={onSelectLayer ?? (() => undefined)}
                    cache={cache}
                    title={
                        kind === 'boardCenter'
                            ? (resolved.boardCenter.name ?? edition.name)
                            : undefined
                    }
                />
            )}

            {showPhoto && (
                <div className="flex flex-col gap-3">
                    <span className="text-sm font-semibold">
                        {t('editor.photo')}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            data-field="photo"
                            variant="secondary"
                            className="flex-1"
                            onClick={() => fileInput.current?.click()}
                        >
                            {t('editor.photo_choose')}
                        </Button>
                        <input
                            ref={fileInput}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                            multiple
                            hidden
                            data-testid="photo-input"
                            onChange={onChoose}
                        />
                        <Button
                            variant="icon"
                            aria-label={t('editor.photo_rotate')}
                            disabled={context === null}
                            onClick={() => act({ type: 'rotate', turns: 1 })}
                        >
                            ⟳
                        </Button>
                        <Button
                            variant="icon"
                            aria-label={t('editor.photo_remove')}
                            disabled={placement === undefined}
                            onClick={() =>
                                editElement(session, editKey, {
                                    photo: undefined,
                                })
                            }
                        >
                            ✕
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="icon"
                            aria-label={t('editor.zoom_out')}
                            disabled={context === null}
                            onClick={() =>
                                act(
                                    { type: 'zoom-by', delta: -0.1 },
                                    t('editor.zoom_announce', {
                                        percent: Math.max(
                                            MIN_ZOOM * 100,
                                            zoomPercent - 10,
                                        ),
                                    }),
                                )
                            }
                        >
                            −
                        </Button>
                        <label className="flex flex-1 flex-col gap-1 text-sm font-semibold">
                            <span>
                                {t('editor.zoom')}{' '}
                                <span className="font-mono font-normal">
                                    {zoomPercent}%
                                </span>
                            </span>
                            <input
                                type="range"
                                min={MIN_ZOOM * 100}
                                max={MAX_ZOOM * 100}
                                step={1}
                                value={zoomPercent}
                                disabled={context === null}
                                onChange={(event) =>
                                    act({
                                        type: 'zoom-to',
                                        scale: Number(event.target.value) / 100,
                                    })
                                }
                                className="h-11 accent-ink"
                            />
                        </label>
                        <Button
                            variant="icon"
                            aria-label={t('editor.zoom_in')}
                            disabled={context === null}
                            onClick={() =>
                                act(
                                    { type: 'zoom-by', delta: 0.1 },
                                    t('editor.zoom_announce', {
                                        percent: Math.min(
                                            MAX_ZOOM * 100,
                                            zoomPercent + 10,
                                        ),
                                    }),
                                )
                            }
                        >
                            +
                        </Button>
                    </div>

                    <label className="flex min-h-11 items-center gap-2 text-base">
                        <input
                            type="checkbox"
                            className="size-5 accent-ink"
                            checked={placement?.grayscale ?? false}
                            disabled={context === null}
                            onChange={(event) =>
                                act({
                                    type: 'grayscale',
                                    on: event.target.checked,
                                })
                            }
                        />
                        {t('editor.grayscale')}
                    </label>

                    {dpi !== null && (
                        <p className="m-0 text-sm text-ink-soft">
                            {resolutionLabel(dpi, locale)}
                        </p>
                    )}
                    <FieldIssues issues={photoIssues} />

                    {uploads.map((upload) =>
                        upload.kind === 'working' ? (
                            <p
                                key={`w-${upload.name}`}
                                role="status"
                                className="m-0 text-sm text-ink-soft"
                            >
                                {upload.name} ·{' '}
                                {upload.stage === 'converting'
                                    ? t('editor.photo_converting')
                                    : t('editor.photo_resizing')}
                            </p>
                        ) : upload.kind === 'error' ? (
                            <p
                                key={`e-${upload.error.fileName}`}
                                role="alert"
                                className="m-0 flex items-start gap-2 rounded-control border-2 border-press px-3 py-2 text-sm"
                            >
                                <WarningIcon
                                    size={18}
                                    className="mt-0.5 shrink-0"
                                />
                                <span>
                                    <strong>{upload.error.fileName}</strong>{' '}
                                    {upload.error.rest[locale]}
                                </span>
                            </p>
                        ) : (
                            <p
                                key={`s-${upload.name}`}
                                role="alert"
                                className="m-0 rounded-control border-2 border-press px-3 py-2 text-sm"
                            >
                                <strong>{upload.name}</strong>{' '}
                                {t('editor.photo_storage_full')}
                            </p>
                        ),
                    )}
                    {uploads.length === 0 && (
                        <p className="m-0 text-xs text-ink-soft">
                            {t('editor.photo_drop_hint')}
                        </p>
                    )}
                </div>
            )}

            {price !== null && (
                <p className="m-0 text-base">
                    <span className="font-semibold">{t('editor.price')}</span>{' '}
                    {price}{' '}
                    <span className="text-ink-soft">· {t('editor.fixed')}</span>
                </p>
            )}
            {group !== undefined && (
                <p className="m-0 flex items-center gap-2 text-sm">
                    <span
                        aria-hidden="true"
                        className="rounded-sm size-4 border border-ink"
                        style={{ background: group.color }}
                    />
                    {group.name[resolved.language]}
                </p>
            )}

            {kind === 'pawn' && (
                <button
                    type="button"
                    onClick={() => {
                        editElement(session, editKey, { hidden: true });
                        onRemovePawn?.();
                    }}
                    className="min-h-12 cursor-pointer self-start border-0 bg-transparent p-0 text-base font-semibold text-press underline underline-offset-4"
                >
                    {t('editor.pawn_remove')}
                </button>
            )}

            <Button
                variant="secondary"
                disabled={override === undefined}
                onClick={() => resetElement(session, editKey)}
            >
                {t('editor.reset')}
            </Button>
        </aside>
    );
}
