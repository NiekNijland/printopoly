import { usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { useCollectionBox } from '@/features/edition/boxes/use-collection-box';
import { useContributionDecision } from '@/features/edition/boxes/use-contribution-decision';
import { useChecks } from '@/features/edition/editor/check-probe';
import type { FriendsProps } from '@/features/edition/editor/panel/friends-section';
import { usedPhotoIds } from '@/features/edition/repository';
import type { EditionSession } from '@/features/edition/session';
import {
    useSaveStatus,
    useSessionSnapshot,
} from '@/features/edition/use-edition-session';
import { useServices } from '@/features/edition/use-editions';
import { useRemotePush } from '@/features/edition/use-remote-push';
import { parseKey, spaceKey } from '@/lib/render/edition-keys';
import { resolveEdition } from '@/lib/render/edition-resolve';
import { PhotoCache } from '@/lib/render/editor-photo-cache';
import {
    checkView,
    editorView,
    partsInSet,
} from '@/lib/render/editor-print-selection';

export const useWorkspaceData = (session: EditionSession) => {
    const { locale, auth } = usePage().props;
    const { repository } = useServices();
    const snapshot = useSessionSnapshot(session);
    const stored = snapshot.edition;
    // The editor always shows every part (B198); what goes into the set is chosen on the print page.
    const edition = useMemo(() => editorView(stored), [stored]);
    const inSet = useMemo(() => partsInSet(stored), [stored]);
    const push = useRemotePush(session);
    const collect = useCollectionBox(edition, auth.user !== null);
    const contributions = collect.box?.contributions ?? [];
    const [cache] = useState(
        () => new PhotoCache((id) => repository.getPhoto(id)),
    );
    const decision = useContributionDecision({
        collect,
        session,
        repository,
        locale,
        onPhoto: (record) => cache.add(record),
    });
    const save = useSaveStatus(session, {
        loggedIn: push.loggedIn,
        pendingSync: push.pending,
        syncedAt: push.syncedAt,
    });
    const resolved = useMemo(() => resolveEdition(edition), [edition]);
    const photos = useSyncExternalStore(cache.subscribe, cache.getSnapshot);
    // What friends sent (B128, B175): "Van vrienden" per element and the overview in Samen maken use the same.
    const friends: FriendsProps = {
        contributions,
        edition,
        locale,
        decision,
        secret: collect.secret,
        busy: collect.busy,
        photos,
    };
    const photoIds = [...usedPhotoIds(edition.elements)].sort().join(',');

    useEffect(() => {
        cache.request(photoIds === '' ? [] : photoIds.split(','));
    }, [cache, photoIds]);
    useEffect(() => () => cache.dispose(), [cache]);

    // Only the parts of the set give messages (B197, B198).
    const checked = useMemo(() => checkView(stored), [stored]);
    const { issues, probe } = useChecks(checked, photos);

    // Warnings per element; a deed's warning also marks its space on the board.
    const warned = useMemo(() => {
        const keys = new Set<string>();
        for (const issue of issues) {
            keys.add(issue.elementKey);
            // A message about a group marks each element it is about (R5-09).
            issue.alsoKeys?.forEach((key) => keys.add(key));
            if (parseKey(issue.elementKey)?.kind === 'deed') {
                const index = Number(issue.elementKey.split('.')[1]);
                resolved.deeds
                    ?.filter((deed) => deed.index === index)
                    .forEach((deed) => keys.add(spaceKey(deed.space.position)));
            }
        }

        return keys;
    }, [issues, resolved]);

    return {
        locale,
        auth,
        repository,
        snapshot,
        stored,
        edition,
        inSet,
        push,
        collect,
        contributions,
        cache,
        decision,
        save,
        resolved,
        photos,
        friends,
        issues,
        probe,
        warned,
    };
};

export type WorkspaceData = ReturnType<typeof useWorkspaceData>;
