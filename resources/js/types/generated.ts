export type AuthUserData = {
    readonly id: string;
    readonly name: string;
    readonly email: string;
};
export type BoardForm = 'panels' | 'whole';
export type ChannelData = {
    readonly name: string;
    readonly private: boolean;
};
export type ContentBlockData = {
    readonly title: string;
    readonly html: string;
    readonly spec: string | null;
    readonly steps: string[];
};
export type ContentPageData = {
    readonly title: string;
    readonly seoTitle: string;
    readonly description: string;
    readonly introHtml: string;
    readonly sections: ContentSectionData[];
};
export type ContentSectionData = {
    readonly id: string;
    readonly title: string;
    readonly html: string;
    readonly blocks: ContentBlockData[];
};
export type CursorPaginatedDataCollection<TKey, TValue> = CursorPaginator<
    TKey,
    TValue
>;
export type CursorPaginator<TKey, TValue> = {
    data: TKey extends string ? Record<TKey, TValue> : TValue[];
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
    meta: {
        path: string;
        per_page: number;
        next_cursor: string | null;
        next_page_url: string | null;
        prev_cursor: string | null;
        prev_page_url: string | null;
    };
};
export type CursorPaginatorInterface<TKey, TValue> = CursorPaginator<
    TKey,
    TValue
>;
export type EditionPrintReadyData = {
    readonly editionId: string;
    readonly printerReadyUntil: number | null;
    readonly printerOutdated: boolean;
    readonly homeReadyUntil: number | null;
    readonly homeOutdated: boolean;
};
export type EditionSummaryData = {
    readonly id: string;
    readonly name: string;
    readonly language: 'nl' | 'en';
    readonly theme: 'classic' | 'riso' | 'strak' | 'gala';
    readonly revision: number;
    readonly createdAt: number;
    readonly updatedAt: number;
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
    | 'themeAccent'
    | 'partStyle';
export type FailureReason =
    'timeout' | 'photos' | 'layout' | 'edition' | 'other';
export type FaqItemData = {
    readonly question: string;
    readonly answerHtml: string;
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
export type LengthAwarePaginator<TKey, TValue> = {
    data: TKey extends string ? Record<TKey, TValue> : TValue[];
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
    meta: {
        total: number;
        current_page: number;
        first_page_url: string;
        from: number | null;
        last_page: number;
        last_page_url: string;
        next_page_url: string | null;
        path: string;
        per_page: number;
        prev_page_url: string | null;
        to: number | null;
    };
};
export type LengthAwarePaginatorInterface<TKey, TValue> = LengthAwarePaginator<
    TKey,
    TValue
>;
export type Locale = 'nl' | 'en';
export type MoneyAmount = 'four' | 'eight' | 'full';
export type PaginatedDataCollection<TKey, TValue> = LengthAwarePaginator<
    TKey,
    TValue
>;
export type PartStatus =
    'idle' | 'waiting' | 'running' | 'done' | 'failed' | 'outdated';
export type PrintChoicesData = {
    readonly printer: PrintSetChoiceData;
    readonly home: PrintSetChoiceData;
};
export type PrintJobData = {
    readonly token: string;
    readonly statusUrl: string;
    readonly generateUrl: string;
    readonly channel: ChannelData;
    readonly status: PrintJobStatusData;
    readonly anonymous: boolean;
    readonly retentionDays: number;
    readonly choices: PrintChoicesData;
};
export type PrintJobReadyData = {
    readonly token: string;
    readonly printerReadyUntil: number | null;
    readonly printerOutdated: boolean;
    readonly homeReadyUntil: number | null;
    readonly homeOutdated: boolean;
};
export type PrintJobStatusData = {
    readonly busy: boolean;
    readonly printerZipUrl: string;
    readonly homeZipUrl: string;
    readonly printerZipReady: boolean;
    readonly homeZipReady: boolean;
    readonly zipPreparing: boolean;
    readonly parts: PrintPartStatusData[];
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
    readonly set: PrintSet;
    readonly part: PrintPart;
    readonly status: PartStatus;
    readonly waitingFor: PrintPart | null;
    readonly pages: number | null;
    readonly bytes: number | null;
    readonly downloadUrl: string | null;
    readonly instructionsUrl: string | null;
    readonly reason: string | null;
    readonly imageUrl: string | null;
};
export type PrintSet = 'printer' | 'home';
export type PrintSetChoiceData = {
    readonly skipped: PrintPart[];
    readonly moneyAmount: MoneyAmount | null;
    readonly copies: number;
    readonly boardForm: BoardForm;
    readonly invitations: number;
};
export type PublicPage =
    'home' | 'print-guide' | 'faq' | 'privacy' | 'terms' | 'contact';
export type SeoData = {
    readonly canonical: string;
    readonly alternates: Record<string, string>;
    readonly ogImage: string;
    readonly ogLocale: string;
    readonly alternateLocales: string[];
    readonly ogImageWidth: number;
    readonly ogImageHeight: number;
    readonly jsonLd: Record<string, unknown>;
};
