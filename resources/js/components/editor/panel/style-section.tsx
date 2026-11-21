import { usePage } from '@inertiajs/react';

import { LayerPanel } from '@/components/editor/layer-panel';
import { GroupColorField } from '@/components/editor/style-controls';
import { useTranslation } from '@/hooks/use-translation';
import { groupColorName } from '@/lib/edition/group-names';
import type { ElementKind } from '@/lib/edition/keys';
import type { ResolvedEdition } from '@/lib/edition/resolve';
import { MIN_TITLE_SCALE } from '@/lib/edition/schema';
import type { EditionSession } from '@/lib/edition/session';
import type { Edition } from '@/lib/edition/types';
import { editElement } from '@/lib/editor/edit';
import type { LayerArea } from '@/lib/editor/layers';
import type { PhotoCache } from '@/lib/editor/photo-cache';
import { standardEdition } from '@/lib/game/standard-edition';
import type { Space } from '@/lib/game/types';
import { THEMES } from '@/lib/render/themes';

import { FieldLabel } from './panel-parts';

interface StyleSectionProps {
    session: EditionSession;
    edition: Edition;
    resolved: ResolvedEdition;
    editKey: string;
    kind: ElementKind;
    space: Space | undefined;
    cache: PhotoCache;
    area?: LayerArea;
    selectedLayer: string | null;
    onSelectLayer: (id: string | null) => void;
}

/**
 * The Stijl section (B141): the colour of a street group, the paper of a note, and the free layers of the board
 * centre, the box lid and the card backs, which are extras on top of the element (§3.4).
 */
export function StyleSection({
    session,
    edition,
    resolved,
    editKey,
    kind,
    space,
    cache,
    area,
    selectedLayer,
    onSelectLayer,
}: StyleSectionProps) {
    const t = useTranslation();
    const { locale } = usePage().props;

    if (space?.type === 'street') {
        const count = standardEdition.spaces.filter(
            (candidate) =>
                candidate.type === 'street' && candidate.group === space.group,
        ).length;

        return (
            <GroupColorField
                session={session}
                edition={edition}
                resolved={resolved}
                group={space.group}
                label={t('editor.group_color')}
                tag={t('editor.group_streets', {
                    count,
                    color: groupColorName(edition, space.group, locale).before,
                })}
            />
        );
    }

    if (kind === 'note') {
        const color = resolved.money?.notes.find(
            (note) => `note.${note.value}` === editKey,
        )?.color;
        if (color === undefined) {
            return null;
        }

        return (
            <div className="flex flex-col gap-1">
                <FieldLabel
                    htmlFor={`note-color-${editKey}`}
                    label={t('editor.color')}
                    onStandard={
                        edition.elements[editKey]?.color === undefined
                            ? undefined
                            : () =>
                                  editElement(session, editKey, {
                                      color: undefined,
                                  })
                    }
                />
                <div className="flex items-center gap-3">
                    <input
                        id={`note-color-${editKey}`}
                        type="color"
                        value={color.toLowerCase()}
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
                        {color.toUpperCase()}
                    </span>
                </div>
            </div>
        );
    }

    if (area === undefined) {
        return null;
    }

    const centre = resolved.boardCenter;
    const lid = resolved.boxLid;
    // The title can move or shrink when a photo is under it (B170): a photo over the whole centre or above the name,
    // or a photo over the whole lid.
    const title =
        kind === 'boardCenter' &&
        centre.mode !== 'logo' &&
        (centre.background !== undefined ||
            (centre.mode === 'photo' && centre.photo !== undefined)) ? (
            <TitleControls
                session={session}
                editKey={editKey}
                offset={centre.titleOffset}
                scale={centre.titleScale}
                hidden={centre.titleHidden}
            />
        ) : kind === 'boxLid' &&
          lid !== null &&
          lid.photo !== undefined &&
          lid.photoStyle === 'full' ? (
            <TitleControls
                session={session}
                editKey={editKey}
                offset={lid.titleOffset}
                band={lid.titleBand}
            />
        ) : null;

    return (
        <>
            {title}
            <LayerPanel
                session={session}
                edition={edition}
                editKey={editKey}
                area={area}
                layers={edition.elements[editKey]?.layers ?? []}
                selectedId={selectedLayer}
                onSelect={onSelectLayer}
                cache={cache}
                tag={
                    kind === 'boardCenter'
                        ? t('editor.layers_center_tag')
                        : undefined
                }
                title={
                    kind === 'boardCenter'
                        ? (resolved.boardCenter.name ?? edition.name)
                        : undefined
                }
                ink={THEMES[edition.theme].ink}
                onTitle={() =>
                    document
                        .querySelector<HTMLElement>(
                            '[data-field="title-offset"]',
                        )
                        ?.focus()
                }
            />
        </>
    );
}

