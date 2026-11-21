import { useEffect, useRef, type ReactNode } from 'react';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useTranslation } from '@/hooks/use-translation';
import { messages } from '@/lib/edition/strings';
import type { Parts, PartId, ThemeId } from '@/lib/edition/types';
import type { CurrencyId, Locale } from '@/lib/game/types';
import type { BoardProfile } from '@/lib/print/board';

import { BoardChoice, Note, PartsChoice, ThemeChoice } from './edition-choices';

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
    /** Put the cursor in the name field, with the suggested name selected, when the form opens. */
    autoFocusName?: boolean;
}

const CURRENCIES: readonly CurrencyId[] = ['eur', 'play', 'usd', 'gbp'];

function Section({
    legend,
    children,
}: {
    legend: string;
    children: ReactNode;
}) {
    return (
        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className="mb-3 p-0 text-sm font-semibold">{legend}</legend>
            {children}
        </fieldset>
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
    autoFocusName = false,
}: EditionFieldsProps) {
    const t = useTranslation();
    const nameInput = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (autoFocusName) {
            nameInput.current?.focus({ preventScroll: true });
            nameInput.current?.select();
        }
    }, [autoFocusName]);
    const m = messages[interfaceLanguage];

    return (
        <div className="flex flex-col gap-6">
            <label className="flex flex-col gap-1 text-sm font-semibold">
                {t('edition.name')}
                <Input
                    ref={nameInput}
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
                <ThemeChoice
                    theme={values.theme}
                    name={values.name}
                    language={values.language}
                    currency={values.currency}
                    interfaceLanguage={interfaceLanguage}
                    idPrefix={idPrefix}
                    onTheme={onTheme}
                    note={notes.theme}
                />
            </Section>

            <Section legend={t('edition.parts')}>
                <PartsChoice
                    parts={values.parts}
                    interfaceLanguage={interfaceLanguage}
                    onPart={onPart}
                    note={notes.parts}
                />
            </Section>

            <Section legend={t('edition.board')}>
                <BoardChoice
                    profile={values.boardProfile}
                    interfaceLanguage={interfaceLanguage}
                    idPrefix={idPrefix}
                    onProfile={onProfile}
                    note={notes.profile}
                />
            </Section>
        </div>
    );
}
