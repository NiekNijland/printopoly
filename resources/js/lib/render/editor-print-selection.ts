import {
    PART_IDS,
    type Edition,
    type PartId,
    type Parts,
} from '@/lib/render/edition-types';
import { defaultPrintSelection } from '@/lib/render/print-selection';

/** Parts that are no element in the editor: the rules booklet is only a row on the print page (B204). */
const NOT_IN_EDITOR: ReadonlySet<PartId> = new Set(['rulesBooklet']);

/** The parts the editor shows: always all of them (B198), except the ones that left the editor. */
export const EDITOR_PARTS: Readonly<Parts> = Object.fromEntries(
    PART_IDS.map((part) => [part, !NOT_IN_EDITOR.has(part)]),
) as Parts;

/** The edition as the editor shows it: every part on, whatever was chosen for the last set (B198). */
export const editorView = (edition: Edition): Edition => {
    return { ...edition, parts: EDITOR_PARTS };
};

/**
 * The parts of the set chosen last on the print page (B198). The print page keeps them on the edition as
 * `printSelection`; an edition without one (never printed, or older) has the set the print page would open with,
 * `defaultPrintSelection`, so the editor and the print page agree from the first moment (R5-20, B225).
 */
export const partsInSet = (edition: Edition): ReadonlySet<PartId> => {
    const chosen = (edition as { printSelection?: { parts?: unknown } })
        .printSelection?.parts;

    if (!Array.isArray(chosen)) {
        return new Set(defaultPrintSelection(edition).parts);
    }

    return new Set(
        chosen.filter((part): part is PartId =>
            (PART_IDS as readonly string[]).includes(part as string),
        ),
    );
};

/** Whether a part is in the last chosen set; the board always is. */
export const inSet = (edition: Edition, part: PartId): boolean => {
    return part === 'board' || partsInSet(edition).has(part);
};

/**
 * The edition the editor checks: only the parts that go into the set, so a part you do not print gives no
 * messages while you work (B197, B198).
 */
export const checkView = (edition: Edition): Edition => {
    const set = partsInSet(edition);

    return {
        ...edition,
        parts: Object.fromEntries(
            PART_IDS.map((part) => [
                part,
                EDITOR_PARTS[part] && (part === 'board' || set.has(part)),
            ]),
        ) as Parts,
    };
};
