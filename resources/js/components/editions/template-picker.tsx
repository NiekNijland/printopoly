import { Link } from '@inertiajs/react';
import { useMemo } from 'react';

import { CHOICE_CARD } from '@/components/editions/edition-choices';
import { Board, GameCard, type SpaceOverride } from '@/components/render';
import { Scaled } from '@/components/table/scaled';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { templateEdition, templates, type TemplateId } from '@/data/templates';
import { useTranslation } from '@/hooks/use-translation';
import {
    isOfferedTemplate,
    type Edition,
    type ElementOverride,
    type ThemeId,
} from '@/lib/edition/types';
import { standardEdition } from '@/lib/game/standard-edition';
import type { Locale } from '@/lib/game/types';
import { NAMED_SPACE_KEYS } from '@/lib/editor/clear-names';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';
import { cn } from '@/lib/utils';
import { sample as editionsSample } from '@/routes/editions';

/** Table colours behind the miniatures, so the row is not one flat colour (B104). */
export const TILE_TONES = [
    'bg-board',
    'bg-print-chance',
    'bg-print-chest',
    'bg-warning',
    'bg-board-deep',
    'bg-print-chance',
    'bg-print-chest',
    'bg-warning',
] as const;

/** The start with empty names and cards, to fill in yourself, also with a pen (R6 Aisha, Sara; B259). */
export const EMPTY_START = 'empty';

/** `null` is the standard edition; `empty` the standard edition with empty names and cards. */
export type TemplateChoice = TemplateId | null | typeof EMPTY_START;

/** The names of an empty start on the miniature: every street, station and utility without a name. */
export const EMPTY_SPACES: Record<number, SpaceOverride> = Object.fromEntries(
    NAMED_SPACE_KEYS.map((key) => [Number(key.slice(6)), { name: '' }]),
);

/** The own street names of a template, as the board draws them. */
export function templateSpaces(
    edition: Edition | undefined,
): Record<number, SpaceOverride> {
    const result: Record<number, SpaceOverride> = {};
    for (const [key, override] of Object.entries(edition?.elements ?? {})) {
        if (key.startsWith('space.') && override.name !== undefined) {
            result[Number(key.slice(6))] = { name: override.name };
        }
    }

    return result;
}

interface ThumbProps {
    choice: TemplateChoice;
    locale: Locale;
    /** Name printed on the miniature board. */
    name: string;
    tone: string;
    /** Width of the miniature board in px. */
    board?: number;
    className?: string;
}

/** The board of a starting point with its own street names, and one of its Chance cards next to it. */
function TemplateThumb({
    choice,
    locale,
    name,
    tone,
    board = 92,
    className,
}: ThumbProps) {
    const empty = choice === EMPTY_START;
    const edition = useMemo(
        () =>
            choice === null || choice === EMPTY_START
                ? undefined
                : templateEdition(choice, locale),
        [choice, locale],
    );
    const theme: ThemeId = edition?.theme ?? 'classic';
    const spaces = useMemo(
        () => (empty ? EMPTY_SPACES : templateSpaces(edition)),
        [edition, empty],
    );
    const chance: ElementOverride | undefined = empty
        ? { text: '' }
        : edition?.elements['card.chance.07'];
    const standard = standardEdition.decks.chance[6];

    return (
        <span
            aria-hidden="true"
            className={cn(
                'pointer-events-none relative flex h-32 items-center justify-center gap-1.5 overflow-hidden rounded-control p-2',
                tone,
                className,
            )}
        >
            <Scaled
                widthMm={DEFAULT_BOARD_PROFILE.outer}
                heightMm={DEFAULT_BOARD_PROFILE.outer}
                width={board}
                className="shadow-sheet"
                style={{ transform: 'rotate(-5deg)' }}
            >
                <Board
                    theme={theme}
                    locale={locale}
                    editionName={name}
                    profile={DEFAULT_BOARD_PROFILE}
                    spaces={spaces}
                />
            </Scaled>
            <Scaled
                widthMm={63}
                heightMm={88}
                width={Math.round(board * 0.46)}
                className="shadow-sheet"
                style={{ transform: 'rotate(7deg)' }}
            >
                <GameCard
                    theme={theme}
                    locale={locale}
                    deck="chance"
                    side="front"
                    card={chance === undefined ? standard : undefined}
                    text={chance?.text}
                    amount={chance?.amount}
                />
            </Scaled>
        </span>
    );
}

