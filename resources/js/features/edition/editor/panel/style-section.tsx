import { usePage } from '@inertiajs/react';

import { WarningIcon } from '@/components/ui/icons';
import { editElement } from '@/features/edition/editor/edit';
import { LayerPanel } from '@/features/edition/editor/layer-panel';
import { PartStyleField } from '@/features/edition/editor/part-style-field';
import { GroupColorField } from '@/features/edition/editor/style-controls';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import { CENTER_PLACES, type CenterPlace } from '@/lib/render/center-layout';
import { groupColorName } from '@/lib/render/edition-group-names';
import type { ElementKind } from '@/lib/render/edition-keys';
import { partStyleIds } from '@/lib/render/edition-part-styles';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import { MIN_TITLE_SCALE } from '@/lib/render/edition-schema-limits';
import type { Edition, TitleStyle } from '@/lib/render/edition-types';
import type { LayerArea } from '@/lib/render/editor-layers';
import {
    hasOwnStyle,
    styledPartOfKey,
} from '@/lib/render/editor-panel-sections';
import type { PhotoCache } from '@/lib/render/editor-photo-cache';
import { standardEdition } from '@/lib/render/standard-edition';
import { THEMES } from '@/lib/render/themes';
import type { Space } from '@/types/game';

import { CheckField, ChoiceRow, FieldLabel, RangeField } from './panel-parts';
import { TitleStyleField } from './title-style-field';

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
 * centre and the box lid, which are extras on top of the element (§3.4). The card back has none (B203).
 */
export function StyleSection(props: StyleSectionProps) {
    const { locale } = usePage().props;
    const part = styledPartOfKey(props.editKey);
    const own = hasOwnStyle(props.editKey) ? <ElementStyle {...props} /> : null;

    if (part === null || partStyleIds(part).length === 0) {
        return own;
    }

    // The style of the whole part (B268), after what belongs to this element alone.
    return (
        <div className="flex flex-col gap-4">
            {own}
            <PartStyleField
                session={props.session}
                edition={props.edition}
                resolved={props.resolved}
                part={part}
                interfaceLanguage={locale}
            />
        </div>
    );
}

function ElementStyle({
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

    // B203: the card back has no free layers any more; its photo or pattern is in Afbeelding. A card or a deed has
    // none either: its Stijl section only holds the style of the cards or the deeds (B269).
    if (
        area === undefined ||
        kind === 'cardBack' ||
        kind === 'card' ||
        kind === 'deed'
    ) {
        return null;
    }

    const lid = resolved.boxLid;
    // The board centre always has its layout (B187): where the name, photo or logo sit, and how large. The box lid
    // can move its title over a photo over the whole lid (B170).
    const title =
        kind === 'boardCenter' ? (
            <CenterPlaceControls
                session={session}
                editKey={editKey}
                resolved={resolved}
                theme={edition.theme}
            />
        ) : kind === 'boxLid' &&
          lid !== null &&
          (lid.photo === undefined || lid.logo) ? (
            // The lid shows the name on a plate above the board or the logo (B256): its look is a choice of its own.
            <LidNameControls
                session={session}
                editKey={editKey}
                value={lid.titleStyle}
                theme={edition.theme}
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
                            '[data-field="center-place"]',
                        )
                        ?.focus()
                }
            />
        </>
    );
}

/** A board centre in miniature: the fold cross, the card spots and the name in one place (B187). */
function PlaceIcon({ place }: { place: CenterPlace }) {
    const [cx, cy] =
        place === 'topRight'
            ? [27, 11]
            : place === 'bottomLeft'
              ? [11, 27]
              : [19, 19];
    const length = place === 'middle' ? 28 : 16;

    return (
        <svg aria-hidden="true" viewBox="0 0 38 38" className="size-8 shrink-0">
            <rect
                x="1"
                y="1"
                width="36"
                height="36"
                rx="2"
                fill="var(--color-board)"
                stroke="var(--color-ink)"
                strokeWidth="1.5"
            />
            <path
                d="M19 1v36M1 19h36"
                stroke="var(--color-press)"
                strokeWidth="1.2"
                strokeDasharray="2 1.6"
            />
            {[10, 28].map((c) => (
                <rect
                    key={c}
                    x={c - 2.5}
                    y={c - 3.5}
                    width="5"
                    height="7"
                    transform={`rotate(45 ${c} ${c})`}
                    fill="var(--color-card)"
                    stroke="var(--color-ink)"
                    strokeWidth="0.8"
                />
            ))}
            <rect
                x={cx - length / 2}
                y={cy - 2.6}
                width={length}
                height="5.2"
                rx="1"
                transform={`rotate(-45 ${cx} ${cy})`}
                fill="var(--color-ink)"
            />
        </svg>
    );
}

