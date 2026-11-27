import { useSyncExternalStore } from 'react';

import { AmountSection } from '@/features/edition/editor/panel/amount-section';
import { ImageSection } from '@/features/edition/editor/panel/image-section';
import { PlacedList } from '@/features/edition/editor/panel/placed-list';
import { StyleSection } from '@/features/edition/editor/panel/style-section';
import { TextSection } from '@/features/edition/editor/panel/text-section';
import type { PhotoUpload } from '@/features/edition/editor/panel/use-photo-upload';
import type { EditionSession } from '@/features/edition/session';
import type { CheckIssue } from '@/lib/render/checks-types';
import type { ElementKind } from '@/lib/render/edition-keys';
import type {
    ResolvedCard,
    ResolvedEdition,
} from '@/lib/render/edition-resolve';
import type { Edition } from '@/lib/render/edition-types';
import type { LayerArea } from '@/lib/render/editor-layers';
import type { PanelSection as SectionId } from '@/lib/render/editor-panel-sections';
import type { PhotoCache } from '@/lib/render/editor-photo-cache';
import type {
    PlacementAction,
    PlacementContext,
} from '@/lib/render/editor-placements';
import type { Space } from '@/types/game';

export type SectionBodyProps = {
    id: SectionId;
    session: EditionSession;
    edition: Edition;
    resolved: ResolvedEdition;
    editKey: string;
    kind: ElementKind | undefined;
    space: Space | undefined;
    iconSpace: Space | undefined;
    card: ResolvedCard | undefined;
    own: CheckIssue[];
    photoStyle: boolean;
    context: PlacementContext | null;
    onAct: (action: PlacementAction, announcement?: string) => void;
    cache: PhotoCache;
    upload: PhotoUpload;
    announce: (text: string) => void;
    area?: LayerArea;
    selectedLayer: string | null;
    onSelectLayer?: (id: string | null) => void;
    onOpenWords?: () => void;
};

const ImageBody = ({
    session,
    edition,
    resolved,
    editKey,
    kind,
    iconSpace,
    photoStyle,
    context,
    onAct,
    cache,
    upload,
    announce,
}: SectionBodyProps) => {
    const photos = useSyncExternalStore(cache.subscribe, cache.getSnapshot);

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
                onAnnounce={announce}
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
};

export const SectionBody = (props: SectionBodyProps) => {
    const { id, session, edition, resolved, editKey, kind, space } = props;
    const { card, own, cache, area, selectedLayer, onSelectLayer } = props;

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
                    onOpenWords={props.onOpenWords}
                />
            );
        case 'image':
            return <ImageBody {...props} />;
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
