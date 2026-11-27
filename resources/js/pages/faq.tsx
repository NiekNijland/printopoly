import { FaqList } from '@/components/faq-list';
import { Prose } from '@/components/prose';
import { PageHero } from '@/components/render/table-page-hero';
import { Seo } from '@/components/seo';
import type { ContentPageData } from '@/types/generated';

type FaqProps = {
    document: ContentPageData;
};

/** All questions from faq.md. The landing page shows a selection. */
const Faq = ({ document }: FaqProps) => {
    const items = document.sections.map((section) => ({
        question: section.title,
        answerHtml: section.html,
    }));

    return (
        <>
            <Seo title={document.seoTitle} description={document.description} />

            <PageHero tone="chance" art="faq" title={document.title}>
                <Prose html={document.introHtml} className="text-lg" />
            </PageHero>
            <div className="mx-auto max-w-content px-4 py-8 md:px-8 md:py-16">
                <div className="max-w-180">
                    <FaqList items={items} />
                </div>
            </div>
        </>
    );
};
export default Faq;
