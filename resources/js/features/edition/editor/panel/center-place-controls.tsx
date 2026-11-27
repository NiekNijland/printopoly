import { WarningIcon } from '@/components/ui/icons';
import { editElement } from '@/features/edition/editor/edit';
import {
    CheckField,
    ChoiceRow,
    FieldLabel,
    RangeField,
} from '@/features/edition/editor/panel/panel-parts';
import { TitleStyleField } from '@/features/edition/editor/panel/title-style-field';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import { CENTER_PLACES, type CenterPlace } from '@/lib/render/center-layout';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import { MIN_TITLE_SCALE } from '@/lib/render/edition-schema-limits';
import type { Edition } from '@/lib/render/edition-types';
import { THEMES } from '@/lib/render/themes';

/** A board centre in miniature: the fold cross, the card spots and the name in one place (B187). */
const PlaceIcon = ({ place }: { place: CenterPlace }) => {
    const [cx, cy] =
        place === 'topRight'
            ? [27, 11]
            : place === 'bottomLeft'
              ? [11, 27]
              : [19, 19];
    const length = place === 'middle' ? 28 : 16;

    return (
        <svg aria-hidden="true" viewBox="0 0 38 38" className="size-8 shrink-0">
            <rect
                x="1"
                y="1"
                width="36"
                height="36"
                rx="2"
                fill="var(--color-board)"
                stroke="var(--color-ink)"
                strokeWidth="1.5"
            />
            <path
                d="M19 1v36M1 19h36"
                stroke="var(--color-press)"
                strokeWidth="1.2"
                strokeDasharray="2 1.6"
            />
            {[10, 28].map((c) => (
                <rect
                    key={c}
                    x={c - 2.5}
                    y={c - 3.5}
                    width="5"
                    height="7"
                    transform={`rotate(45 ${c} ${c})`}
                    fill="var(--color-card)"
                    stroke="var(--color-ink)"
                    strokeWidth="0.8"
                />
            ))}
            <rect
                x={cx - length / 2}
                y={cy - 2.6}
                width={length}
                height="5.2"
                rx="1"
                transform={`rotate(-45 ${cx} ${cy})`}
                fill="var(--color-ink)"
            />
        </svg>
    );
};

type CenterControlProps = {
    session: EditionSession;
    editKey: string;
    resolved: ResolvedEdition;
};

const CenterPlaceChoice = ({
    session,
    editKey,
    resolved,
}: CenterControlProps) => {
    const t = useTranslation();
    const centre = resolved.boardCenter;

    return (
        <>
            <ChoiceRow<CenterPlace>
                label={t('editor.center_place')}
                fields={{ [centre.place]: 'center-place' }}
                options={CENTER_PLACES.map((place) => ({
                    id: place,
                    label: t(`editor.center_place_${place}`),
                    icon: <PlaceIcon place={place} />,
                }))}
                value={centre.place}
                onChange={(place) =>
                    editElement(session, editKey, {
                        centerPlace: place === 'topRight' ? undefined : place,
                        titleOffset: undefined,
                    })
                }
            />
            {centre.place === 'middle' && (
                <p className="m-0 flex items-start gap-2 text-sm">
                    <WarningIcon size={18} className="mt-0.5 shrink-0" />
                    {t('editor.center_place_middle_hint')}
                </p>
            )}
        </>
    );
};

const CenterSizeAndAngle = ({
    session,
    editKey,
    resolved,
}: CenterControlProps) => {
    const t = useTranslation();
    const centre = resolved.boardCenter;
    const logo = centre.mode === 'logo' && centre.photo !== undefined;
    const percent = Math.round(centre.titleScale * 100);

    return (
        <>
            {logo && (
                <ChoiceRow<'straight' | 'tilt'>
                    name={t('editor.logo_angle')}
                    label={t('editor.logo_angle')}
                    options={[
                        { id: 'straight', label: t('editor.logo_straight') },
                        { id: 'tilt', label: t('editor.logo_tilt') },
                    ]}
                    value={centre.logoTilt ? 'tilt' : 'straight'}
                    onChange={(next) =>
                        editElement(session, editKey, {
                            logoTilt: next === 'tilt' ? true : undefined,
                        })
                    }
                />
            )}
            {(logo || !centre.titleHidden) && (
                <RangeField
                    label={t(logo ? 'editor.logo_size' : 'editor.title_size')}
                    shown={
                        <span className="font-mono font-normal">
                            {percent}%
                        </span>
                    }
                    min={MIN_TITLE_SCALE * 100}
                    max={100}
                    step={5}
                    value={percent}
                    valueText={`${String(percent)}%`}
                    field="title-size"
                    onChange={(value) => {
                        const next = value / 100;
                        editElement(
                            session,
                            editKey,
                            { titleScale: next >= 1 ? undefined : next },
                            `title-scale:${editKey}`,
                        );
                    }}
                />
            )}
        </>
    );
};

/**
 * The name or logo on the board centre: where it sits (B187; back on 24 nov, Niek wanted the name in the middle as on
 * the classic board), a logo straight or on the diagonal, the size of name or logo, and "Titel tonen" when a photo
 * is in the centre.
 */
export const CenterPlaceControls = ({
    session,
    editKey,
    resolved,
    theme,
}: {
    session: EditionSession;
    editKey: string;
    resolved: ResolvedEdition;
    theme: Edition['theme'];
}) => {
    const t = useTranslation();
    const centre = resolved.boardCenter;
    const logo = centre.mode === 'logo' && centre.photo !== undefined;
    const withPhoto =
        centre.background !== undefined ||
        (centre.mode === 'photo' && centre.photo !== undefined);
    const standard =
        centre.place === 'topRight' &&
        !centre.logoTilt &&
        centre.titleScale === 1 &&
        centre.titleOffset === 0 &&
        !centre.titleHidden &&
        centre.titleStyle === undefined;

    return (
        <div
            className="flex flex-col gap-3 rounded-control border-2 border-ink bg-paper p-3"
            data-testid="center-place"
            // Controle points here when an older edition still has its name over the fold (B183).
            data-field="center-place"
            tabIndex={-1}
        >
            <FieldLabel
                label={t(logo ? 'editor.center_logo' : 'editor.center_name')}
                onStandard={
                    standard
                        ? undefined
                        : () =>
                              editElement(session, editKey, {
                                  centerPlace: undefined,
                                  logoTilt: undefined,
                                  titleOffset: undefined,
                                  titleScale: undefined,
                                  titleHidden: undefined,
                                  titleStyle: undefined,
                              })
                }
            />
            <CenterPlaceChoice
                session={session}
                editKey={editKey}
                resolved={resolved}
            />
            {!logo && !centre.titleHidden && (
                <TitleStyleField
                    session={session}
                    editKey={editKey}
                    value={centre.titleStyle}
                    theme={THEMES[theme]}
                />
            )}
            <CenterSizeAndAngle
                session={session}
                editKey={editKey}
                resolved={resolved}
            />
            {withPhoto && !logo && (
                <CheckField
                    label={t('editor.title_show')}
                    checked={!centre.titleHidden}
                    field="title-hidden"
                    onCheckedChange={(checked) =>
                        editElement(session, editKey, {
                            titleHidden: checked ? undefined : true,
                        })
                    }
                />
            )}
        </div>
    );
};
