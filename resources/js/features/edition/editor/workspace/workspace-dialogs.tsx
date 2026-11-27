import { BigBoard } from '@/features/edition/editor/big-board';
import { ConflictDialog } from '@/features/edition/editor/conflict-dialog';
import { OpenMessages } from '@/features/edition/editor/open-messages';
import { PreviewDialog } from '@/features/edition/editor/preview-dialog';
import { ShareBoardDialog } from '@/features/edition/editor/share-board-dialog';
import { ShortcutsDialog } from '@/features/edition/editor/shortcuts-dialog';
import { FlashNote } from '@/features/edition/editor/workspace/workspace-chrome';
import { TAB_LABEL } from '@/features/edition/editor/workspace/workspace-nav';
import { useTranslation } from '@/hooks/use-translation';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import type { Edition } from '@/lib/render/edition-types';
import { EDITOR_TABS } from '@/lib/render/editor-catalogue';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';
import type { Locale } from '@/types/game';

type Open = { open: boolean; onOpenChange: (open: boolean) => void };

type WorkspaceDialogsProps = {
    edition: Edition;
    stored: Edition;
    resolved: ResolvedEdition;
    photos: PhotoInfos;
    locale: Locale;
    warned: ReadonlySet<string>;
    issues: Parameters<typeof OpenMessages>[0]['issues'];
    boardSelected: string;
    bigBoard: Open;
    preview: Open & { onClosed: () => void };
    messages: Open;
    share: Open;
    shortcuts: Open & { plain: boolean; onPlainChange: (on: boolean) => void };
    flash: string | null;
    conflict: Parameters<typeof ConflictDialog>[0]['conflict'];
    getPhoto: Parameters<typeof ShareBoardDialog>[0]['getPhoto'];
    onPickSpace: (key: string) => void;
    onSwap: (from: string, to: string) => void;
    onJump: (key: string) => void;
    onOpenMessage: (key: string, field: string) => void;
    onResolve: Parameters<typeof ConflictDialog>[0]['onResolve'];
};

export const WorkspaceDialogs = (props: WorkspaceDialogsProps) => {
    const t = useTranslation();
    const { edition, resolved, photos, locale } = props;

    return (
        <>
            <BigBoard
                {...props.bigBoard}
                edition={edition}
                interfaceLanguage={locale}
                selected={props.boardSelected}
                warned={props.warned}
                onPick={props.onPickSpace}
                onSwap={props.onSwap}
                photos={photos}
            />
            <PreviewDialog
                {...props.preview}
                edition={edition}
                resolved={resolved}
                photos={photos}
                onJump={props.onJump}
            />
            <OpenMessages
                {...props.messages}
                issues={props.issues}
                edition={edition}
                locale={locale}
                onOpen={props.onOpenMessage}
            />
            <ShareBoardDialog
                {...props.share}
                edition={props.stored}
                getPhoto={props.getPhoto}
            />
            <ShortcutsDialog
                {...props.shortcuts}
                tabNames={EDITOR_TABS.map((id) => t(TAB_LABEL[id]))}
            />
            <FlashNote flash={props.flash} />
            <ConflictDialog
                conflict={props.conflict}
                locale={locale}
                onResolve={props.onResolve}
            />
        </>
    );
};
