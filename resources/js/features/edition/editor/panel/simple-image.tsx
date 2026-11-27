import { editElement } from '@/features/edition/editor/edit';
import type {
    ImageChoice,
    ImageParts,
} from '@/features/edition/editor/panel/image-choice';
import {
    ChoiceRow,
    type ChoiceOption,
} from '@/features/edition/editor/panel/panel-parts';
import { PatternPicker } from '@/features/edition/editor/style-controls';
import { useTranslation } from '@/hooks/use-translation';
import type { ElementKind } from '@/lib/render/edition-keys';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import { lidLogoPlacement } from '@/lib/render/editor-placements';
import { THEMES } from '@/lib/render/themes';

export const CardBackImage = ({
    session,
    edition,
    editKey,
    override,
    waiting,
    wait,
    clear,
    openFiles,
    photoField,
    fileField,
    photoPart,
    status,
}: ImageParts) => {
    const t = useTranslation();
    const placement = override?.photo;
    const deck = editKey.split('.')[1];
    const patterns = deck === 'chance' || deck === 'chest';
    const accent =
        THEMES[edition.theme].deckAccent[deck === 'chest' ? 'chest' : 'chance'];
    const current: ImageChoice =
        placement !== undefined
            ? 'photo'
            : override?.pattern !== undefined
              ? 'pattern'
              : (waiting ?? 'standard');
    const options: ChoiceOption<ImageChoice>[] = [
        { id: 'standard', label: t('editor.image_back_standard') },
        ...(patterns
            ? [{ id: 'pattern' as const, label: t('editor.image_pattern') }]
            : []),
        { id: 'photo', label: t('editor.image_photo') },
    ];

    return (
        <>
            <ChoiceRow
                fields={photoField}
                label={t('editor.section_image')}
                options={options}
                value={current}
                onChange={(next) => {
                    wait(next);
                    if (next === 'standard') {
                        clear({ photo: undefined, pattern: undefined });
                    } else if (next === 'pattern') {
                        clear({ photo: undefined });
                    } else if (placement === undefined) {
                        clear({ pattern: undefined });
                        openFiles();
                    }
                }}
            />
            {fileField}
            {current === 'pattern' && patterns && (
                <PatternPicker
                    label={t('editor.style_back_pattern')}
                    value={override?.pattern}
                    withNone={false}
                    color={accent}
                    onChange={(pattern) =>
                        editElement(session, editKey, {
                            pattern,
                            photo: undefined,
                        })
                    }
                />
            )}
            {current === 'photo' && photoPart}
            {status}
        </>
    );
};

const plainOptions = (
    t: ReturnType<typeof useTranslation>,
    kind: ElementKind,
    withLogo: boolean,
): ChoiceOption<ImageChoice>[] => [
    {
        id: 'none',
        label:
            kind === 'boxLid'
                ? t('editor.image_theme')
                : t('editor.image_none'),
    },
    ...(withLogo
        ? [{ id: 'logo' as const, label: t('editor.image_lid_logo') }]
        : []),
    {
        id: 'photo',
        label:
            kind === 'note'
                ? t('editor.image_photo_oval')
                : t('editor.image_photo'),
    },
];

type PlainImageProps = ImageParts & {
    kind: ElementKind;
    resolved: ResolvedEdition;
};

// Everything else: no picture or a photo. The box lid shows the theme without one, and can show the logo of the
// board centre (B241, Lukas): the same file, whole and straight above the name.
export const PlainImage = ({
    session,
    editKey,
    override,
    waiting,
    wait,
    clear,
    openFiles,
    photoField,
    fileField,
    photoPart,
    status,
    where,
    kind,
    resolved,
}: PlainImageProps) => {
    const t = useTranslation();
    const placement = override?.photo;
    const centerLogo =
        kind === 'boxLid' && resolved.boardCenter.mode === 'logo'
            ? resolved.boardCenter.photo
            : undefined;
    const lidLogo =
        kind === 'boxLid' &&
        placement !== undefined &&
        placement.photoId === centerLogo?.photoId;
    const current: ImageChoice = lidLogo
        ? 'logo'
        : placement !== undefined
          ? 'photo'
          : (waiting ?? 'none');
    const options = plainOptions(t, kind, centerLogo !== undefined);

    return (
        <>
            <ChoiceRow
                fields={photoField}
                label={t('editor.section_image')}
                options={options}
                value={current}
                onChange={(next) => {
                    wait(next);
                    if (next === 'none') {
                        clear({ photo: undefined });
                    } else if (next === 'logo') {
                        if (centerLogo !== undefined && !lidLogo) {
                            editElement(session, editKey, {
                                photo: lidLogoPlacement(centerLogo),
                                photoStyle: undefined,
                            });
                        }
                    } else if (placement === undefined || lidLogo) {
                        openFiles();
                    }
                }}
            />
            {fileField}
            {current === 'logo' ? (
                <p className="m-0 text-sm text-ink-soft" data-lid-logo>
                    {t('editor.lid_logo_hint')}
                </p>
            ) : (
                /* One place for both, so the tools stay mounted and the focus can move to Andere foto (bug 16). */
                (current === 'photo' || current === 'none') && photoPart
            )}
            {where !== null && (
                <p className="m-0 text-xs text-ink-soft">{t(where)}</p>
            )}
            {status}
        </>
    );
};
