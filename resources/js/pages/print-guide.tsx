import { Prose } from '@/components/prose';
import { Seo } from '@/components/seo';
import { useTranslation } from '@/hooks/use-translation';
import type { ContentPageData } from '@/types/generated';

interface PrintGuideProps {
    document: ContentPageData;
}

/**
 * The print guide (B67), one section per part, as in
 * docs/design/Printgids.dc.html: a list of the parts beside the text, which
 * folds above the text on a phone.
 */
export default function PrintGuide({ document }: PrintGuideProps) {
    const t = useTranslation();

    return (
        <>
            <Seo title={document.title} description={document.description} />

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
                            className="flex min-h-10 items-center"
                        >
                            {section.title}
                        </a>
                    ))}
                </nav>

                <div className="flex max-w-180 min-w-0 flex-[999_1_320px] flex-col gap-12 md:gap-16">
                    <header className="flex flex-col gap-4">
                        <h1 className="m-0 font-display text-[40px] leading-[1.05] font-extrabold">
                            {document.title}
                        </h1>
                        <Prose html={document.introHtml} className="text-lg" />
                    </header>

                    {document.sections.map((section) => (
                        <section
                            key={section.id}
                            id={section.id}
                            className="flex scroll-mt-8 flex-col gap-4"
                        >
                            <h2 className="m-0 font-display text-2xl font-extrabold">
                                {section.title}
                            </h2>
                            <Prose html={section.html} />
                        </section>
                    ))}
                </div>
            </div>
        </>
    );
}
