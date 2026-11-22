import { useState } from 'react';

import { Board, GameCard } from '@/components/render';
import { Scaled } from '@/components/table/scaled';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/hooks/use-translation';
import { messages } from '@/lib/edition/strings';
import {
    PART_IDS,
    THEME_IDS,
    type Parts,
    type PartId,
    type ThemeId,
} from '@/lib/edition/types';
import { formatMoney, standardEdition } from '@/lib/game/standard-edition';
import type { CurrencyId, Locale } from '@/lib/game/types';
import {
    DEFAULT_BOARD_PROFILE,
    spaceWidth,
    validateProfile,
    type BoardProfile,
} from '@/lib/print/board';
import { formatMm } from '@/lib/print/types';
import { cn } from '@/lib/utils';

function Note({ children }: { children?: string }) {
    return children === undefined ? null : (
        <p role="status" className="m-0 text-sm text-ink-soft">
            {children}
        </p>
    );
}

/** The fields of a new edition (B72, B150); the edition panel changes them one by one later (B145). */
export interface EditionFieldValues {
    name: string;
    language: Locale;
    currency: CurrencyId;
    theme: ThemeId;
    parts: Parts;
    boardProfile: BoardProfile;
}

/** Miniature of a theme (B84): the board in that theme with a Chance card next to it, so the three look different at once. */
export function ThemeThumb({
    theme,
    name,
    locale,
    currency,
    compact = false,
}: {
    theme: ThemeId;
    name: string;
    locale: Locale;
    currency?: CurrencyId;
    /** Smaller, for the three tiles in the edition panel. */
    compact?: boolean;
}) {
    const card = standardEdition.decks.chance[0];

    return (
        <span
            aria-hidden="true"
            className={cn(
                'pointer-events-none relative flex items-center justify-center gap-2 overflow-hidden rounded-control bg-paper p-2',
                compact ? 'h-24' : 'h-36',
            )}
        >
            <Scaled
                widthMm={DEFAULT_BOARD_PROFILE.outer}
                heightMm={DEFAULT_BOARD_PROFILE.outer}
                width={compact ? 76 : 124}
                className="shadow-sheet"
                style={{ transform: 'rotate(-4deg)' }}
            >
                <Board
                    theme={theme}
                    locale={locale}
                    currency={currency}
                    editionName={name}
                    profile={DEFAULT_BOARD_PROFILE}
                />
            </Scaled>
            {card !== undefined && (
                <Scaled
                    widthMm={63}
                    heightMm={88}
                    width={compact ? 30 : 48}
                    className="shadow-sheet"
                    style={{ transform: 'rotate(6deg)' }}
                >
                    <GameCard
                        theme={theme}
                        locale={locale}
                        currency={currency}
                        deck="chance"
                        side="front"
                        card={card}
                    />
                </Scaled>
            )}
        </span>
    );
}

interface ThemeChoiceProps {
    theme: ThemeId;
    name: string;
    language: Locale;
    currency: CurrencyId;
    interfaceLanguage: Locale;
    idPrefix: string;
    onTheme: (theme: ThemeId) => void;
    note?: string;
}

/** The three themes as miniatures to choose from (B84). */
export function ThemeChoice({
    theme,
    name,
    language,
    currency,
    interfaceLanguage,
    idPrefix,
    onTheme,
    note,
}: ThemeChoiceProps) {
    const t = useTranslation();
    const m = messages[interfaceLanguage];

    return (
        <>
            <div
                role="radiogroup"
                aria-label={t('edition.theme')}
                className="grid gap-3 sm:grid-cols-3"
            >
                {THEME_IDS.map((id) => (
                    <label
                        key={id}
                        className={cn(
                            'flex cursor-pointer flex-col gap-2 rounded-control border-2 border-ink bg-card p-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2',
                            theme === id &&
                                'border-press shadow-[inset_0_0_0_1px_var(--color-press)]',
                        )}
                    >
                        <input
                            type="radio"
                            name={`${idPrefix}-theme`}
                            className="sr-only"
                            checked={theme === id}
                            onChange={() => onTheme(id)}
                        />
                        <ThemeThumb
                            theme={id}
                            name={name}
                            locale={language}
                            currency={currency}
                        />
                        <span className="flex items-center justify-between px-1 font-semibold">
                            {m.themeName[id]}
                            {theme === id && (
                                <span className="text-sm text-press">
                                    {t('edition.chosen')}
                                </span>
                            )}
                        </span>
                    </label>
                ))}
            </div>
            <Note>{note}</Note>
        </>
    );
}

