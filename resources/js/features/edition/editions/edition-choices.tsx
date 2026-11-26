import { Fragment, useState } from 'react';

import { Board, GameCard } from '@/components/render';
import { Scaled } from '@/components/render/table-scaled';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTranslation } from '@/hooks/use-translation';
import { messages } from '@/lib/render/edition-strings';
import {
    THEME_IDS,
    type Parts,
    type ThemeId,
} from '@/lib/render/edition-types';
import {
    DEFAULT_BOARD_PROFILE,
    lidForBoard,
    spaceWidth,
    profileProblems,
    type ProfileField,
    type BoardProfile,
} from '@/lib/render/print-board';
import { formatMoney, standardEdition } from '@/lib/render/standard-edition';
import { cn } from '@/lib/utils';
import type { CurrencyId, Locale } from '@/types/game';
import { formatMm } from '@/types/print';

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

/** Miniature of a theme (B84): the board in that theme with a Chance card next to it, so the themes look different at once. */
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
                '@container pointer-events-none relative flex items-center justify-center overflow-hidden rounded-control bg-paper p-2',
                compact ? 'h-24' : 'h-36',
            )}
        >
            {/* Four themes side by side leave a narrow tile: the board and the card shrink with it, never cut off. */}
            <span
                className={cn(
                    'flex flex-none items-center justify-center gap-2',
                    !compact &&
                        'scale-[0.72] @min-[170px]:scale-[0.85] @min-[210px]:scale-100',
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

/** The four themes as miniatures to choose from (B84). */
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
                className="grid grid-cols-2 gap-3 lg:grid-cols-4"
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
        lidW: String(profile.boxLid.w),
        lidH: String(profile.boxLid.h),
    });
    const parse = (text: string) => Number(text.replace(',', '.'));
    // The lid follows the board until someone types a size of their own (B254). A custom board from before kept
    // the standard lid, which counts as following too.
    const [lidOwn, setLidOwn] = useState(
        () =>
            !sameLid(profile.boxLid, lidForBoard(profile.outer)) &&
            !sameLid(profile.boxLid, DEFAULT_BOARD_PROFILE.boxLid),
    );
    const followed = lidForBoard(parse(draft.outer));
    const customProfile: BoardProfile = {
        ...DEFAULT_BOARD_PROFILE,
        id: 'custom',
        name: t('edition.profile_custom'),
        outer: parse(draft.outer),
        corner: parse(draft.corner),
        border: parse(draft.border),
        boxLid: lidOwn
            ? { w: parse(draft.lidW), h: parse(draft.lidH) }
            : followed,
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

    const setDraftField = (
        field: 'outer' | 'corner' | 'border',
        value: string,
    ): void => {
        setDraft({ ...draft, [field]: value });
        setLast(field);
    };
    const setLidField = (field: 'lidW' | 'lidH', value: string): void => {
        // Typing one side keeps the other as it shows.
        setDraft({
            ...draft,
            ...(lidOwn
                ? {}
                : { lidW: String(followed.w), lidH: String(followed.h) }),
            [field]: value,
        });
        setLidOwn(true);
        setLast('lid');
    };
    // The board takes a size when you leave the field or press Enter, never halfway: typing 200 went through 2 and
    // 20 and drew tiny corners (Lukas, R5-19). An invalid size never reaches the board; it keeps the last valid one.
    const commit = (): void => {
        if (
            problems.length === 0 &&
            (customProfile.outer !== profile.outer ||
                customProfile.corner !== profile.corner ||
                customProfile.border !== profile.border ||
                !sameLid(customProfile.boxLid, profile.boxLid))
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
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
                    <fieldset className="col-span-full m-0 flex min-w-0 flex-col gap-1 border-0 p-0">
                        <legend className="mb-1 p-0 text-sm font-semibold">
                            D: {t('edition.profile_lid')}
                        </legend>
                        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-sm font-semibold">
                            {(
                                [
                                    ['lidW', 'edition.profile_lid_w'],
                                    ['lidH', 'edition.profile_lid_h'],
                                ] as const
                            ).map(([field, label], index) => (
                                <Fragment key={field}>
                                    {index === 1 && (
                                        <span
                                            aria-hidden="true"
                                            className="text-ink-soft"
                                        >
                                            ×
                                        </span>
                                    )}
                                    <Input
                                        inputMode="decimal"
                                        unit="mm"
                                        aria-label={t(label)}
                                        value={
                                            lidOwn
                                                ? draft[field]
                                                : String(
                                                      field === 'lidW'
                                                          ? followed.w
                                                          : followed.h,
                                                  )
                                        }
                                        aria-invalid={wrong('lid')}
                                        onChange={(event) =>
                                            setLidField(
                                                field,
                                                event.target.value,
                                            )
                                        }
                                        onBlur={commit}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                                commit();
                                            }
                                        }}
                                    />
                                </Fragment>
                            ))}
                        </div>
                        <p className="m-0 text-sm text-ink-soft">
                            {lidOwn ? (
                                <>
                                    {t('edition.profile_lid_own')}{' '}
                                    <button
                                        type="button"
                                        className="font-semibold underline underline-offset-4"
                                        onClick={() => {
                                            setLidOwn(false);
                                            onProfile({
                                                ...customProfile,
                                                boxLid: followed,
                                            });
                                        }}
                                    >
                                        {t('edition.profile_lid_follow')}
                                    </button>
                                </>
                            ) : (
                                t('edition.profile_lid_follows')
                            )}
                        </p>
                    </fieldset>
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

function sameLid(a: { w: number; h: number }, b: { w: number; h: number }) {
    return a.w === b.w && a.h === b.h;
}
