import { BoardList } from '@/features/edition/editor/board-list';
import { ElementList } from '@/features/edition/editor/element-list';
import { ListPhotosButton } from '@/features/edition/editor/list-photos';
import { ListSearch } from '@/features/edition/editor/list-search';
import { UploadStatus } from '@/features/edition/editor/panel/image-section';
import { PlacedList } from '@/features/edition/editor/panel/placed-list';
import type { usePhotoUpload } from '@/features/edition/editor/panel/use-photo-upload';
import type { EditionSession } from '@/features/edition/session';
import type { Edition, PartId } from '@/lib/render/edition-types';
import type { EditorTab } from '@/lib/render/editor-catalogue';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import type { Locale } from '@/types/game';

type WorkspaceListProps = {
    tab: EditorTab;
    edition: Edition;
    session: EditionSession;
    locale: Locale;
    selected: string;
    warned: ReadonlySet<string>;
    photos: PhotoInfos;
    inSet: ReadonlySet<PartId>;
    query: string;
    upload: ReturnType<typeof usePhotoUpload>;
    onQuery: (next: string) => void;
    onPasteLines: (text: string) => boolean;
    onSelect: (key: string) => void;
    onFocusRow: (key: string) => void;
    onAnnounce: (text: string) => void;
    onSwapPhoto: (from: string, to: string) => void;
};

const BoardUploads = ({
    upload,
    photos,
}: Pick<WorkspaceListProps, 'upload' | 'photos'>) => (
    <div className="flex flex-col gap-2 empty:hidden">
        <UploadStatus upload={upload} />
        {upload.placed?.kind === 'batch' && (
            <PlacedList
                className="mb-3"
                scrollTo="start"
                placed={upload.placed}
                photos={photos}
                onUndo={upload.undoPlaced}
                onClose={upload.dismissPlaced}
                onMove={upload.movePlaced}
                onPlaceMissed={(index, element) =>
                    void upload.placeMissed(index, element)
                }
            />
        )}
    </div>
);

export const WorkspaceList = (props: WorkspaceListProps) => {
    const { tab, upload } = props;
    // The search above the list (B161), one per tab: the board and the cards have long lists.
    const searchable = tab === 'board' || tab === 'cards';

    return (
        <div
            data-scroll-list
            {...(tab === 'board' ? upload.dropProps : {})}
            className="flex scroll-pt-14 flex-col px-4 pb-4 md:min-h-0 md:flex-1 md:overflow-auto low:px-3"
        >
            {searchable && (
                <ListSearch
                    tab={tab}
                    value={props.query}
                    onChange={props.onQuery}
                    onPasteLines={
                        tab === 'board' ? props.onPasteLines : undefined
                    }
                    trailing={
                        tab === 'board' ? (
                            <ListPhotosButton upload={upload} />
                        ) : undefined
                    }
                />
            )}
            {tab === 'board' && (
                <BoardUploads upload={upload} photos={props.photos} />
            )}
            {tab === 'board' ? (
                <BoardList
                    edition={props.edition}
                    interfaceLanguage={props.locale}
                    selected={props.selected}
                    onSelect={props.onSelect}
                    onFocusRow={props.onFocusRow}
                    warned={props.warned}
                    session={props.session}
                    query={props.query}
                    onAnnounce={props.onAnnounce}
                    photos={props.photos}
                    onSwapPhoto={props.onSwapPhoto}
                />
            ) : (
                <ElementList
                    tab={tab}
                    edition={props.edition}
                    interfaceLanguage={props.locale}
                    selected={props.selected}
                    onSelect={props.onSelect}
                    onFocusRow={props.onFocusRow}
                    warned={props.warned}
                    session={props.session}
                    inSet={props.inSet}
                    photos={props.photos}
                    query={searchable ? props.query : ''}
                    onAnnounce={props.onAnnounce}
                />
            )}
        </div>
    );
};
