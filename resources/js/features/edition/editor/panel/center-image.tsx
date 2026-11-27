import { usePage } from '@inertiajs/react';
import { useId, useRef, useState, type ReactNode } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { CenterBackground } from '@/features/edition/editor/center-background';
import { editElement } from '@/features/edition/editor/edit';
import {
    CENTER_LAYOUTS,
    centerLayoutOf,
    switchCenterLayout,
    type CenterLayoutChoice,
} from '@/features/edition/editor/panel/center-image-layout';
import { ChoiceRow } from '@/features/edition/editor/panel/panel-parts';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import { CENTER_PHOTO_BLEED } from '@/lib/render/center-layout';
import type { Edition, ElementOverride } from '@/lib/render/edition-types';
import type { PhotoCache } from '@/lib/render/editor-photo-cache';
import { placementTarget } from '@/lib/render/photos-resolution';
import { centerRect } from '@/lib/render/print-board';

type CenterImageProps = {
    session: EditionSession;
    edition: Edition;
    editKey: string;
    override: ElementOverride | undefined;
    cache: PhotoCache;
    photoPart: ReactNode;
    fileField: ReactNode;
    status: ReactNode;
    openFiles: () => void;
};

const aspectIn =
    (cache: PhotoCache) =>
    (photoId: string): number | undefined => {
        const info = cache.getSnapshot().get(photoId);

        return info === undefined || info.height <= 0
            ? undefined
            : info.width / info.height;
    };

const CenterPhotoFrame = ({
    session,
    editKey,
    override,
}: Pick<CenterImageProps, 'session' | 'editKey' | 'override'>) => {
    const t = useTranslation();
    const frameId = useId();

    return (
        <Field orientation="horizontal" className="min-h-11 gap-2">
            <Checkbox
                id={frameId}
                checked={override?.photoFrame !== false}
                data-field="photo-frame"
                onCheckedChange={(checked) =>
                    editElement(session, editKey, {
                        photoFrame: checked === true ? undefined : false,
                    })
                }
            />
            <FieldLabel htmlFor={frameId} className="text-base font-normal">
                {t('editor.photo_frame')}
            </FieldLabel>
        </Field>
    );
};

const SecondPhotoNote = ({
    session,
    editKey,
    layout,
}: Pick<CenterImageProps, 'session' | 'editKey'> & {
    layout: CenterLayoutChoice;
}) => {
    const t = useTranslation();

    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border-2 border-dashed border-line-strong px-3 py-2 text-sm">
            <span className="min-w-0 flex-1">
                {t('editor.center_second_photo')}
            </span>
            <button
                type="button"
                className="min-h-11 cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold underline underline-offset-4"
                onClick={() =>
                    editElement(
                        session,
                        editKey,
                        layout === 'full'
                            ? {
                                  photo: undefined,
                                  centerMode: undefined,
                              }
                            : { background: undefined },
                    )
                }
            >
                {t('editor.center_second_remove')}
            </button>
        </div>
    );
};

const useCenterLayout = ({
    session,
    edition,
    editKey,
    override,
    cache,
    openFiles,
}: Pick<
    CenterImageProps,
    'session' | 'edition' | 'editKey' | 'override' | 'cache' | 'openFiles'
>) => {
    const [waiting, setWaiting] = useState<CenterLayoutChoice | null>(null);
    const backgroundInput = useRef<HTMLInputElement>(null);
    const stored = centerLayoutOf(override);
    // A layout that waits for its photo shows as chosen until the file comes, or the layout changes.
    const layout =
        waiting !== null && stored === 'name' && override?.photo === undefined
            ? waiting
            : stored;
    const choose = (next: CenterLayoutChoice): void => {
        setWaiting(next);
        const centre = centerRect(edition.boardProfile);
        const patch = switchCenterLayout(
            override,
            next,
            aspectIn(cache),
            placementTarget(centre, CENTER_PHOTO_BLEED),
        );
        if (patch !== null) {
            editElement(session, editKey, patch);

            return;
        }
        // No photo yet: straight to the files, like "Foto" on a space (UX 1, B179).
        if (next === 'full') {
            backgroundInput.current?.click();
        } else {
            editElement(session, editKey, { centerMode: next });
            openFiles();
        }
    };

    return { layout, choose, backgroundInput };
};

/**
 * The board centre (B125, B187): one choice of layout (name, name with a photo, a photo over the whole centre, or a
 * logo) and one photo. Switching the layout takes the photo along, so it never has to be chosen twice.
 */
export const CenterImage = ({
    session,
    edition,
    editKey,
    override,
    cache,
    photoPart,
    fileField,
    status,
    openFiles,
}: CenterImageProps) => {
    const t = useTranslation();
    const { locale } = usePage().props;
    const { layout, choose, backgroundInput } = useCenterLayout({
        session,
        edition,
        editKey,
        override,
        cache,
        openFiles,
    });
    // An edition from before B187 can have both photos; the one this layout does not show can go.
    const second =
        override?.background !== undefined &&
        override.photo !== undefined &&
        override.centerMode !== undefined;

    return (
        <>
            <ChoiceRow<CenterLayoutChoice>
                name={t('editor.center_mode')}
                label={t('editor.center_mode')}
                fields={override?.photo === undefined ? { photo: 'photo' } : {}}
                options={CENTER_LAYOUTS.map((mode) => ({
                    id: mode,
                    label: t(`editor.center_mode_${mode}`),
                }))}
                value={layout}
                onChange={choose}
            />
            {fileField}
            {(layout === 'photo' || layout === 'logo') && (
                <>
                    <p className="m-0 text-xs text-ink-soft">
                        {t(`editor.center_hint_${layout}`)}
                    </p>
                    {photoPart}
                    {layout === 'photo' && (
                        <CenterPhotoFrame
                            session={session}
                            editKey={editKey}
                            override={override}
                        />
                    )}
                </>
            )}
            {/* Mounted for every layout, so choosing "Foto over het hele midden" opens its files at once. */}
            <CenterBackground
                session={session}
                edition={edition}
                editKey={editKey}
                override={override}
                cache={cache}
                locale={locale}
                inputRef={backgroundInput}
                fieldOnly={layout !== 'full'}
            />
            {second && (
                <SecondPhotoNote
                    session={session}
                    editKey={editKey}
                    layout={layout}
                />
            )}
            {status}
        </>
    );
};
