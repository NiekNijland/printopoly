import { usePage } from '@inertiajs/react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { BoardChoice, ThemeThumb } from '@/components/editions/edition-choices';
import { ColorField } from '@/components/editor/style-controls';
import { TogetherSection } from '@/components/editor/together-section';
import { WarningIcon } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { CollectionBox } from '@/hooks/use-collection-box';
import { useTranslation } from '@/hooks/use-translation';
import type { CheckIssue } from '@/lib/checks/types';
import {
    BOARD_CENTER_KEY,
    BANK_KEY,
    THEME_ACCENT_KEY,
    groupKey,
    wordKey,
} from '@/lib/edition/keys';
import type { ResolvedEdition } from '@/lib/edition/resolve';
import { MAX_NAME_LENGTH } from '@/lib/edition/schema';
import type { EditionSession } from '@/lib/edition/session';
import {
    changeBoardProfile,
    changeLanguage,
    changeTheme,
    rename,
    setPart,
} from '@/lib/edition/settings';
import { messages } from '@/lib/edition/strings';
import {
    THEME_IDS,
    type Edition,
    type ElementOverride,
    type PartId,
} from '@/lib/edition/types';
import {
    MAX_SYMBOL_LENGTH,
    MAX_WORD_LENGTH,
    defaultWords,
    resolveWords,
} from '@/lib/edition/words';
import { editElement } from '@/lib/editor/edit';
import {
    CURRENCY_CHOICES,
    EDITION_SECTIONS,
    EXTRA_PARTS,
    GAME_PARTS,
    changedWords,
    chooseCurrency,
    currencyChoice,
    partCount,
    resetSection,
    sectionDiffers,
    sectionOfKey,
    type EditionSection,
} from '@/lib/editor/edition-panel';
import { formatMoney, standardEdition } from '@/lib/game/standard-edition';
import type { CurrencyId, Locale } from '@/lib/game/types';
import { deedContent } from '@/lib/render/deed-rows';
import { STRINGS } from '@/lib/render/strings';
import { THEMES } from '@/lib/render/themes';
import { cn } from '@/lib/utils';

/** A request from outside (name menu, Controle, a key) to show one section; `n` makes the same section count again. */
export interface SectionRequest {
    section: EditionSection;
    n: number;
}

interface EditionPanelProps {
    session: EditionSession;
    edition: Edition;
    resolved: ResolvedEdition;
    interfaceLanguage: Locale;
    issues: readonly CheckIssue[];
    collect: CollectionBox;
    /** Opens an element of the editor, for a contribution of a friend. */
    onOpenElement: (key: string) => void;
    request: SectionRequest | null;
}

const SECTION_LABEL: Record<EditionSection, string> = {
    general: 'edition_panel.section_general',
    look: 'edition_panel.section_look',
    words: 'edition_panel.section_words',
    parts: 'edition_panel.section_parts',
    board: 'edition_panel.section_board',
    together: 'edition_panel.section_together',
};

const sectionId = (section: EditionSection) => `edition-${section}`;

/** The small "Standaard" next to a label: only there when the field differs (B138 §3.5). */
function StandardButton({
    onClick,
    label,
}: {
    onClick: () => void;
    label?: string;
}) {
    const t = useTranslation();

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className="group -my-1.5 inline-flex min-h-11 shrink-0 cursor-pointer items-center border-0 bg-transparent p-0 focus-visible:outline-none"
        >
            {/* Same pill as in the field panel, in a button of 44 px high. */}
            <span className="inline-flex min-h-8 items-center gap-1 rounded-full border border-line-strong bg-card px-2.5 text-xs font-semibold text-ink group-hover:border-ink group-focus-visible:outline-3 group-focus-visible:outline-offset-2 group-focus-visible:outline-ink">
                <span aria-hidden="true">↺</span>
                {t('edition_panel.standard')}
            </span>
        </button>
    );
}

