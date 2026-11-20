import { useState, type ReactNode } from 'react';

import { Board, GameCard } from '@/components/render';
import { Scaled } from '@/components/table/scaled';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useTranslation } from '@/hooks/use-translation';
import { messages } from '@/lib/edition/strings';
import {
    PART_IDS,
    THEME_IDS,
    type Parts,
    type PartId,
    type ThemeId,
} from '@/lib/edition/types';
import { standardEdition } from '@/lib/game/standard-edition';
import type { CurrencyId, Locale } from '@/lib/game/types';
import {
    DEFAULT_BOARD_PROFILE,
    spaceWidth,
    validateProfile,
    type BoardProfile,
} from '@/lib/print/board';
import { formatMm } from '@/lib/print/types';
import { cn } from '@/lib/utils';

export interface EditionFieldValues {
    name: string;
    language: Locale;
    currency: CurrencyId;
    theme: ThemeId;
    parts: Parts;
    boardProfile: BoardProfile;
}

export interface EditionFieldsProps {
    values: EditionFieldValues;
    interfaceLanguage: Locale;
    onName: (name: string) => void;
    onLanguage: (language: Locale) => void;
    onCurrency: (currency: CurrencyId) => void;
    onTheme: (theme: ThemeId) => void;
    onPart: (part: PartId, on: boolean) => void;
    onProfile: (profile: BoardProfile) => void;
    /** What a change did, shown under the field (Staten: "Instellingen van een editie"). */
    notes?: Partial<Record<'language' | 'theme' | 'parts' | 'profile', string>>;
    /** Prefix for ids, so two forms can be on one page. */
    idPrefix?: string;
}

const CURRENCIES: readonly CurrencyId[] = ['eur', 'play', 'usd', 'gbp'];

/** Miniature of a theme (B84): the board in that theme with a Chance card next to it, so the three look different at once. */
function ThemeThumb({ theme, name }: { theme: ThemeId; name: string }) {
    const card = standardEdition.decks.chance[0];

    return (
        <span
            aria-hidden="true"
            className="pointer-events-none relative flex h-36 items-center justify-center gap-2 overflow-hidden rounded-control bg-paper p-2"
        >
            <Scaled
                widthMm={DEFAULT_BOARD_PROFILE.outer}
                heightMm={DEFAULT_BOARD_PROFILE.outer}
                width={124}
                className="shadow-sheet"
                style={{ transform: 'rotate(-4deg)' }}
            >
                <Board
                    theme={theme}
                    locale="nl"
                    editionName={name}
                    profile={DEFAULT_BOARD_PROFILE}
                />
            </Scaled>
            {card !== undefined && (
                <Scaled
                    widthMm={63}
                    heightMm={88}
                    width={48}
                    className="shadow-sheet"
                    style={{ transform: 'rotate(6deg)' }}
                >
                    <GameCard
                        theme={theme}
                        locale="nl"
                        deck="chance"
                        side="front"
                        card={card}
                    />
                </Scaled>
            )}
        </span>
    );
}

function Section({
    legend,
    children,
}: {
    legend: string;
    children: ReactNode;
}) {
    return (
        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className="mb-3 text-base font-semibold">{legend}</legend>
            {children}
        </fieldset>
    );
}

function Note({ children }: { children?: string }) {
    return children === undefined ? null : (
        <p role="status" className="m-0 text-sm text-ink-soft">
            {children}
        </p>
    );
}

/**
 * The fields of a new edition and of the settings of an open edition (B72, B99): name, language,
 * currency, theme with thumbnails, the parts to include and the board profile.
 */
export function EditionFields({
    values,
    interfaceLanguage,
    onName,
    onLanguage,
    onCurrency,
    onTheme,
    onPart,
    onProfile,
    notes = {},
    idPrefix = 'edition',
}: EditionFieldsProps) {
    const t = useTranslation();
    const m = messages[interfaceLanguage];
    const custom = values.boardProfile.id === 'custom';
    const [draft, setDraft] = useState({
        outer: String(values.boardProfile.outer),
        corner: String(values.boardProfile.corner),
        border: String(values.boardProfile.border),
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
        const profile: BoardProfile = {
            ...customProfile,
            outer: parse(next.outer),
            corner: parse(next.corner),
            border: parse(next.border),
        };
        if (validateProfile(profile, interfaceLanguage).length === 0) {
            onProfile(profile);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <label className="flex flex-col gap-1 text-sm font-semibold">
                {t('edition.name')}
                <Input
                    value={values.name}
                    onChange={(event) => onName(event.target.value)}
                    autoComplete="off"
                />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-semibold">
                    {t('edition.language')}
                    <Select
                        value={values.language}
                        onChange={(event) =>
                            onLanguage(
                                event.target.value === 'en' ? 'en' : 'nl',
                            )
                        }
                    >
                        <option value="nl">{m.languageName.nl}</option>
                        <option value="en" lang="en">
                            {m.languageName.en}
                        </option>
                    </Select>
                </label>
                <label className="flex flex-col gap-1 text-sm font-semibold">
                    {t('edition.currency')}
                    <Select
                        value={values.currency}
                        onChange={(event) =>
                            onCurrency(event.target.value as CurrencyId)
                        }
                    >
                        {CURRENCIES.map((id) => (
                            <option key={id} value={id}>
                                {t(`edition.currency_${id}`)}
                            </option>
                        ))}
                    </Select>
                </label>
            </div>
            <Note>{notes.language}</Note>

            <Section legend={t('edition.theme')}>
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
                                values.theme === id &&
                                    'border-press shadow-[inset_0_0_0_1px_var(--color-press)]',
                            )}
                        >
                            <input
                                type="radio"
                                name={`${idPrefix}-theme`}
                                className="sr-only"
                                checked={values.theme === id}
                                onChange={() => onTheme(id)}
                            />
                            <ThemeThumb theme={id} name={values.name} />
                            <span className="flex items-center justify-between px-1 font-semibold">
                                {m.themeName[id]}
                                {values.theme === id && (
                                    <span className="text-sm text-press">
                                        {t('edition.chosen')}
                                    </span>
                                )}
                            </span>
                        </label>
                    ))}
                </div>
                <Note>{notes.theme}</Note>
            </Section>

            <Section legend={t('edition.parts')}>
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
                                className="size-5 accent-ink"
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
                                checked={values.parts[part]}
                                onChange={(event) =>
                                    onPart(part, event.target.checked)
                                }
                                className="size-5 accent-press"
                            />
                            <span>
                                <strong>{m.partName[part]}</strong> ·{' '}
                                {t(`edition.part_note.${part}`)}
                            </span>
                        </label>
                    ),
                )}
                <p className="m-0 text-sm text-ink-soft">
                    {t('edition.parts_hint')}
                </p>
                <Note>{notes.parts}</Note>
            </Section>

            <Section legend={t('edition.board')}>
                <label className="grid grid-cols-[auto_1fr] items-start gap-x-3">
                    <input
                        type="radio"
                        name={`${idPrefix}-board`}
                        checked={!custom}
                        onChange={() => onProfile(DEFAULT_BOARD_PROFILE)}
                        className="row-span-2 mt-0.5 size-5 accent-press"
                    />
                    <strong>{DEFAULT_BOARD_PROFILE.name}</strong>
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
                        className="row-span-2 mt-0.5 size-5 accent-press"
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
                                    onChange={(event) =>
                                        setDraftField(field, event.target.value)
                                    }
                                />
                            </label>
                        ))}
                        {problems.length > 0 ? (
                            <p
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
                <Note>{notes.profile}</Note>
            </Section>
        </div>
    );
}