/** The currencies a new edition can start with, the one of the language first (B154). */
const NEW_CURRENCIES: Record<Locale, readonly CurrencyId[]> = {
    nl: ['eur', 'gbp', 'usd', 'play'],
    en: ['gbp', 'eur', 'usd', 'play'],
};

/**
 * The currency of a new edition as four tiles, with how a price reads on the board (B154). An own name and sign
 * are for the editor, under Algemeen (B147).
 */
export function CurrencyChoice({
    currency,
    language,
    idPrefix,
    onCurrency,
}: {
    currency: CurrencyId;
    language: Locale;
    idPrefix: string;
    onCurrency: (currency: CurrencyId) => void;
}) {
    const t = useTranslation();

    return (
        <>
            <div
                role="radiogroup"
                aria-label={t('edition.currency_line')}
                className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
                {NEW_CURRENCIES[language].map((id) => (
                    <label
                        key={id}
                        className={cn(
                            'flex min-h-20 cursor-pointer flex-col justify-between gap-1 rounded-control border-2 border-ink bg-card px-3 py-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2',
                            currency === id &&
                                'border-press shadow-[inset_0_0_0_1px_var(--color-press)]',
                        )}
                    >
                        <input
                            type="radio"
                            name={`${idPrefix}-currency`}
                            className="sr-only"
                            checked={currency === id}
                            onChange={() => onCurrency(id)}
                        />
                        <span
                            aria-hidden="true"
                            className="font-display text-2xl leading-none font-extrabold"
                        >
                            {formatMoney(200, id, language)}
                        </span>
                        <span className="font-semibold">
                            {t(`edition.currency_${id}`)}
                        </span>
                    </label>
                ))}
            </div>
            <p className="m-0 text-sm text-ink-soft">
                {t('edition.currency_later')}
            </p>
        </>
    );
}

interface PartsChoiceProps {
    parts: Parts;
    interfaceLanguage: Locale;
    onPart: (part: PartId, on: boolean) => void;
    note?: string;
}

/** The parts to include, one checkbox each; the board is always in. */
export function PartsChoice({
    parts,
    interfaceLanguage,
    onPart,
    note,
}: PartsChoiceProps) {
    const t = useTranslation();
    const m = messages[interfaceLanguage];

    return (
        <>
            {PART_IDS.map((part) =>
                part === 'board' ? (
                    <label
                        key={part}
                        className="flex min-h-11 items-center gap-3"
                    >
                        <input
                            type="checkbox"
                            checked
                            disabled
                            className="size-5 shrink-0 accent-ink"
                        />
                        <span>
                            <strong>{m.partName.board}</strong> ·{' '}
                            {t('edition.part_note.board')}
                        </span>
                    </label>
                ) : (
                    <label
                        key={part}
                        className="flex min-h-11 items-center gap-3"
                    >
                        <input
                            type="checkbox"
                            checked={parts[part]}
                            onChange={(event) =>
                                onPart(part, event.target.checked)
                            }
                            className="size-5 shrink-0 accent-press"
                        />
                        <span>
                            <strong>{m.partName[part]}</strong> ·{' '}
                            {t(`edition.part_note.${part}`, {
                                houses: t('print.word.houses'),
                                hotels: t('print.word.hotels'),
                            })}
                        </span>
                    </label>
                ),
            )}
            <p className="m-0 text-sm text-ink-soft">
                {t('edition.parts_hint')}
            </p>
            <Note>{note}</Note>
        </>
    );
}

