import { usePage } from '@inertiajs/react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { WarningIcon } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select } from '@/components/ui/select';
import { tabsListVariants, tabsTriggerVariants } from '@/components/ui/tabs';
import type { CollectionBox } from '@/features/edition/boxes/use-collection-box';
import {
    BoardChoice,
    ThemeThumb,
} from '@/features/edition/editions/edition-choices';
import { editElement } from '@/features/edition/editor/edit';
import type { FriendsProps } from '@/features/edition/editor/panel/friends-section';
import { PartStyleField } from '@/features/edition/editor/part-style-field';
import { ColorField } from '@/features/edition/editor/style-controls';
import { TogetherSection } from '@/features/edition/editor/together-section';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import type { CheckIssue } from '@/lib/render/checks-types';
import { deedContent } from '@/lib/render/deed-rows';
import {
    BOARD_CENTER_KEY,
    BANK_KEY,
    groupKey,
    wordKey,
} from '@/lib/render/edition-keys';
import { partsWithStyles } from '@/lib/render/edition-part-styles';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import { MAX_NAME_LENGTH } from '@/lib/render/edition-schema-limits';
import {
    changeBoardProfile,
    changeLanguage,
    changeTheme,
    rename,
} from '@/lib/render/edition-settings';
import { messages } from '@/lib/render/edition-strings';
import {
    THEME_IDS,
    type Edition,
    type ElementOverride,
} from '@/lib/render/edition-types';
import {
    MAX_SYMBOL_LENGTH,
    MAX_WORD_LENGTH,
    defaultWords,
    resolveWords,
} from '@/lib/render/edition-words';
import {
    CURRENCY_CHOICES,
    EDITION_SECTIONS,
    changedWords,
    chooseCurrency,
    currencyChoice,
    resetSection,
    sectionDiffers,
    sectionOfKey,
    type EditionSection,
} from '@/lib/render/editor-edition-panel';
import { formatMoney, standardEdition } from '@/lib/render/standard-edition';
import { STRINGS } from '@/lib/render/strings';
import { cn } from '@/lib/utils';
import type { CurrencyId, Locale } from '@/types/game';

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
    /** What friends sent, with the decision: the overview in Samen maken applies right there (B175). */
    friends?: FriendsProps;
    /** Opens an element of the editor, for a contribution of a friend. */
    onOpenElement: (key: string) => void;
    request: SectionRequest | null;
}

const SECTION_LABEL: Record<EditionSection, string> = {
    general: 'edition_panel.section_general',
    look: 'edition_panel.section_look',
    words: 'edition_panel.section_words',
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
        // The same link-like action as in the field panel (B262).
        <Button
            variant="link"
            onClick={onClick}
            aria-label={label}
            className="-my-1.5 shrink-0 gap-1 text-sm"
        >
            <span aria-hidden="true">↺</span>
            {t('edition_panel.standard')}
        </Button>
    );
}

