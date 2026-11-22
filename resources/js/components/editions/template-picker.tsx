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
    type ThemeId,
} from '@/lib/edition/types';
import { standardEdition } from '@/lib/game/standard-edition';
import type { Locale } from '@/lib/game/types';
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

/** `null` is the blank start: the standard edition. */
export type TemplateChoice = TemplateId | null;

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
    const edition = useMemo(
        () => (choice === null ? undefined : templateEdition(choice, locale)),
        [choice, locale],
    );
    const theme: ThemeId = edition?.theme ?? 'classic';
    const spaces = useMemo(() => templateSpaces(edition), [edition]);
    const chance = edition?.elements['card.chance.07'];
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

/** The value of Leeg in the radio group, which only takes strings. */
const BLANK = 'blank';

const TITLE = 'font-display text-base leading-tight font-extrabold';
// The tagline says who the template is for (UX 8, round 4), so it is shown whole.
const TAGLINE = 'text-xs text-ink-soft sm:text-sm';

/**
 * "Begin met…" (B127, B201): Leeg and the six templates as cards in shadcn's RadioGroup. Leeg is two wide, so the
 * seven fill two rows of four from a small screen up and rows of two on a phone. The arrow keys move between the
 * cards; "Bekijk dit sjabloon" under each card is a link of its own.
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
                    onChange(isOfferedTemplate(next) ? next : null)
                }
                name="template"
                aria-label={t('templates.title')}
                className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
                <label
                    htmlFor="template-blank"
                    className={cn(
                        CHOICE_CARD,
                        'col-span-2 flex-row items-center gap-3',
                    )}
                >
                    <TemplateThumb
                        choice={null}
                        locale={locale}
                        name={blankName}
                        tone={TILE_TONES[0]}
                        board={80}
                        className="h-24 w-32 flex-none sm:h-auto sm:w-1/2 sm:self-stretch"
                    />
                    <span className="flex min-w-0 flex-col gap-1 px-1">
                        <span className={cn(TITLE, 'flex items-center gap-2')}>
                            <RadioGroupItem id="template-blank" value={BLANK} />
                            {t('templates.blank')}
                        </span>
                        <span className={TAGLINE}>
                            {t('templates.blank_tagline')}
                        </span>
                    </span>
                </label>
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
                                tone={TILE_TONES[(index + 1) % 8] ?? 'bg-board'}
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
