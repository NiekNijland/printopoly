import { Board, GameCard } from '@/components/render';
import { Scaled } from '@/components/render/table-scaled';
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
    type BoardProfile,
} from '@/lib/render/print-board';
import { formatMoney, standardEdition } from '@/lib/render/standard-edition';
import { cn } from '@/lib/utils';
import type { CurrencyId, Locale } from '@/types/game';

/**
 * A choice as a card with a picture (B84, B154, B201): the item of shadcn's RadioGroup sits in the title line, and
 * the whole card is its label. The chosen card gets the red frame of the design.
 */
export const CHOICE_CARD =
    'flex cursor-pointer flex-col gap-2 rounded-control border-2 border-ink bg-card p-2 motion-safe:transition-shadow has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-data-[state=checked]:border-press has-data-[state=checked]:shadow-[inset_0_0_0_1px_var(--color-press)] hover:shadow-paper';

export const Note = ({ children }: { children?: string }) => {
    return children === undefined ? null : (
        <p role="status" className="m-0 text-sm text-ink-soft">
            {children}
        </p>
    );
};

/** The fields of a new edition (B72, B150); the edition panel changes them one by one later (B145). */
export type EditionFieldValues = {
    name: string;
    language: Locale;
    currency: CurrencyId;
    theme: ThemeId;
    parts: Parts;
    boardProfile: BoardProfile;
};

/** Miniature of a theme (B84): the board in that theme with a Chance card next to it, so the themes look different at once. */
export const ThemeThumb = ({
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
}) => {
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
};

type ThemeChoiceProps = {
    theme: ThemeId;
    name: string;
    language: Locale;
    currency: CurrencyId;
    interfaceLanguage: Locale;
    idPrefix: string;
    onTheme: (theme: ThemeId) => void;
    note?: string;
};

/** The four themes as miniatures to choose from (B84). */
export const ThemeChoice = ({
    theme,
    name,
    language,
    currency,
    interfaceLanguage,
    idPrefix,
    onTheme,
    note,
}: ThemeChoiceProps) => {
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
};

/** The currencies a new edition can start with, the one of the language first (B154). */
const NEW_CURRENCIES: Record<Locale, readonly CurrencyId[]> = {
    nl: ['eur', 'gbp', 'usd', 'play'],
    en: ['gbp', 'eur', 'usd', 'play'],
};

/**
 * The currency of a new edition as four tiles, with how a price reads on the board (B154). An own name and sign
 * are for the editor, under Algemeen (B147).
 */
export const CurrencyChoice = ({
    currency,
    language,
    idPrefix,
    onCurrency,
}: {
    currency: CurrencyId;
    language: Locale;
    idPrefix: string;
    onCurrency: (currency: CurrencyId) => void;
}) => {
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
};
