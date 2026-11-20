import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { useTranslation } from '@/hooks/use-translation';
import type { ResolvedCenter } from '@/lib/edition/resolve';
import type { EditionSession } from '@/lib/edition/session';
import {
    CENTER_MODES,
    type CenterMode,
    type ElementOverride,
} from '@/lib/edition/types';
import { editElement } from '@/lib/editor/edit';
import type { Locale } from '@/lib/game/types';
import { STRINGS } from '@/lib/render/strings';
import { cn } from '@/lib/utils';

interface CenterFieldsProps {
    session: EditionSession;
    editKey: string;
    override: ElementOverride | undefined;
    centre: ResolvedCenter;
    locale: Locale;
}

/** The choice between name, name with a photo and a logo for the middle of the board (B125). */
export function CenterModeChoice({
    session,
    editKey,
    centre,
}: Pick<CenterFieldsProps, 'session' | 'editKey' | 'centre'>) {
    const t = useTranslation();

    return (
        <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
            <legend className="mb-2 p-0 text-sm font-semibold">
                {t('editor.center_mode')}
            </legend>
            <div role="radiogroup" className="grid grid-cols-3 gap-2">
                {CENTER_MODES.map((mode: CenterMode) => (
                    <label
                        key={mode}
                        className={cn(
                            'flex min-h-12 cursor-pointer items-center justify-center rounded-control border-2 border-ink px-2 text-center text-sm font-semibold',
                            centre.mode === mode
                                ? 'bg-ink text-card'
                                : 'bg-card',
                        )}
                    >
                        <input
                            type="radio"
                            name="center-mode"
                            className="sr-only"
                            checked={centre.mode === mode}
                            data-field={`center-mode-${mode}`}
                            onChange={() =>
                                editElement(session, editKey, {
                                    centerMode:
                                        mode === 'name' ? undefined : mode,
                                })
                            }
                        />
                        {t(`editor.center_mode_${mode}`)}
                    </label>
                ))}
            </div>
            {centre.mode !== 'name' && (
                <p className="m-0 text-xs text-ink-soft">
                    {t(`editor.center_hint_${centre.mode}`)}
                </p>
            )}
        </fieldset>
    );
}

/** Tagline and frame options under the name field. */
export function CenterExtras({
    session,
    editKey,
    override,
    centre,
    locale,
}: CenterFieldsProps) {
    const t = useTranslation();
    const [draft, setDraft] = useState<string | null>(null);
    const hidden = override?.subtitle === '';
    const shown = draft ?? override?.subtitle ?? '';

    if (centre.mode === 'logo') {
        return null;
    }

    return (
        <>
            <label className="flex flex-col gap-1 text-sm font-semibold">
                {t('editor.subtitle')}
                <Input
                    data-field="subtitle"
                    value={hidden ? '' : shown}
                    disabled={hidden}
                    placeholder={STRINGS[locale].centerTagline}
                    onBlur={() => setDraft(null)}
                    onChange={(event) => {
                        setDraft(event.target.value);
                        editElement(
                            session,
                            editKey,
                            {
                                subtitle:
                                    event.target.value === ''
                                        ? undefined
                                        : event.target.value,
                            },
                            `subtitle:${editKey}`,
                        );
                    }}
                />
            </label>
            <label className="flex min-h-11 items-center gap-2 text-base">
                <input
                    type="checkbox"
                    className="size-5 accent-ink"
                    checked={!hidden}
                    onChange={(event) =>
                        editElement(session, editKey, {
                            subtitle: event.target.checked ? undefined : '',
                        })
                    }
                />
                {t('editor.subtitle_show')}
            </label>
            {centre.mode === 'photo' && (
                <label className="flex min-h-11 items-center gap-2 text-base">
                    <input
                        type="checkbox"
                        className="size-5 accent-ink"
                        checked={centre.photoFrame}
                        data-field="photo-frame"
                        onChange={(event) =>
                            editElement(session, editKey, {
                                photoFrame: event.target.checked
                                    ? undefined
                                    : false,
                            })
                        }
                    />
                    {t('editor.photo_frame')}
                </label>
            )}
        </>
    );
}
