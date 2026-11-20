import { Prose } from '@/components/prose';
import { Seo } from '@/components/seo';
import type { ContentPageData } from '@/types/generated';

interface DocumentProps {
    document: ContentPageData;
}

/** A long text from a content file: privacy and terms (B67). */
export default function Document({ document }: DocumentProps) {
    return (
        <>
            <Seo title={document.title} description={document.description} />

            <article className="mx-auto flex max-w-content flex-col gap-8 px-4 py-8 md:px-8 md:py-16">
                <header className="flex max-w-180 flex-col gap-4">
                    <h1 className="m-0 font-display text-[40px] leading-[1.05] font-extrabold">
                        {document.title}
                    </h1>
                    <Prose html={document.introHtml} className="text-lg" />
                </header>

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
