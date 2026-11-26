import { useId, useState } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { editElement } from '@/features/edition/editor/edit';
import {
    FieldHead,
    StandardButton,
    WordInput,
} from '@/features/edition/editor/edition-field-parts';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import { BOARD_CENTER_KEY, wordKey } from '@/lib/render/edition-keys';
import { MAX_NAME_LENGTH } from '@/lib/render/edition-schema';
import { changeLanguage, rename } from '@/lib/render/edition-settings';
import { messages } from '@/lib/render/edition-strings';
import type { Edition } from '@/lib/render/edition-types';
import {
    MAX_SYMBOL_LENGTH,
    defaultWords,
    resolveWords,
} from '@/lib/render/edition-words';
import {
    CURRENCY_CHOICES,
    chooseCurrency,
    currencyChoice,
} from '@/lib/render/editor-edition-panel';
import { formatMoney } from '@/lib/render/standard-edition';
import { STRINGS } from '@/lib/render/strings';
import type { Locale } from '@/types/game';

type GeneralProps = {
    session: EditionSession;
    edition: Edition;
    interfaceLanguage: Locale;
};

const NameField = ({
    session,
    edition,
}: Omit<GeneralProps, 'interfaceLanguage'>) => {
    const t = useTranslation();
    const id = useId();
    const [nameDraft, setNameDraft] = useState<string | null>(null);

    return (
        <div className="flex flex-col gap-1">
            <FieldHead htmlFor={`${id}-name`} label={t('edition.name')} />
            <Input
                id={`${id}-name`}
                data-field="edition.name"
                value={nameDraft ?? edition.name}
                maxLength={MAX_NAME_LENGTH}
                autoComplete="off"
                onChange={(event) => {
                    setNameDraft(event.target.value);
                    if (event.target.value.trim() !== '') {
                        session.replace(
                            rename(session.edition, event.target.value),
                        );
                    }
                }}
                onBlur={() => setNameDraft(null)}
            />
        </div>
    );
};

const SubtitleField = ({
    session,
    edition,
}: Omit<GeneralProps, 'interfaceLanguage'>) => {
    const t = useTranslation();
    const id = useId();
    const centre = edition.elements[BOARD_CENTER_KEY];
    const hidden = centre?.subtitle === '';
    const subtitle = hidden ? '' : (centre?.subtitle ?? '');

    const setSubtitle = (value: string | undefined): void =>
        editElement(
            session,
            BOARD_CENTER_KEY,
            { subtitle: value },
            `subtitle:${BOARD_CENTER_KEY}`,
        );

    return (
        <div className="flex flex-col gap-1">
            <FieldHead
                htmlFor={`${id}-subtitle`}
                label={t('edition_panel.subtitle')}
                where={t('edition_panel.subtitle_where')}
                standard={
                    centre?.subtitle !== undefined && !hidden ? (
                        <StandardButton
                            onClick={() => setSubtitle(undefined)}
                        />
                    ) : undefined
                }
            />
            <div className="flex items-center gap-3">
                <Input
                    id={`${id}-subtitle`}
                    data-field="board_center.subtitle"
                    value={subtitle}
                    disabled={hidden}
                    placeholder={STRINGS[edition.language].centerTagline}
                    autoComplete="off"
                    className="min-w-0 flex-1"
                    onChange={(event) =>
                        setSubtitle(
                            event.target.value === ''
                                ? undefined
                                : event.target.value,
                        )
                    }
                />
                <label className="flex min-h-12 flex-none cursor-pointer items-center gap-2 text-sm font-semibold">
                    <Checkbox
                        checked={!hidden}
                        onCheckedChange={(checked) =>
                            setSubtitle(checked === true ? undefined : '')
                        }
                    />
                    {t('edition_panel.subtitle_show')}
                </label>
            </div>
        </div>
    );
};

