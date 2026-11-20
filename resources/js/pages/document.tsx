import { Prose } from '@/components/prose';
import { Seo } from '@/components/seo';
import { PageHero, type Tone } from '@/components/table/page-hero';
import type { ContentPageData } from '@/types/generated';

interface DocumentProps {
    document: ContentPageData;
    /** Which drawing and colour the page gets; privacy and terms differ. */
    variant?: 'privacy' | 'terms';
}

const TONE: Record<NonNullable<DocumentProps['variant']>, Tone> = {
    privacy: 'chest',
    terms: 'board',
};

/** A long text from a content file: privacy and terms (B67). The text stays in a comfortable column. */
export default function Document({
    document,
    variant = 'privacy',
}: DocumentProps) {
    return (
        <>
            <Seo title={document.seoTitle} description={document.description} />

            <PageHero tone={TONE[variant]} art={variant} title={document.title}>
                <Prose html={document.introHtml} className="text-lg" />
            </PageHero>

            <article className="mx-auto flex max-w-content flex-col gap-8 px-4 py-8 md:px-8 md:py-16">
                {document.sections.map((section) => (
                    <section
                        key={section.id}
                        id={section.id}
                        className="flex max-w-180 scroll-mt-8 flex-col gap-3"
                    >
                        <h2 className="m-0 font-display text-2xl font-extrabold">
                            {section.title}
                        </h2>
                        <Prose html={section.html} />
                    </section>
                ))}
            </article>
        </>
    );
}