interface PickerProps {
    value: TemplateChoice;
    onChange: (choice: TemplateChoice) => void;
    /** Interface language: the labels and the miniatures follow it. */
    locale: Locale;
    /** The name of an edition without a template, for its miniature. */
    blankName: string;
}

/** The value of Standaard in the radio group, which only takes strings. */
const BLANK = 'blank';

const TITLE = 'font-display text-base leading-tight font-extrabold';
// The tagline says who the template is for (UX 8, round 4), so it is shown whole.
const TAGLINE = 'text-xs text-ink-soft sm:text-sm';

/**
 * "Begin met…" (B127, B201, B259): Standaard, Leeg and the six templates as cards in shadcn's RadioGroup, eight of
 * the same size in two rows of four from a small screen up and rows of two on a phone. Standaard is the standard
 * game; Leeg has empty names and cards to fill in yourself. The arrow keys move between the cards; "Bekijk dit
 * sjabloon" under each template is a link of its own.
 */
export function TemplatePicker({
    value,
    onChange,
    locale,
    blankName,
}: PickerProps) {
    const t = useTranslation();
    const all = templates(locale);

    return (
        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className="mb-1 p-0 font-display text-xl font-extrabold">
                {t('templates.title')}
            </legend>
            <p className="m-0 text-sm text-ink-soft">
                {t('templates.hint_new')}
            </p>
            <RadioGroup
                value={value ?? BLANK}
                onValueChange={(next) =>
                    onChange(
                        next === EMPTY_START
                            ? EMPTY_START
                            : isOfferedTemplate(next)
                              ? next
                              : null,
                    )
                }
                name="template"
                aria-label={t('templates.title')}
                className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
                {(
                    [
                        [BLANK, null, 'templates.blank'],
                        [EMPTY_START, EMPTY_START, 'templates.empty'],
                    ] as const
                ).map(([id, choice, label], index) => (
                    <label
                        key={id}
                        htmlFor={`template-${id}`}
                        className={cn(CHOICE_CARD, 'gap-2 p-2 pb-1')}
                    >
                        <TemplateThumb
                            choice={choice}
                            locale={locale}
                            name={blankName}
                            tone={TILE_TONES[index] ?? 'bg-board'}
                            board={62}
                            className="h-24"
                        />
                        <span
                            className={cn(
                                TITLE,
                                'flex items-center gap-2 px-1',
                            )}
                        >
                            <RadioGroupItem id={`template-${id}`} value={id} />
                            {t(label)}
                        </span>
                        <span className={cn(TAGLINE, 'px-1 pb-1')}>
                            {t(`${label}_tagline`)}
                        </span>
                    </label>
                ))}
                {all.map((item, index) => (
                    <div
                        key={item.id}
                        className={cn(
                            CHOICE_CARD,
                            'cursor-auto gap-0 p-0 hover:shadow-none',
                        )}
                    >
                        <label className="flex flex-1 cursor-pointer flex-col gap-2 p-2 pb-1">
                            <TemplateThumb
                                choice={item.id}
                                locale={locale}
                                name={item.name}
                                tone={TILE_TONES[(index + 2) % 8] ?? 'bg-board'}
                                board={62}
                                className="h-24"
                            />
                            <span
                                className={cn(
                                    TITLE,
                                    'flex items-center gap-2 px-1',
                                )}
                            >
                                <RadioGroupItem value={item.id} />
                                {/* "Village or neighbourhood" is wider than a card at 1024 px: it breaks inside it (R5-22). */}
                                <span className="min-w-0 [overflow-wrap:anywhere] hyphens-auto">
                                    {item.label}
                                </span>
                            </span>
                            <span className={cn(TAGLINE, 'px-1')}>
                                {item.tagline}
                            </span>
                        </label>
                        <Link
                            href={editionsSample(locale, {
                                query: { template: item.id },
                            })}
                            aria-label={t('templates.preview_of', {
                                name: item.label,
                            })}
                            className="inline-flex min-h-11 items-center px-3 pb-1 text-sm font-semibold underline underline-offset-4 hover:text-press"
                        >
                            {t('templates.preview')}
                        </Link>
                    </div>
                ))}
            </RadioGroup>
        </fieldset>
    );
}
