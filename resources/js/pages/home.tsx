import { Link, usePage } from '@inertiajs/react';

import { FaqList } from '@/components/faq-list';
import { Seo } from '@/components/seo';
import { Button } from '@/components/ui/button';
import { ContinueEditions } from '@/features/edition/editions/continue-editions';
import { TemplateStrip } from '@/features/edition/editions/template-strip';
import { HeroTable } from '@/features/landing/hero-table';
import { SetArt } from '@/features/landing/set-art';
import { StepArt } from '@/features/landing/step-art';
import {
    create as editionsCreate,
    sample as editionsSample,
} from '@/routes/editions';
import type { FaqItemData, Locale } from '@/types/generated';

type HomeProps = {
    /** The texts of resources/content/{locale}/landing.json (B97). */
    strings: Record<string, string>;
    faq: FaqItemData[];
};

const STEPS = [1, 2, 3, 4] as const;
const SET_ITEMS = [1, 2, 3] as const;

const LINK =
    'inline-flex min-h-11 items-center font-semibold underline underline-offset-4 hover:text-press';
const SECTION_INNER =
    'mx-auto flex max-w-content flex-col px-4 py-12 md:px-8 md:py-24';
const H2 = 'm-0 font-display text-3xl leading-[1.1] font-extrabold';

type Text = (key: string) => string;

const HomeHero = ({ text, locale }: { text: Text; locale: Locale }) => (
    <section className="mx-auto flex max-w-content flex-wrap items-center gap-x-16 gap-y-12 px-4 pt-8 pb-12 md:px-8 md:pt-16 md:pb-24">
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-4 md:gap-6">
            <h1 className="m-0 font-display text-hero font-extrabold tracking-[-0.01em]">
                {text('hero.title')}
            </h1>
            <p className="m-0 max-w-[34em] md:text-lg">{text('hero.body')}</p>
            <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
                <Button asChild>
                    <Link href={editionsCreate(locale)}>
                        {text('hero.cta.primary')}
                    </Link>
                </Button>
                <Button asChild variant="secondary">
                    <Link href={editionsSample(locale)}>
                        {text('hero.cta.secondary')}
                    </Link>
                </Button>
            </div>
            <p className="m-0 text-sm text-ink-soft">{text('hero.note')}</p>
        </div>

        <figure className="m-0 flex min-w-0 flex-[1_1_320px] flex-col items-center gap-2 md:flex-[1_1_520px]">
            <div
                role="img"
                aria-label={text('hero.image.alt')}
                className="w-full"
            >
                <HeroTable />
            </div>
            <figcaption className="font-mono text-xs text-ink-soft">
                {text('hero.caption')}
            </figcaption>
        </figure>
    </section>
);

const HomeSteps = ({ text }: { text: Text }) => (
    <section id="hoe" className="bg-board">
        <div className={`${SECTION_INNER} gap-6 md:gap-12`}>
            <h2 className={H2}>{text('steps.title')}</h2>
            <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-x-8 gap-y-8 p-0">
                {STEPS.map((step) => (
                    <li key={step} className="flex flex-col gap-4">
                        <StepArt step={step} />
                        <span className="flex gap-3">
                            <span className="font-bold font-mono text-xl leading-7 text-press-text">
                                {step}
                            </span>
                            <span className="flex flex-col gap-1">
                                <strong className="font-display text-xl font-extrabold">
                                    {text(`steps.${step}.title`)}
                                </strong>
                                <span>{text(`steps.${step}.body`)}</span>
                            </span>
                        </span>
                    </li>
                ))}
            </ol>
        </div>
    </section>
);

/** The sets on the colour of the table, with the home set first (B199). The print guide explains the rest (B205). */
const HomeSets = ({ text, printGuide }: { text: Text; printGuide: string }) => (
    <section id="sets" className="bg-print-chance">
        <div className={`${SECTION_INNER} gap-6 md:gap-8`}>
            <h2 className={H2}>{text('sets.title')}</h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-6">
                {(['home', 'shop'] as const).map((set) => (
                    <article
                        key={set}
                        className="flex flex-col gap-4 rounded-control border-2 border-ink bg-card p-6"
                    >
                        <SetArt set={set} />
                        <h3 className="m-0 font-display text-2xl font-extrabold">
                            {text(`sets.${set}.title`)}
                        </h3>
                        <ul className="m-0 flex list-disc flex-col gap-1 pl-5">
                            {SET_ITEMS.map((item) => (
                                <li key={item}>
                                    {text(`sets.${set}.item${item}`)}
                                </li>
                            ))}
                        </ul>
                        <Link href={printGuide} className={LINK}>
                            {text(`sets.${set}.link`)}
                        </Link>
                    </article>
                ))}
            </div>
        </div>
    </section>
);

const HomeFaq = ({
    text,
    faqUrl,
    faq,
}: {
    text: Text;
    faqUrl: string;
    faq: FaqItemData[];
}) => (
    <section id="vragen">
        <div
            className={`${SECTION_INNER} flex-wrap gap-8 md:flex-row md:gap-12`}
        >
            <div className="flex flex-col gap-4 md:flex-[1_1_240px]">
                <h2 className={H2}>{text('faq.title')}</h2>
                <Link href={faqUrl} className={LINK}>
                    {text('faq.link')}
                </Link>
            </div>
            <div className="max-w-[65ch] min-w-0 md:flex-[999_1_520px]">
                <FaqList items={faq} openFirst />
            </div>
        </div>
    </section>
);

/** The landing page, as in docs/design/Main.dc.html and Mobiel-landing.dc.html. */
const Home = ({ strings, faq }: HomeProps) => {
    const { locale, pageUrls } = usePage().props;
    const text = (key: string): string => strings[key] ?? '';

    return (
        <>
            <Seo
                title={text('meta.title')}
                description={text('meta.description')}
            />

            <ContinueEditions />

            <HomeHero text={text} locale={locale} />

            <TemplateStrip
                locale={locale}
                className="mx-auto max-w-content px-4 pb-12 md:px-8 md:pb-16"
            />

            <HomeSteps text={text} />

            <HomeSets text={text} printGuide={pageUrls.printGuide} />

            <HomeFaq text={text} faqUrl={pageUrls.faq} faq={faq} />
        </>
    );
};
export default Home;
