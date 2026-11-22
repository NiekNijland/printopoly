import { useId } from 'react';

import { useTranslation } from '@/hooks/use-translation';
import { PAWN_COUNT } from '@/lib/edition/keys';
import type { EditionSession } from '@/lib/edition/session';
import type { Edition } from '@/lib/edition/types';
import {
    MIN_PAWNS,
    pawnCountChanges,
    visiblePawnKeys,
} from '@/lib/editor/pawn-count';
import { cn } from '@/lib/utils';

import { FieldLabel } from './panel-parts';

const COUNTS = Array.from(
    { length: PAWN_COUNT - MIN_PAWNS + 1 },
    (_, i) => MIN_PAWNS + i,
);

/**
 * "Aantal pionnen": a group field of the pawns, 2 to 8, in one row of chips (UX 9, B143 point 2). Taking pawns out
 * keeps what they have, so a higher number brings them back as they were.
 */
export function PawnCountField({
    session,
    edition,
}: {
    session: EditionSession;
    edition: Edition;
}) {
    const t = useTranslation();
    const label = useId();
    const count = visiblePawnKeys(edition).length;

    return (
        <div className="flex flex-col gap-1">
            <div id={label}>
                <FieldLabel
                    label={t('editor.pawn_count')}
                    tag={t('editor.pawn_count_tag')}
                />
            </div>
            <div
                role="radiogroup"
                aria-labelledby={label}
                className="grid grid-cols-7 overflow-hidden rounded-control border-2 border-ink bg-card"
            >
                {COUNTS.map((n) => (
                    <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={n === count}
                        data-field={n === count ? 'pawn_count' : undefined}
                        onClick={() =>
                            session.apply(pawnCountChanges(session.edition, n))
                        }
                        className={cn(
                            'min-h-11 cursor-pointer border-0 border-l-2 border-ink font-display text-lg font-extrabold first:border-l-0',
                            n === count
                                ? 'bg-ink text-paper'
                                : 'bg-card text-ink hover:bg-paper',
                        )}
                    >
                        {n}
                    </button>
                ))}
            </div>
            <span className="text-xs text-ink-soft">
                {t('editor.pawn_count_hint')}
            </span>
        </div>
    );
}
