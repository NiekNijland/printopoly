import { changedAmounts } from '@/features/edition/editor/amount-fields';
import { centerLayoutOf } from '@/features/edition/editor/panel/center-image-layout';
import type { useTranslation } from '@/hooks/use-translation';
import { baselineField } from '@/lib/render/edition-baseline';
import type { ElementKind } from '@/lib/render/edition-keys';
import type { Edition } from '@/lib/render/edition-types';
import type { PanelSection } from '@/lib/render/editor-panel-sections';
import type { Space } from '@/types/game';

export const sectionSummary = (
    id: PanelSection,
    {
        edition,
        editKey,
        kind,
        space,
    }: {
        edition: Edition;
        editKey: string;
        kind: ElementKind | undefined;
        space: Space | undefined;
    },
    t: ReturnType<typeof useTranslation>,
): string | undefined => {
    const override = edition.elements[editKey];
    if (id === 'image') {
        // The centre says its layout (B187): its photo can wait in the background of a name-only layout.
        if (kind === 'boardCenter') {
            return t(`editor.center_mode_${centerLayoutOf(override)}`);
        }

        return override?.photo !== undefined
            ? override.photoStyle === 'full'
                ? t('editor.summary_photo_full')
                : t('editor.summary_photo')
            : override?.icon !== undefined
              ? t('editor.summary_icon')
              : t('editor.summary_no_photo');
    }
    if (id !== 'amounts') {
        return undefined;
    }
    const count =
        space !== undefined
            ? changedAmounts(edition, space)
            : // A card counts as changed only when its amount differs from the template's (R6 Aisha).
              override?.amount !== baselineField(edition, editKey, 'amount')
              ? 1
              : 0;

    return count > 0 ? t('editor.summary_changed', { count }) : undefined;
};
