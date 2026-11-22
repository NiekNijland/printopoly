export type AuthUserData = {
    id: string;
    name: string;
    email: string;
};
export type BoardForm = 'panels' | 'whole';
export type ChannelData = {
    name: string;
    private: boolean;
};
export type ContentBlockData = {
    title: string;
    html: string;
    spec: string | null;
    steps: string[];
};
export type ContentPageData = {
    title: string;
    seoTitle: string;
    description: string;
    introHtml: string;
    sections: Array<ContentSectionData>;
};
export type ContentSectionData = {
    id: string;
    title: string;
    html: string;
    blocks: Array<ContentBlockData>;
};
export type EditionPrintReadyData = {
    editionId: string;
    printerReadyUntil: number | null;
    printerOutdated: boolean;
    homeReadyUntil: number | null;
    homeOutdated: boolean;
};
export type EditionSummaryData = {
    id: string;
    name: string;
    language: 'nl' | 'en';
    theme: 'classic' | 'riso' | 'strak' | 'gala';
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
    | 'houseRules'
    | 'rulesBooklet'
    | 'invitation'
    | 'group'
    | 'words'
    | 'themeAccent';
export type FailureReason =
    'timeout' | 'photos' | 'layout' | 'edition' | 'other';
export type FaqItemData = {
    question: string;
    answerHtml: string;
};
export type FeatureEvent =
    | 'edition_created'
    | 'template_chosen'
    | 'photo_added'
    | 'share_image_made'
    | 'box_created'
    | 'print_board'
    | 'print_cards'
    | 'print_money'
    | 'print_tokens'
    | 'print_box_lid'
    | 'print_rules_booklet'
    | 'print_invitation'
    | 'print_calibration';
export type Locale = 'nl' | 'en';
export type MoneyAmount = 'four' | 'eight' | 'full';
export type PartStatus =
    'idle' | 'waiting' | 'running' | 'done' | 'failed' | 'outdated';
export type PrintChoicesData = {
    printer: PrintSetChoiceData;
    home: PrintSetChoiceData;
};
export type PrintJobData = {
    token: string;
    statusUrl: string;
    generateUrl: string;
    channel: ChannelData;
    status: PrintJobStatusData;
    anonymous: boolean;
    retentionDays: number;
    choices: PrintChoicesData;
};
export type PrintJobReadyData = {
    token: string;
    printerReadyUntil: number | null;
    printerOutdated: boolean;
    homeReadyUntil: number | null;
    homeOutdated: boolean;
};
export type PrintJobStatusData = {
    busy: boolean;
    printerZipUrl: string;
    homeZipUrl: string;
    printerZipReady: boolean;
    homeZipReady: boolean;
    zipPreparing: boolean;
    parts: Array<PrintPartStatusData>;
};
export type PrintPart =
    | 'board'
    | 'cards'
    | 'money'
    | 'tokens'
    | 'box_lid'
    | 'rules_booklet'
    | 'invitation'
    | 'calibration';
export type PrintPartStatusData = {
    set: PrintSet;
    part: PrintPart;
    status: PartStatus;
    waitingFor: PrintPart | null;
    pages: number | null;
    bytes: number | null;
    downloadUrl: string | null;
    instructionsUrl: string | null;
    reason: string | null;
    imageUrl: string | null;
};
export type PrintSet = 'printer' | 'home';
export type PrintSetChoiceData = {
    skipped: PrintPart[];
    moneyAmount: MoneyAmount | null;
    copies: number;
    boardForm: BoardForm;
    invitations: number;
};
export type PublicPage =
    'home' | 'print-guide' | 'faq' | 'privacy' | 'terms' | 'contact';
export type SeoData = {
    canonical: string;
    alternates: Record<string, string>;
    ogImage: string;
    ogLocale: string;
    alternateLocales: string[];
    ogImageWidth: number;
    ogImageHeight: number;
    jsonLd: Record<string, unknown>;
};
