import { useId, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/hooks/use-translation';
import { wordKey, type WordId } from '@/lib/edition/keys';
import type { EditionSession } from '@/lib/edition/session';
import type { Edition, ElementOverride } from '@/lib/edition/types';
import {
    CORNER_KINDS,
    MAX_CORNER_TEXT_LENGTH,
    MAX_SYMBOL_LENGTH,
    MAX_WORD_LENGTH,
    cornerKey,
    defaultWords,
    resolveWords,
} from '@/lib/edition/words';
import { editElement } from '@/lib/editor/edit';
import { formatMoney, standardEdition } from '@/lib/game/standard-edition';
import type { CornerKind, Locale } from '@/lib/game/types';
import { standardCornerText } from '@/lib/render/corners';
import { deedContent } from '@/lib/render/deed-rows';
import { cn } from '@/lib/utils';

interface WordsDialogProps {
    session: EditionSession;
    edition: Edition;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Opens an element of the editor (a corner, to give it a photo) and closes the dialog. */
    onOpenElement: (key: string) => void;
}

/** One text field of one element, empty when the edition leaves it to the standard word. */
function WordField({
    session,
    edition,
    elementKey,
    field,
    label,
    placeholder,
    maxLength,
    hint,
    className,
}: {
    session: EditionSession;
    edition: Edition;
    elementKey: string;
    field: 'name' | 'text';
    label: string;
    /** The standard word; shown grey while the field is empty. */
    placeholder: string;
    maxLength: number;
    hint?: string;
    className?: string;
}) {
    const id = useId();
    const value = edition.elements[elementKey]?.[field] ?? '';

    return (
        <div className={cn('flex flex-col gap-1', className)}>
            <label htmlFor={id} className="text-sm font-semibold">
                {label}
            </label>
            <Input
                id={id}
                data-field={`${elementKey}.${field}`}
                value={value}
                maxLength={maxLength}
                placeholder={placeholder}
                autoComplete="off"
                onChange={(event) =>
                    editElement(
                        session,
                        elementKey,
                        {
                            [field]:
                                event.target.value === ''
                                    ? undefined
                                    : event.target.value,
                        } satisfies Partial<ElementOverride>,
                        `words:${elementKey}:${field}`,
                    )
                }
            />
            {hint !== undefined && (
                <p className="m-0 text-xs text-ink-soft">{hint}</p>
            )}
        </div>
    );
}

function Section({
    title,
    hint,
    tint,
    className,
    children,
}: {
    title: string;
    hint?: string;
    tint: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <section
            className={cn(
                'flex flex-col gap-3 rounded-control border-2 border-ink bg-card p-4',
                className,
            )}
        >
            <div className="-mx-4 -mt-4 mb-1 border-b-2 border-ink px-4 py-2">
                <div
                    aria-hidden="true"
                    className={cn(
                        'mb-1 h-1.5 w-12 rounded-full border border-ink',
                        tint,
                    )}
                />
                <h3 className="m-0 font-display text-xl font-extrabold">
                    {title}
                </h3>
            </div>
            {hint !== undefined && (
                <p className="m-0 text-sm text-ink-soft">{hint}</p>
            )}
            {children}
        </section>
    );
}

function Preview({ children }: { children: ReactNode }) {
    return (
        <p className="m-0 rounded-control bg-paper px-3 py-2 text-sm text-ink-soft">
            {children}
        </p>
    );
}

/**
 * "Woorden van je editie": the fixed words of the game (houses, hotels, jail, decks, currency, the corners
 * and the tax spaces) as fields. An empty field is the standard word, shown as placeholder.
 */
export function WordsDialog({
    session,
    edition,
    open,
    onOpenChange,
    onOpenElement,
}: WordsDialogProps) {
    const t = useTranslation();
    const language: Locale = edition.language;
    const standard = defaultWords(edition);
    const words = resolveWords(edition);
    const symbol = words.customSymbol;
    const amount = (value: number) =>
        formatMoney(value, edition.currency, language, symbol);

    const field = (
        elementKey: string,
        name: 'name' | 'text',
        label: string,
        placeholder: string,
        extra: { maxLength?: number; hint?: string; className?: string } = {},
    ) => (
        <WordField
            session={session}
            edition={edition}
            elementKey={elementKey}
            field={name}
            label={label}
            placeholder={placeholder}
            maxLength={extra.maxLength ?? MAX_WORD_LENGTH}
            hint={extra.hint}
            className={extra.className}
        />
    );

    const word = (id: WordId) => wordKey(id);
    const street = standardEdition.spaces.find(
        (space) => space.type === 'street',
    );
    const buildings =
        street?.type === 'street'
            ? deedContent(street, language, edition.currency, words)
            : undefined;

    const cornerPlaceholder = (corner: CornerKind) => {
        const space = standardEdition.spaces.find(
            (candidate) =>
                candidate.type === 'corner' && candidate.corner === corner,
        );

        return space?.name[language] ?? '';
    };
    const cornerTextPlaceholder = (corner: CornerKind): string =>
        standardCornerText(corner, language, edition.currency, symbol);
    const taxes = standardEdition.spaces.filter(
        (space) => space.type === 'tax',
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogTitle>{t('words.title')}</DialogTitle>
                <DialogDescription>{t('words.hint')}</DialogDescription>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <Section
                        title={t('words.section_buildings')}
                        hint={t('words.buildings_hint')}
                        tint="bg-print-green"
                    >
                        <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2">
                            {field(
                                word('house'),
                                'name',
                                t('words.house'),
                                standard.house.singular,
                            )}
                            {field(
                                word('house'),
                                'text',
                                t('words.houses'),
                                standard.house.plural,
                            )}
                            {field(
                                word('hotel'),
                                'name',
                                t('words.hotel'),
                                standard.hotel.singular,
                            )}
                            {field(
                                word('hotel'),
                                'text',
                                t('words.hotels'),
                                standard.hotel.plural,
                            )}
                        </div>
                        {buildings !== undefined && (
                            <Preview>
                                {t('words.preview_buildings', {
                                    text: `${buildings.rows[3]?.label ?? ''}, ${buildings.rows[6]?.label ?? ''}`,
                                })}
                            </Preview>
                        )}
                    </Section>

                    <Section
                        title={t('words.section_money')}
                        hint={t('words.money_hint')}
                        tint="bg-print-yellow"
                    >
                        <div className="grid grid-cols-[1fr_7rem] gap-3">
                            {field(
                                word('currency'),
                                'name',
                                t('words.currency_name'),
                                standard.currencyName,
                            )}
                            {field(
                                word('currency'),
                                'text',
                                t('words.currency_symbol'),
                                standard.currencySymbol,
                                { maxLength: MAX_SYMBOL_LENGTH },
                            )}
                        </div>
                        <Preview>
                            {t('words.preview_money', {
                                text: amount(1500),
                            })}
                        </Preview>
                    </Section>

                    <Section
                        title={t('words.section_decks')}
                        hint={t('words.decks_hint')}
                        tint="bg-print-chance"
                    >
                        <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2">
                            {field(
                                word('chance'),
                                'name',
                                t('words.deck_chance'),
                                standard.decks.chance,
                            )}
                            {field(
                                word('chest'),
                                'name',
                                t('words.deck_chest'),
                                standard.decks.chest,
                            )}
                        </div>
                    </Section>

                    <Section
                        title={t('words.section_taxes')}
                        hint={t('words.taxes_hint')}
                        tint="bg-print-orange"
                    >
                        <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2">
                            {taxes.map((space) =>
                                field(
                                    `space.${String(space.position).padStart(2, '0')}`,
                                    'name',
                                    space.name[language],
                                    space.name[language],
                                ),
                            )}
                        </div>
                        <Preview>
                            {taxes
                                .map((space) =>
                                    space.type === 'tax'
                                        ? amount(space.amount)
                                        : '',
                                )
                                .join(' · ')}
                        </Preview>
                    </Section>

                    <Section
                        title={t('words.section_corners')}
                        hint={t('words.corners_hint')}
                        tint="bg-print-red"
                        className="md:col-span-2"
                    >
                        <div className="grid gap-4 lg:grid-cols-2">
                            {CORNER_KINDS.map((corner) => {
                                const key = cornerKey(corner);
                                const hasPhoto =
                                    edition.elements[key]?.photo !== undefined;

                                return (
                                    <div
                                        key={corner}
                                        className="flex flex-col gap-3 rounded-control border-2 border-line-strong p-3"
                                    >
                                        <h4 className="m-0 font-display text-lg font-extrabold">
                                            {t(`words.corner_${corner}`)}
                                        </h4>
                                        {field(
                                            key,
                                            'name',
                                            t('words.corner_name'),
                                            cornerPlaceholder(corner),
                                        )}
                                        {field(
                                            key,
                                            'text',
                                            t('words.corner_text'),
                                            cornerTextPlaceholder(corner),
                                            {
                                                maxLength:
                                                    MAX_CORNER_TEXT_LENGTH,
                                                hint: t(
                                                    corner === 'start'
                                                        ? 'words.corner_text_start'
                                                        : corner === 'jail'
                                                          ? 'words.corner_text_jail'
                                                          : 'words.corner_text_line',
                                                ),
                                            },
                                        )}
                                        {corner === 'jail' &&
                                            field(
                                                word('jail'),
                                                'name',
                                                t('words.jail_word'),
                                                standard.jail,
                                                {
                                                    hint: t(
                                                        'words.jail_word_hint',
                                                    ),
                                                },
                                            )}
                                        <Button
                                            variant="secondary"
                                            className="self-start"
                                            onClick={() => onOpenElement(key)}
                                        >
                                            {t(
                                                hasPhoto
                                                    ? 'words.photo_edit'
                                                    : 'words.photo_add',
                                            )}
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    </Section>
                </div>

                <div className="mt-6 flex justify-end">
                    <DialogClose asChild>
                        <Button>{t('app.done')}</Button>
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    );
}
