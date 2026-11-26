import {
    plateLookOf,
    titleFontOf,
    titleMarkOf,
} from '@/components/render/edition-title';
import { editElement } from '@/features/edition/editor/edit';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import { TITLE_STYLES, type TitleStyle } from '@/lib/render/edition-types';
import type { Theme } from '@/lib/render/themes';

import { ChoiceRow } from './panel-parts';

type Choice = TitleStyle | 'theme';

const CHOICES: readonly Choice[] = ['theme', ...TITLE_STYLES];

type IconFont = ReturnType<typeof titleFontOf>;

const IconText = ({
    font,
    color,
    size,
    y = 15.5,
}: {
    font: IconFont;
    color: string;
    size: number;
    y?: number;
}) => (
    <text
        x="24"
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={font.family}
        fontWeight={font.weight}
        fontSize={size}
        fill={color}
    >
        {font.upper ? 'AA' : 'Aa'}
    </text>
);

const PlateArt = ({
    own,
    theme,
    font,
}: {
    own: TitleStyle | undefined;
    theme: Theme;
    font: IconFont;
}) => {
    const look = plateLookOf(own, theme);
    const edge = look.edge ?? theme.ink;

    return (
        <g transform={`rotate(${look.tilt * 1.4} 24 15)`}>
            {look.back !== undefined && (
                <rect
                    x="6"
                    y="9.5"
                    width="34"
                    height="15"
                    rx={look.radius > 0 ? 1.5 : 0}
                    fill={look.back}
                    stroke={edge}
                    strokeWidth="1"
                />
            )}
            {look.flap !== undefined && (
                <path
                    d="M10 11H2l3 5-3 5h8zM38 11h8l-3 5 3 5h-8z"
                    fill={look.flap}
                    stroke={edge}
                    strokeWidth="1"
                    strokeLinejoin="round"
                />
            )}
            <rect
                x="8"
                y="7"
                width="32"
                height="15"
                rx={look.radius > 0 ? 1.5 : 0}
                fill={look.fill}
                stroke={edge}
                strokeWidth={look.edgeScale === undefined ? 1.2 : 0.8}
            />
            <IconText
                font={font}
                color={look.text}
                size={font.scale > 1 ? 13 : 9}
                y={14.5}
            />
        </g>
    );
};

const StampArt = ({
    mark,
    theme,
    font,
}: {
    mark: string;
    theme: Theme;
    font: IconFont;
}) => (
    <g transform="rotate(-4 24 15)">
        <rect
            x="7"
            y="5"
            width="34"
            height="20"
            rx="3"
            fill={theme.paper}
            stroke={mark}
            strokeWidth="1.4"
        />
        <rect
            x="9.5"
            y="7.5"
            width="29"
            height="15"
            rx="1.5"
            fill="none"
            stroke={mark}
            strokeWidth="0.6"
        />
        <IconText font={font} color={mark} size={9} />
    </g>
);

/**
 * A small picture of a title style in the colours and fonts of the theme of the edition, so the choice shows what
 * it gives (like the old pictures of the place in the centre, B187).
 */
const TitleStyleIcon = ({ style, theme }: { style: Choice; theme: Theme }) => {
    const own = style === 'theme' ? undefined : style;
    const font = titleFontOf(own, theme);
    const mark = titleMarkOf(theme);

    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 48 30"
            className="size-auto h-8 w-13 shrink-0"
            data-title-style-icon={style}
        >
            {own === 'stamp' ? (
                <StampArt mark={mark} theme={theme} font={font} />
            ) : own === 'script' ? (
                <>
                    <IconText font={font} color={mark} size={17} y={12.5} />
                    <path
                        d="M8 23h12M28 23h12"
                        stroke={mark}
                        strokeWidth="0.8"
                        strokeLinecap="round"
                    />
                    <path d="M24 21l2 2-2 2-2-2z" fill={mark} />
                </>
            ) : own === 'plain' ? (
                <IconText
                    font={font}
                    color={theme.ink}
                    size={font.scale > 1 ? 18 : 13}
                />
            ) : (
                <PlateArt own={own} theme={theme} font={font} />
            )}
        </svg>
    );
};

/**
 * "Stijl van de naam" (Niek, 22 nov): how the name looks on the board centre or the box lid, apart from the theme.
 * Zoals het thema stores nothing; each element keeps its own choice (`titleStyle`).
 */
export const TitleStyleField = ({
    session,
    editKey,
    value,
    theme,
}: {
    session: EditionSession;
    editKey: string;
    value: TitleStyle | undefined;
    theme: Theme;
}) => {
    const t = useTranslation();

    return (
        <ChoiceRow<Choice>
            name={t('editor.title_style')}
            label={t('editor.title_style')}
            columns={3}
            fields={{ theme: 'title-style' }}
            options={CHOICES.map((choice) => ({
                id: choice,
                label: t(`editor.title_style_${choice}`),
                icon: <TitleStyleIcon style={choice} theme={theme} />,
            }))}
            value={value ?? 'theme'}
            onChange={(next) =>
                editElement(session, editKey, {
                    titleStyle: next === 'theme' ? undefined : next,
                })
            }
        />
    );
};