const CustomCurrency = ({
    session,
    edition,
}: Omit<GeneralProps, 'interfaceLanguage'>) => {
    const t = useTranslation();
    const choice = currencyChoice(edition);
    const standard = defaultWords(edition);

    return (
        <div className="grid grid-cols-[1fr_6.5rem] gap-3 rounded-control bg-paper p-3">
            <WordInput
                session={session}
                edition={edition}
                elementKey={wordKey('currency')}
                field="name"
                label={t('edition_panel.currency_name')}
                placeholder={standard.currencyName}
            />
            <WordInput
                session={session}
                edition={edition}
                elementKey={wordKey('currency')}
                field="text"
                label={t('edition_panel.currency_symbol')}
                placeholder={standard.currencySymbol}
                maxLength={MAX_SYMBOL_LENGTH}
            />
            {choice !== 'custom' && (
                <p
                    role="status"
                    data-testid="currency-custom-empty"
                    className="col-span-2 m-0 text-sm font-semibold text-ink"
                >
                    {t('edition_panel.currency_custom_empty', {
                        currency: t(
                            `edition_panel.currency_${edition.currency}`,
                        ),
                    })}
                </p>
            )}
        </div>
    );
};

const LanguageField = ({
    session,
    edition,
    interfaceLanguage,
    onNote,
}: GeneralProps & { onNote: (note: string) => void }) => {
    const t = useTranslation();
    const id = useId();
    const m = messages[interfaceLanguage];

    return (
        <div className="flex flex-col gap-1">
            <FieldHead
                htmlFor={`${id}-language`}
                label={t('edition.language')}
            />
            <Select
                id={`${id}-language`}
                value={edition.language}
                onChange={(event) => {
                    const change = changeLanguage(
                        session.edition,
                        event.target.value === 'en' ? 'en' : 'nl',
                        interfaceLanguage,
                    );
                    session.applySettings(change);
                    onNote(change.summary);
                }}
            >
                <option value="nl">{m.languageName.nl}</option>
                <option value="en" lang="en">
                    {m.languageName.en}
                </option>
            </Select>
        </div>
    );
};

const CurrencyField = ({
    session,
    edition,
    custom,
    onWantCustom,
}: Omit<GeneralProps, 'interfaceLanguage'> & {
    custom: boolean;
    onWantCustom: (want: boolean) => void;
}) => {
    const t = useTranslation();
    const id = useId();
    const choice = currencyChoice(edition);

    return (
        <div className="flex flex-col gap-1">
            <FieldHead
                htmlFor={`${id}-currency`}
                label={t('edition_panel.currency')}
            />
            <Select
                id={`${id}-currency`}
                data-field="words.currency.name"
                value={custom ? 'custom' : choice}
                onChange={(event) => {
                    const value = event.target.value;
                    if (value === 'custom') {
                        onWantCustom(true);

                        return;
                    }
                    onWantCustom(false);
                    const currency = CURRENCY_CHOICES.find(
                        (candidate) => candidate === value,
                    );
                    if (currency !== undefined) {
                        session.applySettings(
                            chooseCurrency(session.edition, currency),
                        );
                    }
                }}
            >
                {CURRENCY_CHOICES.map((currency) => (
                    <option key={currency} value={currency}>
                        {t(`edition_panel.currency_${currency}`)}
                    </option>
                ))}
                <option value="custom">
                    {t('edition_panel.currency_custom')}
                </option>
            </Select>
        </div>
    );
};

/** Algemeen: name, subtitle, language and the one currency field (B147). */
export const GeneralFields = ({
    session,
    edition,
    interfaceLanguage,
}: GeneralProps) => {
    const t = useTranslation();
    const [note, setNote] = useState<string | null>(null);
    const [wantCustom, setWantCustom] = useState(false);
    const custom = currencyChoice(edition) === 'custom' || wantCustom;
    const words = resolveWords(edition);

    return (
        <>
            <NameField session={session} edition={edition} />
            <SubtitleField session={session} edition={edition} />
            <div className="grid items-end gap-4 min-[480px]:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <LanguageField
                    session={session}
                    edition={edition}
                    interfaceLanguage={interfaceLanguage}
                    onNote={setNote}
                />
                <CurrencyField
                    session={session}
                    edition={edition}
                    custom={custom}
                    onWantCustom={setWantCustom}
                />
            </div>
            {note !== null && (
                <p role="status" className="m-0 -mt-2 text-sm text-ink-soft">
                    {note}
                </p>
            )}

            {custom && <CustomCurrency session={session} edition={edition} />}
            <p className="m-0 -mt-2 text-sm text-ink-soft">
                {t('edition_panel.currency_example', {
                    text: formatMoney(
                        200,
                        edition.currency,
                        edition.language,
                        words.customSymbol,
                    ),
                })}
            </p>
        </>
    );
};