/** A label with, on the right, where the field shows up or its "Standaard". */
function FieldHead({
    htmlFor,
    label,
    where,
    standard,
}: {
    htmlFor?: string;
    label: string;
    where?: string;
    standard?: ReactNode;
}) {
    return (
        <div className="flex min-h-8 items-center justify-between gap-2">
            {htmlFor === undefined ? (
                <span className="text-sm font-semibold">{label}</span>
            ) : (
                <label htmlFor={htmlFor} className="text-sm font-semibold">
                    {label}
                </label>
            )}
            {standard ??
                (where !== undefined && (
                    <span className="text-right text-xs text-ink-soft">
                        {where}
                    </span>
                ))}
        </div>
    );
}

/** One word of the edition: empty is the standard word, shown grey (B126). */
function WordInput({
    session,
    edition,
    elementKey,
    field,
    label,
    placeholder,
    maxLength = MAX_WORD_LENGTH,
    where,
    className,
}: {
    session: EditionSession;
    edition: Edition;
    elementKey: string;
    field: 'name' | 'text';
    label: string;
    placeholder: string;
    maxLength?: number;
    where?: string;
    className?: string;
}) {
    const id = useId();
    const value = edition.elements[elementKey]?.[field] ?? '';
    const set = (next: string): void =>
        editElement(
            session,
            elementKey,
            {
                [field]: next === '' ? undefined : next,
            } satisfies Partial<ElementOverride>,
            `words:${elementKey}:${field}`,
        );

    return (
        <div className={cn('flex min-w-0 flex-col gap-1', className)}>
            <FieldHead
                htmlFor={id}
                label={label}
                where={where}
                standard={
                    value === '' ? undefined : (
                        <StandardButton onClick={() => set('')} />
                    )
                }
            />
            <Input
                id={id}
                data-field={`${elementKey}.${field}`}
                value={value}
                maxLength={maxLength}
                placeholder={placeholder}
                autoComplete="off"
                onChange={(event) => set(event.target.value)}
            />
        </div>
    );
}

interface SectionProps {
    section: EditionSection;
    /** What is chosen, for the folded section on a phone ("Klassiek", "5 van 10"). */
    summary?: ReactNode;
    open: boolean;
    onToggle: () => void;
    /** "Alles in deze sectie terug naar standaard", only when the section differs. */
    onReset?: () => void;
    children: ReactNode;
}

/** A section of the edition panel: a heading on a wide screen, a block that folds on a phone (§3.6). */
function PanelSection({
    section,
    summary,
    open,
    onToggle,
    onReset,
    children,
}: SectionProps) {
    const t = useTranslation();
    const title = t(SECTION_LABEL[section]);
    const body = `${sectionId(section)}-body`;

    return (
        <section
            id={sectionId(section)}
            aria-label={title}
            data-section={section}
            className="scroll-mt-3 rounded-control border-2 border-ink bg-card lg:rounded-none lg:border-0 lg:border-t lg:border-line lg:bg-transparent lg:py-6 lg:first-of-type:border-t-0 lg:first-of-type:pt-2"
        >
            <h3 className="m-0">
                <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={body}
                    onClick={onToggle}
                    className="flex min-h-12 w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-4 text-left lg:hidden"
                >
                    <span className="font-display text-lg font-extrabold">
                        {title}
                    </span>
                    <span className="ml-auto truncate text-sm text-ink-soft">
                        {summary}
                    </span>
                    <span
                        aria-hidden="true"
                        className="font-bold w-4 text-center text-lg"
                    >
                        {open ? '−' : '+'}
                    </span>
                </button>
                <span className="hidden font-display text-xl font-extrabold lg:block">
                    {title}
                </span>
            </h3>
            <div
                id={body}
                className={cn(
                    'flex-col gap-5 px-4 pb-4 lg:mt-4 lg:flex lg:px-0 lg:pb-0',
                    open ? 'flex' : 'hidden',
                )}
            >
                {children}
                {onReset !== undefined && (
                    <button
                        type="button"
                        onClick={onReset}
                        className="min-h-11 cursor-pointer self-start border-0 bg-transparent p-0 text-sm font-semibold underline underline-offset-4"
                    >
                        {t('edition_panel.reset_section')}
                    </button>
                )}
            </div>
        </section>
    );
}

