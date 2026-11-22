import { useState } from 'react';

import { Board, GameCard } from '@/components/render';
import { Scaled } from '@/components/table/scaled';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTranslation } from '@/hooks/use-translation';
import { messages } from '@/lib/edition/strings';
import { THEME_IDS, type Parts, type ThemeId } from '@/lib/edition/types';
import { formatMoney, standardEdition } from '@/lib/game/standard-edition';
import type { CurrencyId, Locale } from '@/lib/game/types';
import {
    DEFAULT_BOARD_PROFILE,
    spaceWidth,
    profileProblems,
    type ProfileField,
    type BoardProfile,
} from '@/lib/print/board';
import { formatMm } from '@/lib/print/types';
import { cn } from '@/lib/utils';

/**
 * A choice as a card with a picture (B84, B154, B201): the item of shadcn's RadioGroup sits in the title line, and
 * the whole card is its label. The chosen card gets the red frame of the design.
 */
export const CHOICE_CARD =
    'flex cursor-pointer flex-col gap-2 rounded-control border-2 border-ink bg-card p-2 motion-safe:transition-shadow has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-data-[state=checked]:border-press has-data-[state=checked]:shadow-[inset_0_0_0_1px_var(--color-press)] hover:shadow-paper';

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
            <RadioGroup
                value={theme}
                onValueChange={(value) => {
                    const next = THEME_IDS.find((id) => id === value);
                    if (next !== undefined) {
                        onTheme(next);
                    }
                }}
                name={`${idPrefix}-theme`}
                aria-label={t('edition.theme')}
                className="grid gap-3 sm:grid-cols-3"
            >
                {THEME_IDS.map((id) => (
                    <label key={id} className={CHOICE_CARD}>
                        <ThemeThumb
                            theme={id}
                            name={name}
                            locale={language}
                            currency={currency}
                        />
                        <span className="flex items-center gap-2 px-1 font-semibold">
                            <RadioGroupItem value={id} />
                            {m.themeName[id]}
                        </span>
                    </label>
                ))}
            </RadioGroup>
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
            <RadioGroup
                value={currency}
                onValueChange={(value) => {
                    const next = NEW_CURRENCIES[language].find(
                        (id) => id === value,
                    );
                    if (next !== undefined) {
                        onCurrency(next);
                    }
                }}
                name={`${idPrefix}-currency`}
                aria-label={t('edition.currency_line')}
                className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
                {NEW_CURRENCIES[language].map((id) => (
                    <label
                        key={id}
                        className={cn(
                            CHOICE_CARD,
                            'min-h-20 justify-between gap-1 px-3 py-2',
                        )}
                    >
                        <span
                            aria-hidden="true"
                            className="font-display text-2xl leading-none font-extrabold"
                        >
                            {formatMoney(200, id, language)}
                        </span>
                        <span className="flex items-center gap-2 font-semibold">
                            <RadioGroupItem value={id} />
                            {t(`edition.currency_${id}`)}
                        </span>
                    </label>
                ))}
            </RadioGroup>
            <p className="m-0 text-sm text-ink-soft">
                {t('edition.currency_later')}
            </p>
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
        ? profileProblems(customProfile, interfaceLanguage)
        : [];
    // The field typed in last: a size that does not fit with the others is blamed on it.
    const [last, setLast] = useState<ProfileField>('corner');
    // Only the field the problem is about turns red, not all three (Lukas, R5-19).
    const wrong = (field: ProfileField): boolean =>
        problems.some(
            (problem) =>
                problem.field === field ||
                problem.field === 'other' ||
                (problem.field === 'fit' && field === last),
        );

    const setDraftField = (field: keyof typeof draft, value: string): void => {
        setDraft({ ...draft, [field]: value });
        setLast(field);
    };
    // The board takes a size when you leave the field or press Enter, never halfway: typing 200 went through 2 and
    // 20 and drew tiny corners (Lukas, R5-19). An invalid size never reaches the board; it keeps the last valid one.
    const commit = (): void => {
        if (
            problems.length === 0 &&
            (customProfile.outer !== profile.outer ||
                customProfile.corner !== profile.corner ||
                customProfile.border !== profile.border)
        ) {
            onProfile(customProfile);
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
                                aria-invalid={wrong(field)}
                                aria-describedby={
                                    wrong(field)
                                        ? `${idPrefix}-profile-problem`
                                        : undefined
                                }
                                onChange={(event) =>
                                    setDraftField(field, event.target.value)
                                }
                                onBlur={commit}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        commit();
                                    }
                                }}
                            />
                        </label>
                    ))}
                    {problems.length > 0 ? (
                        <p
                            id={`${idPrefix}-profile-problem`}
                            role="alert"
                            className="col-span-full m-0 text-sm text-press"
                        >
                            {problems
                                .map((problem) => problem.message)
                                .join(' ')}
                        </p>
                    ) : (
                        <p className="col-span-full m-0 text-sm text-ink-soft">
                            {t('edition.profile_fits', {
                                width: formatMm(
                                    spaceWidth(customProfile),
                                    interfaceLanguage,
                                ),
                            })}
                        </p>
                    )}
                </div>
            )}
            {problems.length === 0 && <Note>{note}</Note>}
        </>
    );
}