/**
 * The name or logo on the board centre: where it sits (B187; back on 24 nov, Niek wanted the name in the middle as on
 * the classic board), a logo straight or on the diagonal, the size of name or logo, and "Titel tonen" when a photo
 * is in the centre.
 */
function CenterPlaceControls({
    session,
    editKey,
    resolved,
    theme,
}: {
    session: EditionSession;
    editKey: string;
    resolved: ResolvedEdition;
    theme: Edition['theme'];
}) {
    const t = useTranslation();
    const centre = resolved.boardCenter;
    const logo = centre.mode === 'logo' && centre.photo !== undefined;
    const withPhoto =
        centre.background !== undefined ||
        (centre.mode === 'photo' && centre.photo !== undefined);
    const percent = Math.round(centre.titleScale * 100);
    const standard =
        centre.place === 'topRight' &&
        !centre.logoTilt &&
        centre.titleScale === 1 &&
        centre.titleOffset === 0 &&
        !centre.titleHidden &&
        centre.titleStyle === undefined;

    return (
        <div
            className="flex flex-col gap-3 rounded-control border-2 border-ink bg-paper p-3"
            data-testid="center-place"
            // Controle points here when an older edition still has its name over the fold (B183).
            data-field="center-place"
            tabIndex={-1}
        >
            <FieldLabel
                label={t(logo ? 'editor.center_logo' : 'editor.center_name')}
                onStandard={
                    standard
                        ? undefined
                        : () =>
                              editElement(session, editKey, {
                                  centerPlace: undefined,
                                  logoTilt: undefined,
                                  titleOffset: undefined,
                                  titleScale: undefined,
                                  titleHidden: undefined,
                                  titleStyle: undefined,
                              })
                }
            />
            <ChoiceRow<CenterPlace>
                label={t('editor.center_place')}
                fields={{ [centre.place]: 'center-place' }}
                options={CENTER_PLACES.map((place) => ({
                    id: place,
                    label: t(`editor.center_place_${place}`),
                    icon: <PlaceIcon place={place} />,
                }))}
                value={centre.place}
                onChange={(place) =>
                    editElement(session, editKey, {
                        centerPlace: place === 'topRight' ? undefined : place,
                        titleOffset: undefined,
                    })
                }
            />
            {centre.place === 'middle' && (
                <p className="m-0 flex items-start gap-2 text-sm">
                    <WarningIcon size={18} className="mt-0.5 shrink-0" />
                    {t('editor.center_place_middle_hint')}
                </p>
            )}
            {!logo && !centre.titleHidden && (
                <TitleStyleField
                    session={session}
                    editKey={editKey}
                    value={centre.titleStyle}
                    theme={THEMES[theme]}
                />
            )}
            {logo && (
                <ChoiceRow<'straight' | 'tilt'>
                    name={t('editor.logo_angle')}
                    label={t('editor.logo_angle')}
                    options={[
                        { id: 'straight', label: t('editor.logo_straight') },
                        { id: 'tilt', label: t('editor.logo_tilt') },
                    ]}
                    value={centre.logoTilt ? 'tilt' : 'straight'}
                    onChange={(next) =>
                        editElement(session, editKey, {
                            logoTilt: next === 'tilt' ? true : undefined,
                        })
                    }
                />
            )}
            {(logo || !centre.titleHidden) && (
                <RangeField
                    label={t(logo ? 'editor.logo_size' : 'editor.title_size')}
                    shown={
                        <span className="font-mono font-normal">
                            {percent}%
                        </span>
                    }
                    min={MIN_TITLE_SCALE * 100}
                    max={100}
                    step={5}
                    value={percent}
                    valueText={`${String(percent)}%`}
                    field="title-size"
                    onChange={(value) => {
                        const next = value / 100;
                        editElement(
                            session,
                            editKey,
                            { titleScale: next >= 1 ? undefined : next },
                            `title-scale:${editKey}`,
                        );
                    }}
                />
            )}
            {withPhoto && !logo && (
                <CheckField
                    label={t('editor.title_show')}
                    checked={!centre.titleHidden}
                    field="title-hidden"
                    onCheckedChange={(checked) =>
                        editElement(session, editKey, {
                            titleHidden: checked ? undefined : true,
                        })
                    }
                />
            )}
        </div>
    );
}

