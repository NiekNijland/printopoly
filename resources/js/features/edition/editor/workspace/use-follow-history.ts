import { useEffect, useRef } from 'react';

import { describeHistoryStep } from '@/features/edition/editor/history-note';
import type { NavigationAction } from '@/features/edition/editor/workspace/navigation';
import type { EditionSession, SessionEvent } from '@/features/edition/session';
import { parseKey } from '@/lib/render/edition-keys';
import type { Edition, ElementChange } from '@/lib/render/edition-types';
import { elementLabel } from '@/lib/render/editor-catalogue';
import { standardEdition } from '@/lib/render/standard-edition';
import type { Locale } from '@/types/game';

type Translate = (
    key: string,
    replacements?: Record<string, string | number>,
) => string;

export const historyStep = (
    changes: readonly ElementChange[],
    direction: 'undo' | 'redo',
    current: Edition,
    locale: Locale,
    t: Translate,
): { action: NavigationAction | undefined; text: string } => {
    const info = describeHistoryStep(changes);
    const target = info.target;
    const action: NavigationAction | undefined =
        target?.kind === 'element'
            ? { type: 'go-to', key: target.key, deed: target.deed }
            : target?.kind === 'edition'
              ? { type: 'open-edition', section: target.section }
              : undefined;
    const name =
        info.elementKey === undefined
            ? undefined
            : parseKey(info.elementKey)?.kind === 'group'
              ? (standardEdition.groups
                    .find((group) => `group.${group.id}` === info.elementKey)
                    ?.name[locale].toLowerCase() ?? '')
              : elementLabel(info.elementKey, current, locale);
    const what =
        name === undefined
            ? info.field === 'name'
                ? t('editor.history_names', { count: info.count })
                : t('editor.history_many', { count: info.count })
            : info.field === undefined
              ? name
              : t('editor.history_field', {
                    field: t(`editor.history_field_${info.field}`),
                    element: name,
                });
    const text = t(
        direction === 'undo'
            ? 'editor.history_undone'
            : 'editor.history_redone',
        { what },
    );

    return { action, text };
};

// Undo and redo show the element they changed and say what came back (UX 7, ronde 3).
export const useFollowHistory = (
    session: EditionSession,
    follow: (event: SessionEvent) => void,
): void => {
    const onHistory = useRef<(event: SessionEvent) => void>(() => undefined);
    useEffect(() => {
        onHistory.current = follow;
    });
    useEffect(
        () => session.subscribe((event) => onHistory.current(event)),
        [session],
    );
};