/** What a note says without a bank name: "Speelgeld" (B85). */
function bankPlaceholder(language: Locale): string {
    const word = STRINGS[language].playMoney;

    return word.charAt(0).toUpperCase() + word.slice(1);
}

/** Swatch of a colour, as shown in the lists. */
function Swatch({ color, className }: { color: string; className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'rounded-sm inline-block size-5 flex-none border border-ink',
                className,
            )}
            style={{ background: color }}
        />
    );
}

/**
 * The edition as one element (B145): everything that holds for the whole edition, in fixed sections with jump
 * links on top. It takes the place of the settings and words dialogs and the Stijl tab. The board stays in sight
 * in the middle, so a theme or a colour shows at once. On a phone the sections fold, the first one open.
 */
export function EditionPanel({
    session,
    edition,
    resolved,
    interfaceLanguage,
    issues,
    collect,
    onOpenElement,
    request,
}: EditionPanelProps) {
    const t = useTranslation();
    const { locale } = usePage().props;
    const m = messages[interfaceLanguage];
    const [open, setOpen] = useState<ReadonlySet<EditionSection>>(
        () => new Set(['general']),
    );
    const scroller = useRef<HTMLDivElement>(null);

    const show = (section: EditionSection): void => {
        setOpen((now) => new Set(now).add(section));
        // After the section unfolds: scroll inside the panel, never the page around it.
        requestAnimationFrame(() => {
            const node = document.getElementById(sectionId(section));
            const box = scroller.current;
            if (node === null || box === null) {
                return;
            }
            box.scrollTop +=
                node.getBoundingClientRect().top -
                box.getBoundingClientRect().top -
                8;
        });
    };

    const lastRequest = useRef(0);
    useEffect(() => {
        if (request !== null && request.n !== lastRequest.current) {
            lastRequest.current = request.n;
            show(request.section);
        }
    }, [request]);

    const toggle = (section: EditionSection): void =>
        setOpen((now) => {
            const next = new Set(now);
            if (next.has(section)) {
                next.delete(section);
            } else {
                next.add(section);
            }

            return next;
        });

    const reset = (section: EditionSection) =>
        sectionDiffers(edition, section)
            ? () =>
                  session.applySettings(resetSection(session.edition, section))
            : undefined;

    const own = issues.filter(
        (issue) => sectionOfKey(issue.elementKey) !== null,
    );
    const waiting = collect.box?.contributions.length ?? 0;
    const parts = partCount(edition);
    const words = changedWords(edition);

    const summaries: Record<EditionSection, ReactNode> = {
        general: `${m.languageName[edition.language]} · ${resolved.words.currencySymbol}`,
        look: m.themeName[edition.theme],
        words:
            words === 0
                ? t('edition_panel.standard')
                : t('edition_panel.words_changed', { count: words }),
        parts: t('edition_panel.parts_count', {
            on: parts.on,
            total: parts.total,
        }),
        board:
            edition.boardProfile.id === 'custom'
                ? t('edition.profile_custom')
                : t('edition.profile_standard'),
        together:
            waiting > 0
                ? t('editor.menu_new', { count: waiting })
                : collect.box === null
                  ? t('edition_panel.together_none')
                  : collect.box.status === 'closed'
                    ? t('edition_panel.together_closed')
                    : t('edition_panel.together_open'),
    };

    const props = (section: EditionSection) => ({
        section,
        summary: summaries[section],
        open: open.has(section),
        onToggle: () => toggle(section),
        onReset: reset(section),
    });

    return (
        <aside
            aria-label={t('editor.edition_row')}
            data-edition-panel
            className="flex min-h-0 flex-1 flex-col bg-table lg:bg-card"
        >
            <div className="hidden flex-none border-b border-line px-6 pt-6 pb-4 lg:block">
                <h2 className="m-0 truncate font-display text-2xl font-extrabold">
                    {edition.name}
                </h2>
                <p className="m-0 text-sm text-ink-soft">
                    {t('edition_panel.kind')}
                </p>
                <nav
                    aria-label={t('edition_panel.sections')}
                    className="mt-4 flex flex-wrap gap-x-2 gap-y-3"
                >
                    {EDITION_SECTIONS.map((section) => (
                        <button
                            key={section}
                            type="button"
                            onClick={() => show(section)}
                            className="group -my-1.5 inline-flex min-h-11 cursor-pointer items-center border-0 bg-transparent p-0 focus-visible:outline-none"
                        >
                            {/* A small chip in a button of 44 px high. */}
                            <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-ink bg-card px-3 text-sm font-semibold text-ink group-hover:bg-table group-focus-visible:outline-3 group-focus-visible:outline-offset-2 group-focus-visible:outline-ink">
                                {t(SECTION_LABEL[section])}
                                {section === 'together' && waiting > 0 && (
                                    <span
                                        aria-hidden="true"
                                        className="size-2 rounded-full bg-press"
                                    />
                                )}
                            </span>
                        </button>
                    ))}
                </nav>
            </div>

            <div
                ref={scroller}
                className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3 lg:gap-0 lg:px-6 lg:py-2"
            >
                {own.length > 0 && (
                    <ul className="m-0 flex list-none flex-col gap-2 p-0 lg:pt-4">
                        {own.map((issue) => (
                            <li key={issue.id}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const section = sectionOfKey(
                                            issue.elementKey,
                                        );
                                        if (section !== null) {
                                            show(section);
                                        }
                                    }}
                                    className="flex w-full cursor-pointer items-start gap-2 rounded-control border-0 bg-warning px-3 py-2 text-left text-sm text-ink"
                                >
                                    <WarningIcon
                                        size={18}
                                        className="mt-0.5 shrink-0"
                                    />
                                    <span>
                                        <strong>
                                            {issue.severityLabel[locale]}:
                                        </strong>{' '}
                                        {issue.message[locale]}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                <PanelSection {...props('general')}>
                    <GeneralFields
                        session={session}
                        edition={edition}
                        interfaceLanguage={interfaceLanguage}
                    />
                </PanelSection>

                <PanelSection {...props('look')}>
                    <LookFields
                        session={session}
                        edition={edition}
                        resolved={resolved}
                        interfaceLanguage={interfaceLanguage}
                    />
                </PanelSection>

                <PanelSection {...props('words')}>
                    <WordFields session={session} edition={edition} />
                </PanelSection>

                <PanelSection {...props('parts')}>
                    <PartFields
                        session={session}
                        edition={edition}
                        interfaceLanguage={interfaceLanguage}
                    />
                </PanelSection>

                <PanelSection {...props('board')}>
                    <div className="flex flex-col gap-3">
                        <BoardChoice
                            key={edition.id}
                            profile={edition.boardProfile}
                            interfaceLanguage={interfaceLanguage}
                            idPrefix="edition-panel"
                            onProfile={(profile) =>
                                session.applySettings(
                                    changeBoardProfile(
                                        session.edition,
                                        profile,
                                        interfaceLanguage,
                                    ),
                                )
                            }
                        />
                    </div>
                </PanelSection>

                <PanelSection {...props('together')}>
                    <TogetherSection
                        collect={collect}
                        edition={edition}
                        locale={interfaceLanguage}
                        onOpenElement={onOpenElement}
                    />
                </PanelSection>
            </div>
        </aside>
    );
}

interface FieldsProps {
    session: EditionSession;
    edition: Edition;
    resolved: ResolvedEdition;
    interfaceLanguage: Locale;
}

/** Algemeen: name, subtitle, language and the one currency field (B147). */
function GeneralFields({
    session,
    edition,
    interfaceLanguage,
}: Omit<FieldsProps, 'resolved'>) {
    const t = useTranslation();
    const id = useId();
    const m = messages[interfaceLanguage];
    const [nameDraft, setNameDraft] = useState<string | null>(null);
    const [note, setNote] = useState<string | null>(null);
    const [wantCustom, setWantCustom] = useState(false);
    const centre = edition.elements[BOARD_CENTER_KEY];
    const hidden = centre?.subtitle === '';
    const subtitle = hidden ? '' : (centre?.subtitle ?? '');
    const choice = currencyChoice(edition);
    const custom = choice === 'custom' || wantCustom;
    const standard = defaultWords(edition);
    const words = resolveWords(edition);

    const setSubtitle = (value: string | undefined): void =>
        editElement(
            session,
            BOARD_CENTER_KEY,
            { subtitle: value },
            `subtitle:${BOARD_CENTER_KEY}`,
        );

    return (
        <>
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
                    <label className="flex min-h-12 flex-none items-center gap-2 text-sm font-semibold">
                        <input
                            type="checkbox"
                            className="size-5 accent-ink"
                            checked={!hidden}
                            onChange={(event) =>
                                setSubtitle(
                                    event.target.checked ? undefined : '',
                                )
                            }
                        />
                        {t('edition_panel.subtitle_show')}
                    </label>
                </div>
            </div>

            <div className="grid items-end gap-4 min-[480px]:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
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
                            setNote(change.summary);
                        }}
                    >
                        <option value="nl">{m.languageName.nl}</option>
                        <option value="en" lang="en">
                            {m.languageName.en}
                        </option>
                    </Select>
                </div>
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
                                setWantCustom(true);

                                return;
                            }
                            setWantCustom(false);
                            session.applySettings(
                                chooseCurrency(
                                    session.edition,
                                    value as CurrencyId,
                                ),
                            );
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
            </div>
            {note !== null && (
                <p role="status" className="m-0 -mt-2 text-sm text-ink-soft">
                    {note}
                </p>
            )}

            {custom && (
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
                </div>
            )}
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
}

/** Uiterlijk: the theme as three tiles, the accent and the colour per street group (B130, B145). */
function LookFields({
    session,
    edition,
    resolved,
    interfaceLanguage,
}: FieldsProps) {
    const t = useTranslation();
    const m = messages[interfaceLanguage];
    const theme = THEMES[edition.theme];
    const accent = resolved.accent;
    const [editing, setEditing] = useState<string | null>(null);
    const group = resolved.groups.find((candidate) => candidate.id === editing);

    return (
        <>
            <div
                role="radiogroup"
                aria-label={t('edition.theme')}
                className="grid grid-cols-3 gap-2"
            >
                {THEME_IDS.map((id) => (
                    <label
                        key={id}
                        className={cn(
                            'flex cursor-pointer flex-col gap-1 rounded-control border-2 bg-paper p-1 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2',
                            edition.theme === id
                                ? 'border-press shadow-[inset_0_0_0_1px_var(--color-press)]'
                                : 'border-ink',
                        )}
                    >
                        <input
                            type="radio"
                            name="edition-panel-theme"
                            className="sr-only"
                            checked={edition.theme === id}
                            onChange={() =>
                                session.applySettings(
                                    changeTheme(
                                        session.edition,
                                        id,
                                        interfaceLanguage,
                                    ),
                                )
                            }
                        />
                        <ThemeThumb
                            theme={id}
                            name={edition.name}
                            locale={edition.language}
                            currency={edition.currency}
                            compact
                        />
                        <span className="px-1 pb-0.5 text-sm font-semibold">
                            {m.themeName[id]}
                        </span>
                    </label>
                ))}
            </div>

            <div className="flex flex-col gap-2">
                <FieldHead
                    label={t('editor.style_accent')}
                    where={t('edition_panel.accent_where')}
                    standard={
                        accent === undefined ? undefined : (
                            <StandardButton
                                onClick={() =>
                                    editElement(session, THEME_ACCENT_KEY, {
                                        color: undefined,
                                    })
                                }
                            />
                        )
                    }
                />
                <button
                    type="button"
                    data-field="theme_accent.accent"
                    aria-expanded={editing === 'accent'}
                    onClick={() =>
                        setEditing((now) =>
                            now === 'accent' ? null : 'accent',
                        )
                    }
                    className="flex min-h-12 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 rounded-control border-2 border-ink bg-card px-3 py-2 text-left text-sm"
                >
                    {accent !== undefined ? (
                        <>
                            <Swatch color={accent} className="size-7" />
                            <span className="font-mono">
                                {accent.toUpperCase()}
                            </span>
                        </>
                    ) : theme.secondaryAccent === theme.accent ? (
                        <>
                            <Swatch color={theme.accent} className="size-7" />
                            <span className="font-mono">
                                {theme.accent.toUpperCase()}
                            </span>
                        </>
                    ) : (
                        // What the board really shows (bug 5): the arrows and the lid title can differ per theme.
                        <>
                            <span className="flex items-center gap-2">
                                <Swatch
                                    color={theme.secondaryAccent}
                                    className="size-7"
                                />
                                {t('edition_panel.accent_arrows')}
                            </span>
                            <span className="flex items-center gap-2">
                                <Swatch
                                    color={theme.accent}
                                    className="size-7"
                                />
                                {t('edition_panel.accent_lid')}
                            </span>
                        </>
                    )}
                    {accent === undefined && (
                        <span className="ml-auto font-mono text-xs text-ink-soft">
                            {t('edition_panel.accent_theme')}
                        </span>
                    )}
                </button>
                {editing === 'accent' && (
                    <ColorField
                        id="edition-accent"
                        label={t('editor.style_accent')}
                        value={accent ?? theme.secondaryAccent}
                        custom={accent !== undefined}
                        edition={edition}
                        hideReset
                        onChange={(hex) =>
                            editElement(
                                session,
                                THEME_ACCENT_KEY,
                                { color: hex },
                                `color:${THEME_ACCENT_KEY}`,
                            )
                        }
                    />
                )}
            </div>

            <div className="flex flex-col gap-2">
                <FieldHead
                    label={t('editor.style_groups')}
                    where={t('edition_panel.groups_where')}
                />
                <div className="grid grid-cols-4 gap-1.5 min-[480px]:grid-cols-8">
                    {resolved.groups.map((item) => {
                        const own =
                            edition.elements[groupKey(item.id)]?.color !==
                            undefined;

                        return (
                            <button
                                key={item.id}
                                type="button"
                                data-field={`theme_accent.${item.id}`}
                                aria-label={t('edition_panel.group_color', {
                                    group: item.name,
                                })}
                                aria-pressed={editing === item.id}
                                title={`${item.name} ${item.color.toUpperCase()}`}
                                onClick={() =>
                                    setEditing((now) =>
                                        now === item.id ? null : item.id,
                                    )
                                }
                                className={cn(
                                    'relative h-11 w-full cursor-pointer rounded-control border-2 p-0 lg:aspect-[4/3] lg:h-auto lg:min-h-9',
                                    editing === item.id
                                        ? 'border-ink outline-3 outline-offset-1 outline-ink'
                                        : 'border-ink/60',
                                )}
                                style={{ background: item.color }}
                            >
                                {own && (
                                    <span
                                        aria-hidden="true"
                                        className="absolute right-1 bottom-1 size-2 rounded-full border border-card bg-ink"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
                {group !== undefined && (
                    <div className="flex flex-col gap-2 rounded-control bg-paper p-3">
                        <FieldHead
                            label={t('edition_panel.group_color', {
                                group: group.name,
                            })}
                            where={group.color.toUpperCase()}
                            standard={
                                edition.elements[groupKey(group.id)]?.color ===
                                undefined ? undefined : (
                                    <StandardButton
                                        onClick={() =>
                                            editElement(
                                                session,
                                                groupKey(group.id),
                                                { color: undefined },
                                            )
                                        }
                                    />
                                )
                            }
                        />
                        <ColorField
                            id={`edition-group-${group.id}`}
                            label={group.name}
                            value={group.color}
                            custom={
                                edition.elements[groupKey(group.id)]?.color !==
                                undefined
                            }
                            edition={edition}
                            hideReset
                            onChange={(hex) =>
                                editElement(
                                    session,
                                    groupKey(group.id),
                                    { color: hex },
                                    `color:${group.id}`,
                                )
                            }
                        />
                    </div>
                )}
                <p className="m-0 text-xs text-ink-soft">
                    {t('editor.style_groups_hint')}
                </p>
            </div>
        </>
    );
}

/** Woorden: houses, hotels, the jail in a sentence, the two decks and the bank (B126, B148). */
function WordFields({
    session,
    edition,
}: {
    session: EditionSession;
    edition: Edition;
}) {
    const t = useTranslation();
    const standard = defaultWords(edition);
    const words = resolveWords(edition);
    const field = (
        key: string,
        name: 'name' | 'text',
        label: string,
        placeholder: string,
        extra: { where?: string; maxLength?: number; className?: string } = {},
    ) => (
        <WordInput
            session={session}
            edition={edition}
            elementKey={key}
            field={name}
            label={label}
            placeholder={placeholder}
            {...extra}
        />
    );
    const street = standardEdition.spaces.find(
        (space) => space.type === 'street',
    );
    const buildings =
        street?.type === 'street'
            ? deedContent(street, edition.language, edition.currency, words)
            : undefined;

    return (
        <>
            <p className="m-0 text-sm text-ink-soft">
                {t('edition_panel.words_hint')}
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                {field(
                    wordKey('house'),
                    'name',
                    t('words.house'),
                    standard.house.singular,
                )}
                {field(
                    wordKey('house'),
                    'text',
                    t('words.houses'),
                    standard.house.plural,
                )}
                {field(
                    wordKey('hotel'),
                    'name',
                    t('words.hotel'),
                    standard.hotel.singular,
                )}
                {field(
                    wordKey('hotel'),
                    'text',
                    t('words.hotels'),
                    standard.hotel.plural,
                )}
            </div>
            {buildings !== undefined && (
                <p className="m-0 -mt-2 rounded-control bg-paper px-3 py-2 text-sm text-ink-soft">
                    {t('words.preview_buildings', {
                        text: `${buildings.rows[3]?.label ?? ''}, ${buildings.rows[6]?.label ?? ''}`,
                    })}
                </p>
            )}
            {field(
                wordKey('jail'),
                'name',
                t('words.jail_word'),
                standard.jail,
            )}
            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                {field(
                    wordKey('chance'),
                    'name',
                    t('words.deck_chance'),
                    standard.decks.chance,
                )}
                {field(
                    wordKey('chest'),
                    'name',
                    t('words.deck_chest'),
                    standard.decks.chest,
                )}
            </div>
            {field(
                BANK_KEY,
                'name',
                t('edition_panel.bank'),
                bankPlaceholder(edition.language),
                {
                    where: t('edition_panel.bank_where'),
                    maxLength: MAX_NAME_LENGTH,
                },
            )}
        </>
    );
}

/** Onderdelen in two groups: the game and the extra print (B99, B123). */
function PartFields({
    session,
    edition,
    interfaceLanguage,
}: {
    session: EditionSession;
    edition: Edition;
    interfaceLanguage: Locale;
}) {
    const t = useTranslation();
    const m = messages[interfaceLanguage];
    const [note, setNote] = useState<string | null>(null);
    const group = (legend: string, parts: readonly PartId[]) => (
        <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
            <legend className="mb-1 p-0 text-sm font-semibold">{legend}</legend>
            {parts.map((part) => (
                <label
                    key={part}
                    className="grid min-h-11 grid-cols-[auto_1fr] items-start gap-x-3 py-1"
                >
                    <input
                        type="checkbox"
                        checked={edition.parts[part]}
                        onChange={(event) => {
                            const change = setPart(
                                session.edition,
                                part,
                                event.target.checked,
                                interfaceLanguage,
                            );
                            session.applySettings(change);
                            setNote(change.summary);
                        }}
                        className="row-span-2 mt-0.5 size-5 shrink-0 accent-press"
                    />
                    <strong className="text-base">{m.partName[part]}</strong>
                    <span className="col-start-2 text-sm text-ink-soft">
                        {t(`edition.part_note.${part}`)}
                    </span>
                </label>
            ))}
        </fieldset>
    );

    return (
        <>
            {group(t('edition_panel.parts_game'), GAME_PARTS)}
            {group(t('edition_panel.parts_extra'), EXTRA_PARTS)}
            {note !== null && (
                <p role="status" className="m-0 text-sm text-ink-soft">
                    {note}
                </p>
            )}
        </>
    );
}
