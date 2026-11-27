import type { ReactNode } from 'react';

import { editElement } from '@/features/edition/editor/edit';
import type { ImageChoice } from '@/features/edition/editor/panel/image-choice';
import {
    ChoiceRow,
    type ChoiceOption,
} from '@/features/edition/editor/panel/panel-parts';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import { spaceKey } from '@/lib/render/edition-keys';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import type { Edition } from '@/lib/render/edition-types';

type DeedChoice = 'none' | 'space' | 'photo';

/**
 * The Afbeelding section of a title deed (B157): no photo, the photo of its space (the standard when the space has
 * one), or a photo of its own. Moving the inherited photo in the preview makes it the deed's own crop.
 */
export const DeedImage = ({
    session,
    edition,
    resolved,
    editKey,
    onWait,
    openFiles,
    photoPart,
    fileField,
    status,
}: {
    session: EditionSession;
    edition: Edition;
    resolved: ResolvedEdition;
    editKey: string;
    onWait: (choice: ImageChoice) => void;
    openFiles: () => void;
    photoPart: ReactNode;
    fileField: ReactNode;
    status: ReactNode;
}) => {
    const t = useTranslation();
    const deed = resolved.deeds?.find((candidate) => candidate.key === editKey);
    const ownSpaceKey =
        deed === undefined ? undefined : spaceKey(deed.space.position);
    const spaceOverride =
        ownSpaceKey === undefined ? undefined : edition.elements[ownSpaceKey];
    const own = edition.elements[editKey]?.photo !== undefined;
    const current: DeedChoice = own
        ? 'photo'
        : deed?.photoFrom === 'space'
          ? 'space'
          : 'none';
    const group = `deed-photo:${editKey}`;
    const options: ChoiceOption<DeedChoice>[] = [
        { id: 'none', label: t('editor.image_none') },
        ...(spaceOverride?.photo === undefined
            ? []
            : [{ id: 'space' as const, label: t('editor.deed_photo_space') }]),
        { id: 'photo', label: t('editor.deed_photo_other') },
    ];

    const choose = (next: DeedChoice): void => {
        onWait(next === 'photo' ? 'photo' : 'none');
        if (next === 'photo') {
            if (!own) openFiles();

            return;
        }
        if (own) {
            editElement(session, editKey, { photo: undefined }, group);
        }
        if (ownSpaceKey !== undefined && spaceOverride?.photo !== undefined) {
            editElement(
                session,
                ownSpaceKey,
                { deedPhoto: next === 'none' ? false : undefined },
                group,
            );
        }
    };

    return (
        <>
            <ChoiceRow<DeedChoice>
                fields={own ? {} : { photo: 'photo' }}
                label={t('editor.section_image')}
                options={options}
                value={current}
                onChange={choose}
            />
            {fileField}
            {current === 'space' && (
                <p className="m-0 text-sm text-ink-soft">
                    {t('editor.deed_photo_space_hint')}
                </p>
            )}
            {current === 'photo' && photoPart}
            {status}
        </>
    );
};
