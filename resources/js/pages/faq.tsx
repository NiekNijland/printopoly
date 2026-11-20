import { FaqList } from '@/components/faq-list';
import { Prose } from '@/components/prose';
import { Seo } from '@/components/seo';
import type { ContentPageData } from '@/types/generated';

interface FaqProps {
    document: ContentPageData;
}

/** All questions from faq.md. The landing page shows a selection. */
export default function Faq({ document }: FaqProps) {
    const items = document.sections.map((section) => ({
        question: section.title,
        answerHtml: section.html,
    }));

    return (
        <>
            <Seo title={document.title} description={document.description} />

            <div className="mx-auto flex max-w-content flex-col gap-8 px-4 py-8 md:px-8 md:py-16">
                <header className="flex max-w-180 flex-col gap-4">
                    <h1 className="m-0 font-display text-[40px] leading-[1.05] font-extrabold">
                        {document.title}
                    </h1>
                    <Prose html={document.introHtml} className="text-lg" />
                </header>
                <div className="max-w-180">
                    <FaqList items={items} />
                </div>
            </div>
        </>
    );
}
