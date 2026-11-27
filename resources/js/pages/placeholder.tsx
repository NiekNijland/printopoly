import { Head } from '@inertiajs/react';

import { useTranslation } from '@/hooks/use-translation';

type PlaceholderProps = {
    titleKey: string;
};

/** Stands in for a public page that is not built yet. */
const Placeholder = ({ titleKey }: PlaceholderProps) => {
    const t = useTranslation();
    const title = t(titleKey);

    return (
        <>
            <Head title={title} />
            <section className="mx-auto max-w-content px-4 py-12 md:px-8">
                <h1 className="m-0 font-display text-3xl font-extrabold">
                    {title}
                </h1>
            </section>
        </>
    );
};
export default Placeholder;
