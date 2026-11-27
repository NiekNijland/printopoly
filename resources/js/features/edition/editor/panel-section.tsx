import type { ReactNode } from 'react';

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useTranslation } from '@/hooks/use-translation';
import type { EditionSection } from '@/lib/render/editor-edition-panel';
import { cn } from '@/lib/utils';

export const SECTION_LABEL: Record<EditionSection, string> = {
    general: 'edition_panel.section_general',
    look: 'edition_panel.section_look',
    words: 'edition_panel.section_words',
    board: 'edition_panel.section_board',
    together: 'edition_panel.section_together',
};

export const sectionId = (section: EditionSection) => `edition-${section}`;

type SectionProps = {
    section: EditionSection;
    /** What is chosen, for the folded section on a phone ("Klassiek", "5 van 10"). */
    summary?: ReactNode;
    open: boolean;
    onToggle: () => void;
    /** "Alles in deze sectie terug naar standaard", only when the section differs. */
    onReset?: () => void;
    children: ReactNode;
};

/**
 * A section of the edition panel on shadcn's Collapsible: a heading on a wide screen, where it is always open, and
 * a block that folds on a phone, with what is chosen in its head (§3.6).
 */
export const PanelSection = ({
    section,
    summary,
    open,
    onToggle,
    onReset,
    children,
}: SectionProps) => {
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
};
