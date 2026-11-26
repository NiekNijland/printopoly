import { Prose } from '@/components/prose';
import {
    SectionArt,
    type SectionArtName,
} from '@/components/render/table-page-art';
import {
    PageHero,
    TONE_CLASS,
    type Tone,
} from '@/components/render/table-page-hero';
import { Seo } from '@/components/seo';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import type { ContentBlockData, ContentPageData } from '@/types/generated';

interface PrintGuideProps {
    document: ContentPageData;
}

/**
 * Which still life belongs to which section. The parts come from the texts per part (B205) and have the id
 * `part-{part}`; the other sections are the slugs of the "##" headings in printgids.md.
 */
const ART: Record<string, SectionArtName> = {
    'part-calibration': 'proof',
    'part-board': 'board',
    'part-cards': 'cards',
    'part-money': 'money',
    'part-tokens': 'pawns',
    'part-box_lid': 'lid',
    'part-invitation': 'share',
    'als-er-iets-misgaat': 'trouble',
    'if-something-goes-wrong': 'trouble',
};

const TONES: Tone[] = ['board', 'chance', 'chest'];

const Column = ({ block }: { block: ContentBlockData }) => {
    return (
        <div className="flex flex-col gap-2">
            <h3 className="m-0 text-lg font-semibold">{block.title}</h3>
            <Prose html={block.html} />
            {block.spec !== null && (
                <p className="m-0 font-mono text-xs text-ink-soft">
                    {block.spec}
                </p>
            )}
        </div>
    );
};

const Steps = ({ block }: { block: ContentBlockData }) => {
    return (
        <div className="flex flex-col gap-2">
            <h3 className="m-0 text-lg font-semibold">{block.title}</h3>
            <ol className="m-0 flex list-none flex-col gap-2 p-0">
                {block.steps.map((step, index) => (
                    <li key={step} className="flex gap-3">
                        <span
                            aria-hidden="true"
                            className="font-bold flex size-7 flex-none items-center justify-center rounded-full border-2 border-ink bg-card font-mono text-sm"
                        >
                            {index + 1}
                        </span>
                        <span className="pt-0.5">
                            <span className="sr-only">{index + 1}. </span>
                            <span dangerouslySetInnerHTML={{ __html: step }} />
                        </span>
                    </li>
                ))}
            </ol>
            <Prose html={block.html} />
        </div>
    );
};

/**
 * The print guide (B67), one section per part, as in docs/design/Printgids.dc.html: a list of
 * the parts beside the text, which folds above the text on a phone. It is the one place that
 * explains printing (B205): the parts come from the same texts as the instructions in the ZIP,
 * and each set is a column (print shop and home).
 */
const PrintGuide = ({ document }: PrintGuideProps) => {
    const t = useTranslation();

    return (
        <>
            <Seo title={document.seoTitle} description={document.description} />

            <PageHero tone="board" art="printgids" title={document.title}>
                <Prose html={document.introHtml} className="text-lg" />
            </PageHero>

            <div className="mx-auto flex max-w-content flex-wrap gap-x-16 gap-y-8 px-4 py-8 md:px-8 md:py-16">
                <nav
                    aria-label={t('printguide.contents')}
                    className="flex min-w-0 flex-[1_1_220px] flex-col self-start md:sticky md:top-8"
                >
                    <p className="m-0 mb-2 font-semibold">
                        {t('printguide.contents')}
                    </p>
                    {document.sections.map((section) => (
                        <a
                            key={section.id}
                            href={`#${section.id}`}
                            className="flex min-h-11 items-center underline underline-offset-4 hover:text-press"
                        >
                            {section.title}
                        </a>
                    ))}
                </nav>

                <div className="flex max-w-180 min-w-0 flex-[999_1_320px] flex-col gap-12 md:gap-16">
                    {document.sections.map((section, index) => {
                        const art = ART[section.id];

                        return (
                            <section
                                key={section.id}
                                id={section.id}
                                className="flex scroll-mt-8 flex-col gap-4"
                            >
                                {art !== undefined && (
                                    <div
                                        className={cn(
                                            'overflow-hidden rounded-control border-2 border-ink',
                                            TONE_CLASS[
                                                TONES[index % TONES.length] ??
                                                    'board'
                                            ],
                                        )}
                                    >
                                        <SectionArt name={art} />
                                    </div>
                                )}
                                <h2 className="m-0 font-display text-2xl font-extrabold">
                                    {section.title}
                                </h2>
                                <Prose html={section.html} />
                                {section.blocks.length > 0 && (
                                    // One column per set, side by side when there is room (B109).
                                    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-6">
                                        {section.blocks.map((block) =>
                                            block.steps.length > 0 ? (
                                                <Steps
                                                    key={block.title}
                                                    block={block}
                                                />
                                            ) : (
                                                <Column
                                                    key={block.title}
                                                    block={block}
                                                />
                                            ),
                                        )}
                                    </div>
                                )}
                            </section>
                        );
                    })}
                </div>
            </div>
        </>
    );
};
export default PrintGuide;
