import { LayerPanel } from '@/components/editor/layer-panel';
import {
    ColorStudio,
    GroupColorField,
} from '@/components/editor/style-controls';
import { useTranslation } from '@/hooks/use-translation';
import type { ElementKind } from '@/lib/edition/keys';
import type { ResolvedEdition } from '@/lib/edition/resolve';
import type { EditionSession } from '@/lib/edition/session';
import type { Edition } from '@/lib/edition/types';
import { editElement } from '@/lib/editor/edit';
import type { LayerArea } from '@/lib/editor/layers';
import type { PhotoCache } from '@/lib/editor/photo-cache';
import { standardEdition } from '@/lib/game/standard-edition';
import type { Space } from '@/lib/game/types';

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

    if (kind === 'themeAccent') {
        return (
            <ColorStudio
                session={session}
                edition={edition}
                resolved={resolved}
            />
        );
    }

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
                tag={t(`editor.group_streets_${space.group}`, { count })}
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
        />
    );
}
