import { useId } from 'react';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTranslation } from '@/hooks/use-translation';
import { PAWN_COUNT } from '@/lib/edition/keys';
import type { EditionSession } from '@/lib/edition/session';
import type { Edition } from '@/lib/edition/types';
import {
    MIN_PAWNS,
    pawnCountChanges,
    visiblePawnKeys,
} from '@/lib/editor/pawn-count';

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
            {/* One segmented bar (shadcn ToggleGroup, B196): the arrow keys move, Space or Enter chooses. */}
            <ToggleGroup
                type="single"
                variant="outline"
                value={String(count)}
                onValueChange={(next) => {
                    // A click on the chosen number would clear the group; there is always a number of pawns.
                    if (next !== '') {
                        session.apply(
                            pawnCountChanges(session.edition, Number(next)),
                        );
                    }
                }}
                aria-labelledby={label}
                className="grid w-full grid-cols-7"
            >
                {COUNTS.map((n) => (
                    <ToggleGroupItem
                        key={n}
                        value={String(n)}
                        data-field={n === count ? 'pawn_count' : undefined}
                        className="min-h-11 w-full font-display text-lg font-extrabold"
                    >
                        {n}
                    </ToggleGroupItem>
                ))}
            </ToggleGroup>
            <span className="text-xs text-ink-soft">
                {t('editor.pawn_count_hint')}
            </span>
        </div>
    );
}
