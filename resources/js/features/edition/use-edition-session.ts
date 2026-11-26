import { usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { getEnvironment } from '@/features/edition/editor/services';
import {
    requestPersistence,
    type EnvironmentInfo,
} from '@/features/edition/environment';
import { saveOnPageHide } from '@/features/edition/page-hide';
import {
    SaveStatusMachine,
    type SaveStatusInput,
    describeSaveStatus,
    type SaveStatus,
    type SaveStatusText,
} from '@/features/edition/save-status';
import type {
    EditionConflict,
    EditionSession,
} from '@/features/edition/session';
import type { Edition } from '@/lib/render/edition-types';

import { useServices } from './use-editions';

export type OpenState =
    | { status: 'loading' }
    | { status: 'missing' }
    | { status: 'error' }
    | { status: 'ready'; session: EditionSession };

/** Opens an edition for editing and closes it again (saving what is pending) when the page goes away. */
export const useEditionSession = (editionId: string): OpenState => {
    const { repository } = useServices();
    const [state, setState] = useState<OpenState>({ status: 'loading' });

    useEffect(() => {
        let alive = true;
        let opened: EditionSession | undefined;
        let stopSaving: (() => void) | undefined;

        repository
            .open(editionId)
            .then((session) => {
                if (!alive) {
                    void session?.close();

                    return;
                }
                opened = session;
                stopSaving =
                    session === undefined ? undefined : saveOnPageHide(session);
                setState(
                    session === undefined
                        ? { status: 'missing' }
                        : { status: 'ready', session },
                );
            })
            .catch(() => {
                if (alive) {
                    setState({ status: 'error' });
                }
            });

        return () => {
            alive = false;
            stopSaving?.();
            void opened?.close();
        };
    }, [repository, editionId]);

    return state;
};

export type SessionSnapshot = {
    edition: Edition;
    canUndo: boolean;
    canRedo: boolean;
    conflict: EditionConflict | null;
    /** The edition was deleted in another window. */
    deletedElsewhere: boolean;
};

/** Follows an open edition: the working copy, undo state and a conflict with another window. */
export const useSessionSnapshot = (
    session: EditionSession,
): SessionSnapshot => {
    const subscribe = useMemo(
        () => (listener: () => void) => session.subscribe(listener),
        [session],
    );
    const edition = useSyncExternalStore(subscribe, () => session.edition);
    const canUndo = useSyncExternalStore(subscribe, () => session.canUndo);
    const canRedo = useSyncExternalStore(subscribe, () => session.canRedo);
    const conflict = useSyncExternalStore(subscribe, () => session.conflict);
    const [deletedElsewhere, setDeleted] = useState(false);

    useEffect(
        () =>
            session.subscribe((event) => {
                if (event.type === 'remote-delete') {
                    setDeleted(true);
                }
            }),
        [session],
    );

    return { edition, canUndo, canRedo, conflict, deletedElsewhere };
};

/** The save status line of the editor (Staten design, B92), in the interface language. */
export const useSaveStatus = (
    session: EditionSession,
    account: SaveStatusInput['account'] = {
        loggedIn: false,
        pendingSync: false,
        syncedAt: null,
    },
): {
    status: SaveStatus;
    text: SaveStatusText;
} => {
    const { locale } = usePage().props;
    const [machine] = useState(() => new SaveStatusMachine());
    const [status, setStatus] = useState<SaveStatus>(machine.current);

    useEffect(() => {
        const unbind = machine.bind(session);
        const unsubscribe = machine.subscribe(setStatus);
        const online = () => machine.setOnline(true);
        const offline = () => machine.setOnline(false);
        window.addEventListener('online', online);
        window.addEventListener('offline', offline);
        machine.setOnline(navigator.onLine);

        void getEnvironment()
            .then((info: EnvironmentInfo) => machine.setEnvironment(info))
            .catch(() => undefined);
        void requestPersistence(navigator.storage).catch(() => undefined);

        return () => {
            unbind();
            unsubscribe();
            window.removeEventListener('online', online);
            window.removeEventListener('offline', offline);
        };
    }, [machine, session]);

    const { loggedIn, pendingSync, syncedAt } = account;

    useEffect(() => {
        machine.setAccount({ loggedIn, pendingSync, syncedAt });
    }, [machine, loggedIn, pendingSync, syncedAt]);

    return { status, text: describeSaveStatus(status, locale) };
};
