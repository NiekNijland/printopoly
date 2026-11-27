import { editElement } from '@/features/edition/editor/edit';
import {
    CheckField,
    FieldLabel,
    RangeField,
} from '@/features/edition/editor/panel/panel-parts';
import { TitleStyleField } from '@/features/edition/editor/panel/title-style-field';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import { MIN_TITLE_SCALE } from '@/lib/render/edition-schema-limits';
import type { Edition, TitleStyle } from '@/lib/render/edition-types';
import { THEMES } from '@/lib/render/themes';

/** The name on the box lid above the board or the logo (B256): only its look (Niek, 22 nov). */
export const LidNameControls = ({
    session,
    editKey,
    value,
    theme,
}: {
    session: EditionSession;
    editKey: string;
    value: TitleStyle | undefined;
    theme: Edition['theme'];
}) => {
    const t = useTranslation();

    return (
        <div
            className="flex flex-col gap-3 rounded-control border-2 border-ink bg-paper p-3"
            data-testid="lid-name"
        >
            <FieldLabel
                label={t('editor.lid_name')}
                onStandard={
                    value === undefined
                        ? undefined
                        : () =>
                              editElement(session, editKey, {
                                  titleStyle: undefined,
                              })
                }
            />
            <TitleStyleField
                session={session}
                editKey={editKey}
                value={value}
                theme={THEMES[theme]}
            />
        </div>
    );
};

/** Steps of the title position: top, a bit up, the standard place, a bit down, bottom. */
const OFFSETS = [-1, -0.5, 0, 0.5, 1] as const;

/** "Hoogte": the title up or down over a photo, in five steps that read as words ("midden"). */
const TitleHeight = ({
    session,
    editKey,
    step,
}: {
    session: EditionSession;
    editKey: string;
    step: (typeof OFFSETS)[number];
}) => {
    const t = useTranslation();
    const index = OFFSETS.indexOf(step);
    const word = t(`editor.title_height_${String(index)}`);

    return (
        <RangeField
            label={t('editor.title_height')}
            shown={<span className="font-normal text-ink-soft">{word}</span>}
            min={0}
            max={OFFSETS.length - 1}
            value={index}
            valueText={word}
            field="title-offset"
            onChange={(value) => {
                const next = OFFSETS[value] ?? 0;
                editElement(
                    session,
                    editKey,
                    { titleOffset: next === 0 ? undefined : next },
                    `title-offset:${editKey}`,
                );
            }}
        />
    );
};

const TitleSize = ({
    session,
    editKey,
    scale,
}: {
    session: EditionSession;
    editKey: string;
    scale: number;
}) => {
    const t = useTranslation();
    const percent = Math.round(scale * 100);

    return (
        <RangeField
            label={t('editor.title_size')}
            shown={<span className="font-mono font-normal">{percent}%</span>}
            min={MIN_TITLE_SCALE * 100}
            max={100}
            step={5}
            value={percent}
            valueText={`${String(percent)}%`}
            onChange={(value) => {
                const next = value / 100;
                editElement(
                    session,
                    editKey,
                    {
                        titleScale: next >= 1 ? undefined : next,
                    },
                    `title-scale:${editKey}`,
                );
            }}
        />
    );
};

const TitleSwitches = ({
    session,
    editKey,
    hidden,
    band,
}: {
    session: EditionSession;
    editKey: string;
    hidden?: boolean;
    band?: boolean;
}) => {
    const t = useTranslation();

    return (
        <>
            {hidden !== undefined && (
                <CheckField
                    label={t('editor.title_show')}
                    checked={!hidden}
                    field="title-hidden"
                    onCheckedChange={(checked) =>
                        editElement(session, editKey, {
                            titleHidden: checked ? undefined : true,
                        })
                    }
                />
            )}
            {band !== undefined && (
                <CheckField
                    label={t('editor.title_band')}
                    checked={band}
                    field="title-band"
                    onCheckedChange={(checked) =>
                        editElement(session, editKey, {
                            titleBand: checked ? undefined : false,
                        })
                    }
                />
            )}
        </>
    );
};

/**
 * Where the title goes over a photo (B170, Lisa): up or down, smaller, hidden on the board centre, and on the box lid
 * with or without the light band. The ribbon keeps its look; only its place and size change.
 */
export const TitleControls = ({
    session,
    editKey,
    offset,
    scale,
    hidden,
    band,
}: {
    session: EditionSession;
    editKey: string;
    offset: number;
    scale?: number;
    hidden?: boolean;
    band?: boolean;
}) => {
    const t = useTranslation();
    const step = OFFSETS.reduce((best, candidate) =>
        Math.abs(candidate - offset) < Math.abs(best - offset)
            ? candidate
            : best,
    );

    return (
        <div
            className="flex flex-col gap-3 rounded-control border-2 border-ink bg-paper p-3"
            data-testid="title-controls"
        >
            <FieldLabel
                label={t('editor.title_place')}
                onStandard={
                    offset === 0 &&
                    (scale ?? 1) === 1 &&
                    hidden !== true &&
                    band !== false
                        ? undefined
                        : () =>
                              editElement(session, editKey, {
                                  titleOffset: undefined,
                                  titleScale: undefined,
                                  titleHidden: undefined,
                                  titleBand: undefined,
                              })
                }
            />
            {hidden !== true && (
                <>
                    <TitleHeight
                        session={session}
                        editKey={editKey}
                        step={step}
                    />
                    {scale !== undefined && (
                        <TitleSize
                            session={session}
                            editKey={editKey}
                            scale={scale}
                        />
                    )}
                </>
            )}
            <TitleSwitches
                session={session}
                editKey={editKey}
                hidden={hidden}
                band={band}
            />
        </div>
    );
};
