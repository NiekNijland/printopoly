import { Link, usePage } from '@inertiajs/react';

import { TemplateStrip } from '@/components/editions/template-strip';
import { FaqList } from '@/components/faq-list';
import { ContinueEditions } from '@/components/landing/continue-editions';
import { HeroTable } from '@/components/landing/hero-table';
import { SetArt } from '@/components/landing/set-art';
import { ShareArt } from '@/components/landing/share-art';
import { StepArt } from '@/components/landing/step-art';
import { StickerDiagram } from '@/components/landing/sticker-diagram';
import { Seo } from '@/components/seo';
import { Button } from '@/components/ui/button';
import {
    create as editionsCreate,
    sample as editionsSample,
} from '@/routes/editions';
import type { FaqItemData } from '@/types/generated';

interface HomeProps {
    /** The texts of resources/content/{locale}/landing.json (B97). */
    strings: Record<string, string>;
    faq: FaqItemData[];
}

const STEPS = [1, 2, 3, 4] as const;
const SET_ITEMS = [1, 2, 3] as const;

const LINK =
    'inline-flex min-h-11 items-center font-semibold underline underline-offset-4 hover:text-press';
const SECTION_INNER =
    'mx-auto flex max-w-content flex-col px-4 py-12 md:px-8 md:py-24';
const H2 = 'm-0 font-display text-3xl leading-[1.1] font-extrabold';

/** The landing page, as in docs/design/Main.dc.html and Mobiel-landing.dc.html. */
export default function Home({ strings, faq }: HomeProps) {
    const { locale, pageUrls } = usePage().props;
    const text = (key: string): string => strings[key] ?? '';

    return (
        <>
            <Seo
                title={text('meta.title')}
                description={text('meta.description')}
            />

            <ContinueEditions />

            <section className="mx-auto flex max-w-content flex-wrap items-center gap-x-16 gap-y-12 px-4 pt-8 pb-12 md:px-8 md:pt-16 md:pb-24">
                <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-4 md:gap-6">
                    <h1 className="m-0 font-display text-hero font-extrabold tracking-[-0.01em]">
                        {text('hero.title')}
                    </h1>
                    <p className="m-0 max-w-[34em] md:text-lg">
                        {text('hero.body')}
                    </p>
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
                    <p className="m-0 text-sm text-ink-soft">
                        {text('hero.note')}
                    </p>
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

            <TemplateStrip
                locale={locale}
                className="mx-auto max-w-content px-4 pb-12 md:px-8 md:pb-16"
            />

            <section id="hoe" className="bg-board">
                <div className={`${SECTION_INNER} gap-6 md:gap-12`}>
                    <div className="flex max-w-[65ch] flex-col gap-3">
                        <h2 className={H2}>{text('steps.title')}</h2>
                        <p className="m-0">{text('steps.intro')}</p>
                    </div>
                    <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-x-8 gap-y-8 p-0">
                        {STEPS.map((step) => (
                            <li key={step} className="flex flex-col gap-4">
                                <StepArt step={step} />
                                <span className="flex gap-3">
                                    <span className="font-bold font-mono text-xl leading-7 text-press">
                                        {step}
                                    </span>
                                    <span className="flex flex-col gap-1">
                                        <strong className="font-display text-xl font-extrabold">
                                            {text(`steps.${step}.title`)}
                                        </strong>
                                        <span>
                                            {text(`steps.${step}.body`)}
                                        </span>
                                    </span>
                                </span>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            <section id="sets">
                <div className={`${SECTION_INNER} gap-6 md:gap-8`}>
                    <h2 className={H2}>{text('sets.title')}</h2>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-6">
                        {(['shop', 'home'] as const).map((set) => (
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
                                <Link
                                    href={pageUrls.printGuide}
                                    className={LINK}
                                >
                                    {text(`sets.${set}.link`)}
                                </Link>
                            </article>
                        ))}
                    </div>
                    <article
                        id="samen"
                        className="grid grid-cols-[minmax(0,1fr)] items-center gap-6 rounded-control border-2 border-ink bg-print-chest p-6 md:grid-cols-[minmax(0,360px)_1fr] md:gap-12"
                    >
                        <div
                            role="img"
                            aria-label={text('sets.share.art.alt')}
                            className="w-full"
                        >
                            <ShareArt
                                edition={text('sets.share.art.edition')}
                                question={text('sets.share.art.question')}
                                answer={text('sets.share.art.answer')}
                                name={text('sets.share.art.name')}
                                send={text('sets.share.art.send')}
                            />
                        </div>
                        <div className="flex flex-col gap-4">
                            <h3 className="m-0 font-display text-2xl font-extrabold">
                                {text('sets.share.title')}
                            </h3>
                            <ul className="m-0 flex list-disc flex-col gap-1 pl-5">
                                {SET_ITEMS.map((item) => (
                                    <li key={item}>
                                        {text(`sets.share.item${item}`)}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </article>
                    <p className="m-0 text-ink-soft">{text('sets.note')}</p>
                </div>
            </section>

            <section id="sticker" className="overflow-x-clip bg-print-chance">
                <div
                    className={`${SECTION_INNER} flex-wrap items-center gap-12 md:flex-row md:gap-16`}
                >
                    <div className="flex max-w-[65ch] min-w-0 flex-[1_1_400px] flex-col gap-4">
                        <h2 className={H2}>{text('sticker.title')}</h2>
                        <p className="m-0">{text('sticker.intro')}</p>
                        <ol className="m-0 flex list-decimal flex-col gap-2 pl-6 marker:font-mono">
                            {STEPS.map((step) => (
                                <li key={step}>
                                    {text(`sticker.step${step}`)}
                                </li>
                            ))}
                        </ol>
                        <Link href={pageUrls.printGuide} className={LINK}>
                            {text('sticker.link')}
                        </Link>
                    </div>
                    <StickerDiagram label={text('sticker.diagram.alt')} />
                </div>
            </section>

            <section id="vragen">
                <div
                    className={`${SECTION_INNER} flex-wrap gap-8 md:flex-row md:gap-12`}
                >
                    <div className="flex flex-[1_1_240px] flex-col gap-4">
                        <h2 className={H2}>{text('faq.title')}</h2>
                        <Link href={pageUrls.faq} className={LINK}>
                            {text('faq.link')}
                        </Link>
                    </div>
                    <div className="max-w-[65ch] min-w-0 flex-[999_1_520px]">
                        <FaqList items={faq} openFirst />
                    </div>
                </div>
            </section>
        </>
    );
}
