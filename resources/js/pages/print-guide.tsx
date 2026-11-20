import { Prose } from '@/components/prose';
import { Seo } from '@/components/seo';
import { SectionArt, type SectionArtName } from '@/components/table/page-art';
import { PageHero, TONE_CLASS, type Tone } from '@/components/table/page-hero';
import { StickStep } from '@/components/table/stick-step';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import type { ContentBlockData, ContentPageData } from '@/types/generated';

interface PrintGuideProps {
    document: ContentPageData;
}

/** Which still life belongs to which part: the ids are the slugs of the "##" headings in printgids.md. */
const ART: Record<string, SectionArtName> = {
    'eerst-het-proefvel': 'proof',
    'start-with-the-proof-sheet': 'proof',
    bord: 'board',
    board: 'board',
    'kaarten-en-eigendomsbewijzen': 'cards',
    'cards-and-deeds': 'cards',
    speelgeld: 'money',
    'play-money': 'money',
    pionnen: 'pawns',
    pawns: 'pawns',
    doosdeksel: 'lid',
    'box-lid': 'lid',
    'plaatje-voor-de-groepsapp': 'share',
    'picture-for-the-group-chat': 'share',
    'als-er-iets-misgaat': 'trouble',
    'if-something-goes-wrong': 'trouble',
};

const TONES: Tone[] = ['board', 'chance', 'chest'];

function Column({ block }: { block: ContentBlockData }) {
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
}

function Steps({ block }: { block: ContentBlockData }) {
    return (
        <div className="flex flex-col gap-4">
            <h3 className="m-0 text-lg font-semibold">{block.title}</h3>
            <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4 p-0">
                {block.steps.map((step, index) => (
                    <li key={step} className="flex flex-col gap-2">
                        <StickStep step={index + 1} />
                        <span className="text-sm">
                            <strong>{index + 1}.</strong>{' '}
                            <span dangerouslySetInnerHTML={{ __html: step }} />
                        </span>
                    </li>
                ))}
            </ol>
            <Prose html={block.html} />
        </div>
    );
}

/**
 * The print guide (B67), one section per part, as in docs/design/Printgids.dc.html: a list of
 * the parts beside the text, which folds above the text on a phone. Per part the "###" blocks
 * of printgids.md become columns (print shop and home) with a mono spec line (B109).
 */
export default function PrintGuide({ document }: PrintGuideProps) {
    const t = useTranslation();

    return (
        <>
            <Seo title={document.title} description={document.description} />

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
                        const columns = section.blocks.filter(
                            (block) => block.steps.length === 0,
                        );
                        const steps = section.blocks.filter(
                            (block) => block.steps.length > 0,
                        );

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
                                {columns.length > 0 && (
                                    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-6">
                                        {columns.map((block) => (
                                            <Column
                                                key={block.title}
                                                block={block}
                                            />
                                        ))}
                                    </div>
                                )}
                                {steps.map((block) => (
                                    <Steps key={block.title} block={block} />
                                ))}
                            </section>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