/** Steps of the title position: top, a bit up, the standard place, a bit down, bottom. */
const OFFSETS = [-1, -0.5, 0, 0.5, 1] as const;

/**
 * Where the title goes over a photo (B170, Lisa): up or down, smaller, hidden on the board centre, and on the box lid
 * with or without the light band. The ribbon keeps its look; only its place and size change.
 */
function TitleControls({
    session,
    editKey,
    offset,
    scale,
    hidden,
    band,
}: {
    session: EditionSession;
    editKey: string;
    offset: number;
    scale?: number;
    hidden?: boolean;
    band?: boolean;
}) {
    const t = useTranslation();
    const step = OFFSETS.reduce((best, candidate) =>
        Math.abs(candidate - offset) < Math.abs(best - offset)
            ? candidate
            : best,
    );
    const percent = Math.round((scale ?? 1) * 100);

    return (
        <div
            className="flex flex-col gap-3 rounded-control border-2 border-ink bg-paper p-3"
            data-testid="title-controls"
        >
            <FieldLabel
                label={t('editor.title_place')}
                onStandard={
                    offset === 0 &&
                    (scale ?? 1) === 1 &&
                    hidden !== true &&
                    band !== false
                        ? undefined
                        : () =>
                              editElement(session, editKey, {
                                  titleOffset: undefined,
                                  titleScale: undefined,
                                  titleHidden: undefined,
                                  titleBand: undefined,
                              })
                }
            />
            {hidden !== true && (
                <>
                    <label className="flex flex-col gap-1 text-sm font-semibold">
                        <span>
                            {t('editor.title_height')}{' '}
                            <span className="font-normal text-ink-soft">
                                {t(
                                    `editor.title_height_${String(OFFSETS.indexOf(step))}`,
                                )}
                            </span>
                        </span>
                        <input
                            type="range"
                            min={0}
                            max={OFFSETS.length - 1}
                            step={1}
                            value={OFFSETS.indexOf(step)}
                            data-field="title-offset"
                            aria-valuetext={t(
                                `editor.title_height_${String(OFFSETS.indexOf(step))}`,
                            )}
                            onChange={(event) => {
                                const next =
                                    OFFSETS[Number(event.target.value)] ?? 0;
                                editElement(
                                    session,
                                    editKey,
                                    {
                                        titleOffset:
                                            next === 0 ? undefined : next,
                                    },
                                    `title-offset:${editKey}`,
                                );
                            }}
                            className="h-11 accent-ink"
                        />
                    </label>
                    {scale !== undefined && (
                        <label className="flex flex-col gap-1 text-sm font-semibold">
                            <span>
                                {t('editor.title_size')}{' '}
                                <span className="font-mono font-normal">
                                    {percent}%
                                </span>
                            </span>
                            <input
                                type="range"
                                min={MIN_TITLE_SCALE * 100}
                                max={100}
                                step={5}
                                value={percent}
                                onChange={(event) => {
                                    const next =
                                        Number(event.target.value) / 100;
                                    editElement(
                                        session,
                                        editKey,
                                        {
                                            titleScale:
                                                next >= 1 ? undefined : next,
                                        },
                                        `title-scale:${editKey}`,
                                    );
                                }}
                                className="h-11 accent-ink"
                            />
                        </label>
                    )}
                </>
            )}
            {hidden !== undefined && (
                <label className="flex min-h-11 items-center gap-2 text-base">
                    <input
                        type="checkbox"
                        className="size-5 accent-ink"
                        checked={!hidden}
                        data-field="title-hidden"
                        onChange={(event) =>
                            editElement(session, editKey, {
                                titleHidden: event.target.checked
                                    ? undefined
                                    : true,
                            })
                        }
                    />
                    {t('editor.title_show')}
                </label>
            )}
            {band !== undefined && (
                <label className="flex min-h-11 items-center gap-2 text-base">
                    <input
                        type="checkbox"
                        className="size-5 accent-ink"
                        checked={band}
                        data-field="title-band"
                        onChange={(event) =>
                            editElement(session, editKey, {
                                titleBand: event.target.checked
                                    ? undefined
                                    : false,
                            })
                        }
                    />
                    {t('editor.title_band')}
                </label>
            )}
        </div>
    );
}
