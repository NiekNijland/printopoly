import { usePage } from '@inertiajs/react';

import { editElement } from '@/features/edition/editor/edit';
import { LayerPanel } from '@/features/edition/editor/layer-panel';
import { PartStyleField } from '@/features/edition/editor/part-style-field';
import { GroupColorField } from '@/features/edition/editor/style-controls';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import { groupColorName } from '@/lib/render/edition-group-names';
import type { ElementKind } from '@/lib/render/edition-keys';
import { partStyleIds } from '@/lib/render/edition-part-styles';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import type { Edition } from '@/lib/render/edition-types';
import type { LayerArea } from '@/lib/render/editor-layers';
import {
    hasOwnStyle,
    styledPartOfKey,
} from '@/lib/render/editor-panel-sections';
import type { PhotoCache } from '@/lib/render/editor-photo-cache';
import { standardEdition } from '@/lib/render/standard-edition';
import { THEMES } from '@/lib/render/themes';
import type { GroupId, Space } from '@/types/game';

import { CenterPlaceControls } from './center-place-controls';
import { FieldLabel } from './panel-parts';
import { LidNameControls, TitleControls } from './title-controls';

type StyleSectionProps = {
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
};

/**
 * The Stijl section (B141): the colour of a street group, the paper of a note, and the free layers of the board
 * centre and the box lid, which are extras on top of the element (§3.4). The card back has none (B203).
 */
export const StyleSection = (props: StyleSectionProps) => {
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
};

const NoteColorField = ({
    session,
    edition,
    resolved,
    editKey,
}: Pick<StyleSectionProps, 'session' | 'edition' | 'resolved' | 'editKey'>) => {
    const t = useTranslation();
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
                <span className="font-mono text-sm">{color.toUpperCase()}</span>
            </div>
        </div>
    );
};

const ElementLayers = ({
    session,
    edition,
    resolved,
    editKey,
    kind,
    cache,
    area,
    selectedLayer,
    onSelectLayer,
}: Omit<StyleSectionProps, 'space' | 'area'> & { area: LayerArea }) => {
    const t = useTranslation();

    return (
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
                    .querySelector<HTMLElement>('[data-field="center-place"]')
                    ?.focus()
            }
        />
    );
};

const StreetColorField = ({
    session,
    edition,
    resolved,
    group,
}: Pick<StyleSectionProps, 'session' | 'edition' | 'resolved'> & {
    group: GroupId;
}) => {
    const t = useTranslation();
    const { locale } = usePage().props;
    const count = standardEdition.spaces.filter(
        (candidate) => candidate.type === 'street' && candidate.group === group,
    ).length;

    return (
        <GroupColorField
            session={session}
            edition={edition}
            resolved={resolved}
            group={group}
            label={t('editor.group_color')}
            tag={t('editor.group_streets', {
                count,
                color: groupColorName(edition, group, locale).before,
            })}
        />
    );
};

const TitlePlace = ({
    session,
    edition,
    resolved,
    editKey,
    kind,
}: Pick<
    StyleSectionProps,
    'session' | 'edition' | 'resolved' | 'editKey' | 'kind'
>) => {
    const lid = resolved.boxLid;
    // The board centre always has its layout (B187): where the name, photo or logo sit, and how large. The box lid
    // can move its title over a photo over the whole lid (B170).
    return kind === 'boardCenter' ? (
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
};

const ElementStyle = ({
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
}: StyleSectionProps) => {
    if (space?.type === 'street') {
        return (
            <StreetColorField
                session={session}
                edition={edition}
                resolved={resolved}
                group={space.group}
            />
        );
    }

    if (kind === 'note') {
        return (
            <NoteColorField
                session={session}
                resolved={resolved}
                editKey={editKey}
                edition={edition}
            />
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

    return (
        <>
            <TitlePlace
                session={session}
                edition={edition}
                resolved={resolved}
                editKey={editKey}
                kind={kind}
            />
            <ElementLayers
                session={session}
                edition={edition}
                resolved={resolved}
                editKey={editKey}
                kind={kind}
                cache={cache}
                area={area}
                selectedLayer={selectedLayer}
                onSelectLayer={onSelectLayer}
            />
        </>
    );
};
