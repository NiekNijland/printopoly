import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

import { WarningIcon } from '@/components/icons';
import { tabsListVariants, tabsTriggerVariants } from '@/components/ui/tabs';
import type { CollectionBox } from '@/features/edition/boxes/use-collection-box';
import { BoardChoice } from '@/features/edition/editions/edition-choices';
import { GeneralFields } from '@/features/edition/editor/general-fields';
import { LookFields } from '@/features/edition/editor/look-fields';
import type { FriendsProps } from '@/features/edition/editor/panel/friends-section';
import {
    PanelSection,
    SECTION_LABEL,
} from '@/features/edition/editor/panel-section';
import { TogetherSection } from '@/features/edition/editor/together-section';
import { useSectionScroll } from '@/features/edition/editor/use-section-scroll';
import { WordFields } from '@/features/edition/editor/word-fields';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import type { CheckIssue } from '@/lib/render/checks-types';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import { changeBoardProfile } from '@/lib/render/edition-settings';
import { messages } from '@/lib/render/edition-strings';
import type { Edition } from '@/lib/render/edition-types';
import {
    changedWords,
    resetSection,
    sectionDiffers,
    sectionOfKey,
    type EditionSection,
} from '@/lib/render/editor-edition-panel';
import { cn } from '@/lib/utils';
import type { Locale } from '@/types/game';

/** A request from outside (name menu, Controle, a key) to show one section; `n` makes the same section count again. */
export type SectionRequest = {
    section: EditionSection;
    n: number;
};

type EditionPanelProps = {
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
};

const sectionSummaries = (
    edition: Edition,
    resolved: ResolvedEdition,
    interfaceLanguage: Locale,
    collect: CollectionBox,
    t: ReturnType<typeof useTranslation>,
): Record<EditionSection, ReactNode> => {
    const m = messages[interfaceLanguage];
    const waiting = collect.box?.contributions.length ?? 0;
    const words = changedWords(edition);

    return {
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
};

const SectionJumps = ({
    sections,
    current,
    waiting,
    onShow,
}: {
    sections: readonly EditionSection[];
    current: EditionSection;
    waiting: number;
    onShow: (section: EditionSection) => void;
}) => {
    const t = useTranslation();

    return (
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
                    aria-current={current === section ? 'location' : undefined}
                    data-state={current === section ? 'active' : 'inactive'}
                    onClick={() => onShow(section)}
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
    );
};

const PanelIssues = ({
    issues,
    onShow,
}: {
    issues: readonly CheckIssue[];
    onShow: (section: EditionSection) => void;
}) => {
    const { locale } = usePage().props;
    const own = issues.filter(
        (issue) => sectionOfKey(issue.elementKey) !== null,
    );
    if (own.length === 0) {
        return null;
    }

    return (
        <ul className="m-0 flex list-none flex-col gap-2 p-0 md:pt-4">
            {own.map((issue) => (
                <li key={issue.id}>
                    <button
                        type="button"
                        onClick={() => {
                            const section = sectionOfKey(issue.elementKey);
                            if (section !== null) {
                                onShow(section);
                            }
                        }}
                        className="flex w-full cursor-pointer items-start gap-2 rounded-control border-0 bg-warning px-3 py-2 text-left text-sm text-ink"
                    >
                        <WarningIcon size={18} className="mt-0.5 shrink-0" />
                        <span>
                            <strong>{issue.severityLabel[locale]}:</strong>{' '}
                            {issue.message[locale]}
                        </span>
                    </button>
                </li>
            ))}
        </ul>
    );
};

const PanelHead = ({
    name,
    sections,
    current,
    waiting,
    onShow,
}: {
    name: string;
    sections: readonly EditionSection[];
    current: EditionSection;
    waiting: number;
    onShow: (section: EditionSection) => void;
}) => {
    const t = useTranslation();

    return (
        <div className="hidden flex-none border-b border-line px-6 pt-6 pb-4 md:block">
            <h2 className="m-0 truncate font-display text-2xl font-extrabold">
                {name}
            </h2>
            <p className="m-0 text-sm text-ink-soft">
                {t('edition_panel.kind')}
            </p>
            {/* The sections as one bar in the look of the tabs Bord, Kaarten, Geld, Doos: it moves the view, it
                chooses nothing (R6 Tom: one look for tabs, one for a choice; B262). The section in sight is
                inked. */}
            <SectionJumps
                sections={sections}
                current={current}
                waiting={waiting}
                onShow={onShow}
            />
        </div>
    );
};

const BoardSection = ({
    session,
    edition,
    interfaceLanguage,
}: {
    session: EditionSession;
    edition: Edition;
    interfaceLanguage: Locale;
}) => (
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
);

const sectionPropsOf =
    (
        session: EditionSession,
        edition: Edition,
        summaries: Record<EditionSection, ReactNode>,
        open: ReadonlySet<EditionSection>,
        toggle: (section: EditionSection) => void,
    ) =>
    (section: EditionSection) => ({
        section,
        summary: summaries[section],
        open: open.has(section),
        onToggle: () => toggle(section),
        onReset: sectionDiffers(edition, section)
            ? () =>
                  session.applySettings(resetSection(session.edition, section))
            : undefined,
    });

/**
 * The edition as one element (B145): everything that holds for the whole edition, in fixed sections with jump
 * links on top. It takes the place of the settings and words dialogs and the Stijl tab. The board stays in sight
 * in the middle, so a theme or a colour shows at once. On a phone the sections fold, the first one open.
 */
export const EditionPanel = ({
    session,
    edition,
    resolved,
    interfaceLanguage,
    issues,
    collect,
    friends,
    onOpenElement,
    request,
}: EditionPanelProps) => {
    const t = useTranslation();
    const { sections, open, scroller, current, follow, show, toggle } =
        useSectionScroll(collect.box !== null, request);

    const props = sectionPropsOf(
        session,
        edition,
        sectionSummaries(edition, resolved, interfaceLanguage, collect, t),
        open,
        toggle,
    );

    return (
        <aside
            aria-label={t('editor.edition_row')}
            data-edition-panel
            className="flex min-h-0 flex-1 flex-col bg-table md:bg-card"
        >
            <PanelHead
                name={edition.name}
                sections={sections}
                current={current}
                waiting={collect.box?.contributions.length ?? 0}
                onShow={show}
            />

            <div
                ref={scroller}
                onScroll={follow}
                className="flex min-h-0 flex-1 scroll-pt-3 flex-col gap-3 overflow-auto p-3 md:gap-0 md:px-6 md:py-2"
            >
                <PanelIssues issues={issues} onShow={show} />

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
                    <BoardSection
                        session={session}
                        edition={edition}
                        interfaceLanguage={interfaceLanguage}
                    />
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
};
