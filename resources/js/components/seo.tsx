import { Head, usePage } from '@inertiajs/react';

import { documentTitle } from '@/lib/pages';

interface SeoProps {
    title: string;
    description: string;
}

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
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content={name} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            {seo !== null && (
                <meta key="og-url" property="og:url" content={seo.canonical} />
            )}
            {seo !== null && (
                <meta
                    key="og-image"
                    property="og:image"
                    content={seo.ogImage}
                />
            )}
            {seo !== null && (
                <meta
                    key="og-image-width"
                    property="og:image:width"
                    content={String(seo.ogImageWidth)}
                />
            )}
            {seo !== null && (
                <meta
                    key="og-image-height"
                    property="og:image:height"
                    content={String(seo.ogImageHeight)}
                />
            )}
            {seo !== null && (
                <meta
                    key="og-image-alt"
                    property="og:image:alt"
                    content={fullTitle}
                />
            )}
            {seo !== null && (
                <meta
                    key="og-locale"
                    property="og:locale"
                    content={seo.ogLocale}
                />
            )}
            {seo !== null &&
                seo.alternateLocales.map((locale) => (
                    <meta
                        key={`og-locale-alternate-${locale}`}
                        property="og:locale:alternate"
                        content={locale}
                    />
                ))}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
            {seo !== null && (
                <meta
                    key="twitter-image"
                    name="twitter:image"
                    content={seo.ogImage}
                />
            )}
            {seo !== null && (
                <meta
                    key="twitter-image-alt"
                    name="twitter:image:alt"
                    content={fullTitle}
                />
            )}
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
