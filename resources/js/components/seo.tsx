import { Head, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

import { documentTitle } from '@/lib/pages';
import type { SeoData } from '@/types/generated';

type SeoProps = {
    title: string;
    description: string;
};

const openGraphTags = (
    name: string,
    fullTitle: string,
    description: string,
    seo: SeoData | null,
): ReactNode[] => [
    <meta key="og-type" property="og:type" content="website" />,
    <meta key="og-site-name" property="og:site_name" content={name} />,
    <meta key="og-title" property="og:title" content={fullTitle} />,
    <meta
        key="og-description"
        property="og:description"
        content={description}
    />,
    seo !== null && (
        <meta key="og-url" property="og:url" content={seo.canonical} />
    ),
    seo !== null && (
        <meta key="og-image" property="og:image" content={seo.ogImage} />
    ),
    seo !== null && (
        <meta
            key="og-image-width"
            property="og:image:width"
            content={String(seo.ogImageWidth)}
        />
    ),
    seo !== null && (
        <meta
            key="og-image-height"
            property="og:image:height"
            content={String(seo.ogImageHeight)}
        />
    ),
    seo !== null && (
        <meta key="og-image-alt" property="og:image:alt" content={fullTitle} />
    ),
    seo !== null && (
        <meta key="og-locale" property="og:locale" content={seo.ogLocale} />
    ),
    seo !== null &&
        seo.alternateLocales.map((locale) => (
            <meta
                key={`og-locale-alternate-${locale}`}
                property="og:locale:alternate"
                content={locale}
            />
        )),
];

const twitterTags = (
    fullTitle: string,
    description: string,
    seo: SeoData | null,
): ReactNode[] => [
    <meta
        key="twitter-card"
        name="twitter:card"
        content="summary_large_image"
    />,
    <meta key="twitter-title" name="twitter:title" content={fullTitle} />,
    <meta
        key="twitter-description"
        name="twitter:description"
        content={description}
    />,
    seo !== null && (
        <meta key="twitter-image" name="twitter:image" content={seo.ogImage} />
    ),
    seo !== null && (
        <meta
            key="twitter-image-alt"
            name="twitter:image:alt"
            content={fullTitle}
        />
    ),
];

/**
 * The head of a public page: title, description, canonical, hreflang and
 * Open Graph / Twitter tags (B66). The server shares the canonical and the
 * alternates as `seo`; the page brings its own title and description.
 */
export const Seo = ({ title, description }: SeoProps) => {
    const { name, seo } = usePage().props;
    const fullTitle = documentTitle(title);

    return (
        <Head title={title}>
            <meta name="description" content={description} />
            <meta
                name="robots"
                content={
                    seo === null
                        ? 'noindex, nofollow'
                        : 'index, follow, max-image-preview:large'
                }
            />
            {seo !== null && (
                <link key="canonical" rel="canonical" href={seo.canonical} />
            )}
            {seo !== null &&
                Object.entries(seo.alternates).map(([hreflang, href]) => (
                    <link
                        key={`alternate-${hreflang}`}
                        rel="alternate"
                        hrefLang={hreflang}
                        href={href}
                    />
                ))}
            {openGraphTags(name, fullTitle, description, seo)}
            {twitterTags(fullTitle, description, seo)}
            {seo !== null && (
                <script
                    key="json-ld"
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(seo.jsonLd).replace(
                            /</g,
                            '\\u003c',
                        ),
                    }}
                />
            )}
        </Head>
    );
};