/** The name on the box lid above the board or the logo (B256): only its look (Niek, 22 nov). */
function LidNameControls({
    session,
    editKey,
    value,
    theme,
}: {
    session: EditionSession;
    editKey: string;
    value: TitleStyle | undefined;
    theme: Edition['theme'];
}) {
    const t = useTranslation();

    return (
        <div
            className="flex flex-col gap-3 rounded-control border-2 border-ink bg-paper p-3"
            data-testid="lid-name"
        >
            <FieldLabel
                label={t('editor.lid_name')}
                onStandard={
                    value === undefined
                        ? undefined
                        : () =>
                              editElement(session, editKey, {
                                  titleStyle: undefined,
                              })
                }
            />
            <TitleStyleField
                session={session}
                editKey={editKey}
                value={value}
                theme={THEMES[theme]}
            />
        </div>
    );
}

/** Steps of the title position: top, a bit up, the standard place, a bit down, bottom. */
const OFFSETS = [-1, -0.5, 0, 0.5, 1] as const;

/** "Hoogte": the title up or down over a photo, in five steps that read as words ("midden"). */
function TitleHeight({
    session,
    editKey,
    step,
}: {
    session: EditionSession;
    editKey: string;
    step: (typeof OFFSETS)[number];
}) {
    const t = useTranslation();
    const index = OFFSETS.indexOf(step);
    const word = t(`editor.title_height_${String(index)}`);

    return (
        <RangeField
            label={t('editor.title_height')}
            shown={<span className="font-normal text-ink-soft">{word}</span>}
            min={0}
            max={OFFSETS.length - 1}
            value={index}
            valueText={word}
            field="title-offset"
            onChange={(value) => {
                const next = OFFSETS[value] ?? 0;
                editElement(
                    session,
                    editKey,
                    { titleOffset: next === 0 ? undefined : next },
                    `title-offset:${editKey}`,
                );
            }}
        />
    );
}

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
                    <TitleHeight
                        session={session}
                        editKey={editKey}
                        step={step}
                    />
                    {scale !== undefined && (
                        <RangeField
                            label={t('editor.title_size')}
                            shown={
                                <span className="font-mono font-normal">
                                    {percent}%
                                </span>
                            }
                            min={MIN_TITLE_SCALE * 100}
                            max={100}
                            step={5}
                            value={percent}
                            valueText={`${String(percent)}%`}
                            onChange={(value) => {
                                const next = value / 100;
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
                        />
                    )}
                </>
            )}
            {hidden !== undefined && (
                <CheckField
                    label={t('editor.title_show')}
                    checked={!hidden}
                    field="title-hidden"
                    onCheckedChange={(checked) =>
                        editElement(session, editKey, {
                            titleHidden: checked ? undefined : true,
                        })
                    }
                />
            )}
            {band !== undefined && (
                <CheckField
                    label={t('editor.title_band')}
                    checked={band}
                    field="title-band"
                    onCheckedChange={(checked) =>
                        editElement(session, editKey, {
                            titleBand: checked ? undefined : false,
                        })
                    }
                />
            )}
        </div>
    );
}
