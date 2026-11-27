import { Prose } from '@/components/prose';
import type { FaqItemData } from '@/types/generated';

type FaqListProps = {
    items: FaqItemData[];
    /** Open the first question, as in the design of the landing page. */
    openFirst?: boolean;
};

/** Questions as native disclosure elements, so they work without script. */
export const FaqList = ({ items, openFirst = false }: FaqListProps) => {
    return (
        <div className="flex flex-col border-b border-line">
            {items.map((item, index) => (
                <details
                    key={item.question}
                    open={openFirst && index === 0}
                    className="border-t border-line py-4"
                >
                    <summary className="flex min-h-11 cursor-pointer items-center text-lg font-semibold">
                        {item.question}
                    </summary>
                    <Prose html={item.answerHtml} className="mt-2" />
                </details>
            ))}
        </div>
    );
};