/**
 * A label with, on the right, where the field shows up or its "Standaard". In a narrow column the "Standaard"
 * moves under the label instead of out of the panel (round 4, bug 5).
 */
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
        <div
            data-field-head
            className="flex min-h-8 min-w-0 flex-wrap items-center justify-between gap-x-2"
        >
            {htmlFor === undefined ? (
                <span className="min-w-0 text-sm font-semibold break-words">
                    {label}
                </span>
            ) : (
                <label
                    htmlFor={htmlFor}
                    className="min-w-0 text-sm font-semibold break-words"
                >
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
                // The fields of a row line up, also when one label carries its "Standaard" underneath.
                className="mt-auto"
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

/**
 * A section of the edition panel on shadcn's Collapsible: a heading on a wide screen, where it is always open, and
 * a block that folds on a phone, with what is chosen in its head (§3.6).
 */
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
        <Collapsible asChild open={open} onOpenChange={onToggle}>
            <section
                id={sectionId(section)}
                aria-label={title}
                data-section={section}
                className="scroll-mt-3 rounded-control border-2 border-ink bg-card md:rounded-none md:border-0 md:border-t md:border-line md:bg-transparent md:py-6 md:first-of-type:border-t-0 md:first-of-type:pt-2"
            >
                <h3 className="m-0">
                    <CollapsibleTrigger
                        aria-controls={body}
                        className="flex min-h-12 w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-4 text-left md:hidden"
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
                    </CollapsibleTrigger>
                    <span className="hidden font-display text-xl font-extrabold md:block">
                        {title}
                    </span>
                </h3>
                {/* Always in the page: on a wide screen every section shows, whatever the phone left folded. */}
                <CollapsibleContent
                    id={body}
                    forceMount
                    className={cn(
                        'flex-col gap-5 px-4 pb-4 md:mt-4 md:flex md:px-0 md:pb-0',
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
                </CollapsibleContent>
            </section>
        </Collapsible>
    );
}

/** What a note says without a bank name: "Speelgeld" (B85). */
function bankPlaceholder(language: Locale): string {
    const word = STRINGS[language].playMoney;

    return word.charAt(0).toUpperCase() + word.slice(1);
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
    friends,
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
    // Samen maken is frozen (B202): its section stays for an edition that has a box, so the friends' work can still
    // come in, and a new edition never sees it (R5-16).
    const sections = EDITION_SECTIONS.filter(
        (section) => section !== 'together' || collect.box !== null,
    );
    // A chosen jump link stays lit while the panel scrolls to it, also when the section is too short to reach the
    // top, until the person scrolls by hand (Lukas: "Board size" lit "Make it together").
    const chosen = useRef(false);
    // The person scrolls by hand: the panel follows the scroll again.
    useEffect(() => {
        const box = scroller.current;
        if (box === null) {
            return;
        }
        const release = (): void => {
            chosen.current = false;
        };
        const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
        events.forEach((name) =>
            box.addEventListener(name, release, { passive: true }),
        );

        return () =>
            events.forEach((name) => box.removeEventListener(name, release));
    }, []);
    // The section in sight, so its jump link shows where you are (vindbaarheid point 4).
    const [current, setCurrent] = useState<EditionSection>('general');
    const follow = (): void => {
        const box = scroller.current;
        if (box === null) {
            return;
        }
        const top = box.getBoundingClientRect().top + 24;
        if (chosen.current) {
            return;
        }
        const atEnd = box.scrollTop + box.clientHeight >= box.scrollHeight - 2;
        let seen: EditionSection = 'general';
        for (const section of sections) {
            const node = document.getElementById(sectionId(section));
            if (node !== null && node.getBoundingClientRect().top <= top) {
                seen = section;
            }
        }
        // The last sections are short: at the bottom of the panel the last one counts.
        setCurrent(
            atEnd && box.scrollTop > 0 ? (sections.at(-1) ?? seen) : seen,
        );
    };

    const show = (section: EditionSection): void => {
        setOpen((now) => new Set(now).add(section));
        setCurrent(section);
        chosen.current = true;
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
    const words = changedWords(edition);

    const summaries: Record<EditionSection, ReactNode> = {
        general: `${m.languageName[edition.language]} · ${resolved.words.currencySymbol}`,
        look: m.themeName[edition.theme],
        words:
            words === 0
                ? t('edition_panel.standard')
                : t('edition_panel.words_changed', { count: words }),
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
            className="flex min-h-0 flex-1 flex-col bg-table md:bg-card"
        >
            <div className="hidden flex-none border-b border-line px-6 pt-6 pb-4 md:block">
                <h2 className="m-0 truncate font-display text-2xl font-extrabold">
                    {edition.name}
                </h2>
                <p className="m-0 text-sm text-ink-soft">
                    {t('edition_panel.kind')}
                </p>
                {/* The sections as one bar in the look of the tabs Bord, Kaarten, Geld, Doos: it moves the view, it
                    chooses nothing (R6 Tom: one look for tabs, one for a choice; B262). The section in sight is
                    inked. */}
                <nav
                    aria-label={t('edition_panel.sections')}
                    className={cn(
                        tabsListVariants({ variant: 'segmented' }),
                        'mt-4 w-full',
                    )}
                >
                    {sections.map((section) => (
                        <button
                            key={section}
                            type="button"
                            aria-current={
                                current === section ? 'location' : undefined
                            }
                            data-state={
                                current === section ? 'active' : 'inactive'
                            }
                            onClick={() => show(section)}
                            className={cn(
                                tabsTriggerVariants({ variant: 'segmented' }),
                                'inline-flex h-auto min-h-11 min-w-0 items-center justify-center gap-1 border-l-2 border-ink px-1 py-1 leading-tight first:border-l-0 min-[360px]:px-1 min-[360px]:text-sm',
                            )}
                        >
                            <span className="min-w-0 text-balance">
                                {t(SECTION_LABEL[section])}
                            </span>
                            {section === 'together' && waiting > 0 && (
                                <span
                                    aria-hidden="true"
                                    className="size-2 flex-none rounded-full bg-press"
                                />
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            <div
                ref={scroller}
                onScroll={follow}
                className="flex min-h-0 flex-1 scroll-pt-3 flex-col gap-3 overflow-auto p-3 md:gap-0 md:px-6 md:py-2"
            >
                {own.length > 0 && (
                    <ul className="m-0 flex list-none flex-col gap-2 p-0 md:pt-4">
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

                {sections.includes('together') && (
                    <PanelSection {...props('together')}>
                        <TogetherSection
                            collect={collect}
                            friends={friends}
                            edition={edition}
                            locale={interfaceLanguage}
                            onOpenElement={onOpenElement}
                        />
                    </PanelSection>
                )}
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

/** Uiterlijk: the theme as four tiles in two rows and the colour per street group (B130, B145); the theme sets the accents (B203). */
function LookFields({
    session,
    edition,
    resolved,
    interfaceLanguage,
}: FieldsProps) {
    const t = useTranslation();
    const m = messages[interfaceLanguage];
    const [editing, setEditing] = useState<string | null>(null);
    const group = resolved.groups.find((candidate) => candidate.id === editing);

    return (
        <>
            <RadioGroup
                aria-label={t('edition.theme')}
                value={edition.theme}
                onValueChange={(value) => {
                    const id = THEME_IDS.find((theme) => theme === value);
                    if (id !== undefined) {
                        session.applySettings(
                            changeTheme(session.edition, id, interfaceLanguage),
                        );
                    }
                }}
                className="grid grid-cols-2 gap-2"
            >
                {THEME_IDS.map((id) => (
                    <label
                        key={id}
                        className={cn(
                            'relative flex cursor-pointer flex-col gap-1 rounded-control border-2 bg-paper p-1 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink',
                            edition.theme === id
                                ? 'border-press shadow-[inset_0_0_0_1px_var(--color-press)]'
                                : 'border-ink',
                        )}
                    >
                        <ThemeThumb
                            theme={id}
                            name={edition.name}
                            locale={edition.language}
                            currency={edition.currency}
                            compact
                        />
                        <span className="flex items-center gap-1.5 px-1 pb-0.5 text-sm font-semibold">
                            {/* The round of the radio button says the same as the red frame, for who reads it. */}
                            <RadioGroupItem
                                value={id}
                                aria-label={m.themeName[id]}
                                className="size-4 focus-visible:outline-none"
                            />
                            {m.themeName[id]}
                        </span>
                    </label>
                ))}
            </RadioGroup>

            {/* Every part follows the theme, or takes a style of its own (B268). */}
            {partsWithStyles().length > 0 && (
                <div className="flex flex-col gap-3" data-field="part-styles">
                    <p className="m-0 text-xs text-ink-soft">
                        {t('part_style.hint')}
                    </p>
                    {partsWithStyles().map((part) => (
                        <PartStyleField
                            key={part}
                            session={session}
                            edition={edition}
                            resolved={resolved}
                            part={part}
                            interfaceLanguage={interfaceLanguage}
                        />
                    ))}
                </div>
            )}

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
    const station = standardEdition.spaces.find(
        (space) => space.type === 'station',
    );
    const utility = standardEdition.spaces.find(
        (space) => space.type === 'utility',
    );
    const transport =
        station?.type === 'station' && utility?.type === 'utility'
            ? {
                  station: deedContent(
                      station,
                      edition.language,
                      edition.currency,
                      words,
                  ).rows[1]?.label,
                  utility: words.utility.singular,
              }
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
            {/* Stations and utilities: the deeds and the cards that send you there use these (UX 4). */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                {field(
                    wordKey('station'),
                    'name',
                    t('words.station'),
                    standard.station.singular,
                )}
                {field(
                    wordKey('station'),
                    'text',
                    t('words.stations'),
                    standard.station.plural,
                )}
                {field(
                    wordKey('utility'),
                    'name',
                    t('words.utility'),
                    standard.utility.singular,
                )}
                {field(
                    wordKey('utility'),
                    'text',
                    t('words.utilities'),
                    standard.utility.plural,
                )}
            </div>
            {transport !== undefined && (
                <p className="m-0 -mt-2 rounded-control bg-paper px-3 py-2 text-sm text-ink-soft">
                    {t('words.preview_transport', {
                        station: transport.station ?? '',
                        utility: transport.utility,
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
