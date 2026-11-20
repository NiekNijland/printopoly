export type AuthUserData = {
    id: string;
    name: string;
    email: string;
};
export type ContentPageData = {
    title: string;
    description: string;
    introHtml: string;
    sections: Array<ContentSectionData>;
};
export type ContentSectionData = {
    id: string;
    title: string;
    html: string;
};
export type EditionSummaryData = {
    id: string;
    name: string;
    language: 'nl' | 'en';
    theme: 'classic' | 'riso' | 'strak';
    revision: number;
    createdAt: number;
    updatedAt: number;
};
export type ElementKind =
    | 'space'
    | 'deed'
    | 'card'
    | 'note'
    | 'pawn'
    | 'cardBack'
    | 'boxLid'
    | 'boardCenter'
    | 'houseRules';
export type FaqItemData = {
    question: string;
    answerHtml: string;
};
export type Locale = 'nl' | 'en';
export type PublicPage =
    'home' | 'print-guide' | 'faq' | 'privacy' | 'terms' | 'contact';
export type SeoData = {
    canonical: string;
    alternates: Record<string, string>;
    ogImage: string;
    ogLocale: string;
    alternateLocales: string[];
};