interface BoardChoiceProps {
    profile: BoardProfile;
    interfaceLanguage: Locale;
    idPrefix: string;
    onProfile: (profile: BoardProfile) => void;
    note?: string;
}

/** The standard board size, or an own size with the three measures (B72). */
export function BoardChoice({
    profile,
    interfaceLanguage,
    idPrefix,
    onProfile,
    note,
}: BoardChoiceProps) {
    const t = useTranslation();
    const custom = profile.id === 'custom';
    const [draft, setDraft] = useState({
        outer: String(profile.outer),
        corner: String(profile.corner),
        border: String(profile.border),
    });
    const parse = (text: string) => Number(text.replace(',', '.'));
    const customProfile: BoardProfile = {
        ...DEFAULT_BOARD_PROFILE,
        id: 'custom',
        name: t('edition.profile_custom'),
        outer: parse(draft.outer),
        corner: parse(draft.corner),
        border: parse(draft.border),
        provisional: false,
    };
    const problems = custom
        ? validateProfile(customProfile, interfaceLanguage)
        : [];

    const setDraftField = (field: keyof typeof draft, value: string): void => {
        const next = { ...draft, [field]: value };
        setDraft(next);
        const changed: BoardProfile = {
            ...customProfile,
            outer: parse(next.outer),
            corner: parse(next.corner),
            border: parse(next.border),
        };
        if (validateProfile(changed, interfaceLanguage).length === 0) {
            onProfile(changed);
        }
    };

    return (
        <>
            <label className="grid grid-cols-[auto_1fr] items-start gap-x-3">
                <input
                    type="radio"
                    name={`${idPrefix}-board`}
                    checked={!custom}
                    onChange={() => onProfile(DEFAULT_BOARD_PROFILE)}
                    className="row-span-2 mt-0.5 size-5 shrink-0 accent-press"
                />
                <strong>{t('edition.profile_standard')}</strong>
                <span className="col-start-2 text-sm text-ink-soft">
                    {t('edition.profile_standard_note')}
                </span>
            </label>
            <label className="grid grid-cols-[auto_1fr] items-start gap-x-3">
                <input
                    type="radio"
                    name={`${idPrefix}-board`}
                    checked={custom}
                    onChange={() => onProfile(customProfile)}
                    className="row-span-2 mt-0.5 size-5 shrink-0 accent-press"
                />
                <strong>{t('edition.profile_custom')}</strong>
                <span className="col-start-2 text-sm text-ink-soft">
                    {t('edition.profile_custom_note')}
                </span>
            </label>
            {custom && (
                <div className="grid gap-3 sm:grid-cols-3">
                    {(
                        [
                            ['outer', 'A', 'edition.profile_outer'],
                            ['corner', 'B', 'edition.profile_corner'],
                            ['border', 'C', 'edition.profile_border'],
                        ] as const
                    ).map(([field, letter, label]) => (
                        <label
                            key={field}
                            className="flex flex-col gap-1 text-sm font-semibold"
                        >
                            {letter}: {t(label)}
                            <Input
                                inputMode="decimal"
                                unit="mm"
                                value={draft[field]}
                                aria-invalid={problems.length > 0}
                                aria-describedby={
                                    problems.length > 0
                                        ? `${idPrefix}-profile-problem`
                                        : undefined
                                }
                                onChange={(event) =>
                                    setDraftField(field, event.target.value)
                                }
                            />
                        </label>
                    ))}
                    {problems.length > 0 ? (
                        <p
                            id={`${idPrefix}-profile-problem`}
                            role="alert"
                            className="col-span-full m-0 text-sm text-press"
                        >
                            {problems.join(' ')}
                        </p>
                    ) : (
                        <p className="col-span-full m-0 text-sm text-ink-soft">
                            {t('edition.profile_fits', {
                                width: formatMm(spaceWidth(customProfile)),
                            })}
                        </p>
                    )}
                </div>
            )}
            {problems.length === 0 && <Note>{note}</Note>}
        </>
    );
}
