import { Head, Link, usePage } from '@inertiajs/react';

import { PageHero } from '@/components/render/table-page-hero';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';

interface ErrorProps {
    status: number;
}

const KNOWN_STATUSES = [403, 404, 419, 500, 503];

/** The page for 403, 404, 419, 500 and 503. The response carries the real status and noindex (B66). */
const ErrorPage = ({ status }: ErrorProps) => {
    const t = useTranslation();
    const { locale } = usePage().props;
    const code = KNOWN_STATUSES.includes(status) ? status : 500;
    const heading = t(`error.heading_${code}`);

    return (
        <>
            <Head title={`${status}: ${heading}`} />
            <PageHero tone="chance" art="faq" title={heading} compact>
                <p className="m-0 max-w-[34em] text-lg">
                    {t(`error.body_${code}`)}
                </p>
                <Button asChild className="self-start">
                    <Link href={`/${locale}`}>{t('error.home')}</Link>
                </Button>
            </PageHero>
        </>
    );
};
export default ErrorPage;
