import { Link } from '@inertiajs/react';
import { useMemo } from 'react';

import { Board, GameCard, type SpaceOverride } from '@/components/render';
import { Scaled } from '@/components/table/scaled';
import { templateEdition, templates, type TemplateId } from '@/data/templates';
import { useTranslation } from '@/hooks/use-translation';
import type { Edition, ThemeId } from '@/lib/edition/types';
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
    /** Key of the line under the title, when the screen needs another one. */
    hint?: string;
    /** Smaller tiles, four to a row from a small screen up. */
    compact?: boolean;
}

const TILE =
    'flex cursor-pointer flex-col gap-2 p-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2';

/** "Begin met…" (B127): a row of starting points on the new edition screen, the blank edition first. */
export function TemplatePicker({
    value,
    onChange,
    locale,
    blankName,
    hint,
    compact = false,
}: PickerProps) {
    const t = useTranslation();
    const all = templates(locale);
    const thumb = compact ? { board: 62, className: 'h-24' } : {};
    const title = compact
        ? 'px-1 font-display text-base leading-tight font-extrabold'
        : 'px-1 font-display text-lg leading-tight font-extrabold';
    const tagline = compact
        ? 'line-clamp-2 px-1 text-xs text-ink-soft'
        : 'px-1 text-sm text-ink-soft';

    return (
        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className="mb-1 p-0 font-display text-xl font-extrabold">
                {t('templates.title')}
            </legend>
            <p className="m-0 text-sm text-ink-soft">
                {t(hint ?? 'templates.hint')}
            </p>
            <div
                role="radiogroup"
                aria-label={t('templates.title')}
                // Blank as one wide tile, then the nine templates three to a row (B159).
                className="grid grid-cols-2 gap-3 sm:grid-cols-3"
            >
                <div
                    className={cn(
                        'col-span-2 flex flex-col rounded-control border-2 border-ink bg-card sm:col-span-3',
                        value === null &&
                            'border-press shadow-[inset_0_0_0_1px_var(--color-press)]',
                    )}
                >
                    <label className={cn(TILE, 'flex-row items-center gap-3')}>
                        <input
                            type="radio"
                            name="template"
                            className="sr-only"
                            checked={value === null}
                            onChange={() => onChange(null)}
                        />
                        <TemplateThumb
                            choice={null}
                            locale={locale}
                            name={blankName}
                            tone={TILE_TONES[0]}
                            board={62}
                            className="h-24 w-36 flex-none sm:w-44"
                        />
                        <span className="flex min-w-0 flex-col gap-1">
                            <span className={title}>
                                {t('templates.blank')}
                            </span>
                            <span className={tagline}>
                                {t('templates.blank_tagline')}
                            </span>
                        </span>
                    </label>
                </div>
                {all.map((item, index) => (
                    <div
                        key={item.id}
                        className={cn(
                            'flex flex-col rounded-control border-2 border-ink bg-card',
                            value === item.id &&
                                'border-press shadow-[inset_0_0_0_1px_var(--color-press)]',
                        )}
                    >
                        <label className={cn(TILE, 'flex-1')}>
                            <input
                                type="radio"
                                name="template"
                                className="sr-only"
                                checked={value === item.id}
                                onChange={() => onChange(item.id)}
                            />
                            <TemplateThumb
                                choice={item.id}
                                locale={locale}
                                name={item.name}
                                tone={TILE_TONES[(index + 1) % 8] ?? 'bg-board'}
                                {...thumb}
                            />
                            <span className={title}>{item.label}</span>
                            <span className={tagline}>{item.tagline}</span>
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
            </div>
        </fieldset>
    );
}
