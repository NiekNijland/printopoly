import type { RefObject } from 'react';

import { ElementPreview } from '@/components/render/editor-element-preview';
import {
    BoardHitAreas,
    BoardSurround,
} from '@/features/edition/editor/board-surround';
import { editElement } from '@/features/edition/editor/edit';
import { ElementStage } from '@/features/edition/editor/element-stage';
import { LayerOverlay } from '@/features/edition/editor/layer-overlay';
import type { StageGestures } from '@/features/edition/editor/use-frame-gestures';
import type { WorkspaceView } from '@/features/edition/editor/workspace/workspace-view';
import type { EditionSession } from '@/features/edition/session';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import type { Edition, FreeLayer } from '@/lib/render/edition-types';
import {
    centerZones,
    lidZones,
    replaceLayer,
} from '@/lib/render/editor-layers';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import type { Size } from '@/types/print';

type WorkspaceStageProps = {
    session: EditionSession;
    edition: Edition;
    resolved: ResolvedEdition;
    photos: PhotoInfos;
    view: WorkspaceView;
    editionOpen: boolean;
    wide: boolean;
    size: Size;
    gestures: StageGestures | undefined;
    layers: FreeLayer[];
    layerId: string | null;
    frameKey: string;
    frameRef: RefObject<HTMLDivElement | null>;
    onSelectLayer: (id: string | null) => void;
    onPick: (key: string | undefined) => void;
    onPickSpace: (key: string) => void;
};

const LayerEditor = ({
    session,
    edition,
    view,
    size,
    layers,
    layerId,
    onSelectLayer,
    pxPerMm,
}: Omit<WorkspaceStageProps, 'frameRef'> & { pxPerMm: number }) => {
    const { editKey, editKind } = view;

    return (
        <LayerOverlay
            layers={layers}
            area={size}
            pxPerMm={pxPerMm}
            selectedId={layerId}
            zones={
                editKind === 'boardCenter'
                    ? centerZones(edition.boardProfile)
                    : // The lid shows where its own text is once it has layers (bug 36).
                      editKind === 'boxLid' && layers.length > 0
                      ? lidZones(edition)
                      : undefined
            }
            onSelect={onSelectLayer}
            onChange={(layer, group) =>
                editElement(
                    session,
                    editKey,
                    {
                        layers: replaceLayer(
                            session.edition.elements[editKey]?.layers ?? [],
                            layer,
                        ),
                    },
                    `${group}:${editKey}`,
                )
            }
            onRemove={(id) => {
                editElement(session, editKey, {
                    layers: layers.filter((item) => item.id !== id),
                });
                onSelectLayer(null);
            }}
        />
    );
};

export const WorkspaceStage = ({ frameRef, ...props }: WorkspaceStageProps) => {
    const { view, editionOpen, resolved, photos } = props;
    const { onBoard, editKind, target } = view;

    return (
        <ElementStage
            widthMm={props.size.w}
            heightMm={props.size.h}
            gestures={props.gestures}
            // A phone has a short stage: the space keeps its size there and the board peeks out at the sides.
            fill={
                onBoard && props.wide
                    ? editKind === 'boardCenter'
                        ? 0.72
                        : 0.55
                    : 1
            }
            zoomable={onBoard || editionOpen}
            viewKey={editionOpen ? 'overview' : target.key}
            backdrop={
                onBoard
                    ? ({ pxPerMm, view: stageView }) => (
                          <BoardSurround
                              resolved={resolved}
                              photos={photos}
                              selected={target.key}
                              pxPerMm={pxPerMm}
                              view={stageView}
                              onPick={props.onPick}
                          />
                      )
                    : undefined
            }
            overlay={
                editionOpen
                    ? // The overview board opens a space or the centre on a click (Niek, 24 nov).
                      ({ pxPerMm }) => (
                          <BoardHitAreas
                              resolved={resolved}
                              scale={pxPerMm / (96 / 25.4)}
                              rotation={0}
                              tone="full"
                              onPick={props.onPickSpace}
                          />
                      )
                    : view.hasLayers
                      ? ({ pxPerMm }) => (
                            <LayerEditor {...props} pxPerMm={pxPerMm} />
                        )
                      : undefined
            }
        >
            {/* The key makes the frame be measured again when the photo changes or finishes
                loading: after a reload the photo slot only appears once the cache has the photo. */}
            <div key={props.frameKey} ref={frameRef}>
                <ElementPreview
                    target={target}
                    resolved={resolved}
                    photos={photos}
                />
            </div>
        </ElementStage>
    );
};
