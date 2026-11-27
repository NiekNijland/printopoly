export type AccountBoxData = {
    readonly box: OwnerBoxData | null;
};
export type AccountDeletedData = {
    readonly deleted: boolean;
    readonly redirect: string;
};
export type AuthUserData = {
    readonly id: string;
    readonly name: string;
    readonly email: string;
};
export type BoardForm = 'panels' | 'whole';
export type BoxCapability = 'box-link' | 'box-owner' | 'share-image';
export type BoxContributionData = {
    readonly id: string;
    readonly elementKey: string;
    readonly firstName: string;
    readonly field: string;
    readonly value: string | null;
    readonly amount: number | null;
    readonly open: string[];
    readonly hasPhoto: boolean;
    readonly width: number | null;
    readonly height: number | null;
    readonly photoUrl: string | null;
    readonly createdAt: number | null;
};
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
export type ContributionReceiptData = {
    readonly id: string;
    readonly receipt: string;
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
export type EditionConflictData = {
    readonly code: string;
    readonly message: string;
    readonly current: EditionData;
};
export type EditionData = {
    readonly schemaVersion: number;
    readonly id: string;
    readonly name: string;
    readonly language: string;
    readonly currency: string;
    readonly theme: string;
    readonly boardProfile: Record<string, unknown>;
    readonly parts: Record<string, boolean>;
    readonly elements: Record<string, Record<string, unknown>>;
    readonly revision: number;
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly template?: string;
    readonly moneyAmount?: string;
    readonly printSelection: Record<string, unknown>;
};
export type EditionImportData = {
    readonly imported: string[];
    readonly conflicts: string[];
    readonly overLimit: string[];
    readonly invalid: Record<string, string[]>;
};
export type EditionLimitData = {
    readonly code: string;
    readonly message: string;
    readonly limit: number;
};
export type EditionListData = {
    readonly editions: EditionSummaryData[];
    readonly limit: number;
};
export type EditionPhotoData = {
    readonly id: string;
    readonly ref: string;
    readonly width: number;
    readonly height: number;
    readonly previewUrl: string;
};
export type EditionPrintReadyData = {
    readonly editionId: string;
    readonly printerReadyUntil: number | null;
    readonly printerOutdated: boolean;
    readonly homeReadyUntil: number | null;
    readonly homeOutdated: boolean;
};
export type EditionPrintReadyListData = {
    readonly editions: EditionPrintReadyData[];
};
export type EditionRevisionData = {
    readonly revision: number;
    readonly updatedAt: number;
    readonly name?: string;
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
export type OwnContributionsData = {
    readonly contributions: Record<
        string,
        'waiting' | 'applied' | 'passed' | 'handled'
    >;
};
export type OwnerBoxData = {
    readonly id: string;
    readonly editionId: string;
    readonly url: string;
    readonly status: 'open' | 'closed';
    readonly expiresAt: number;
    readonly accepted: number;
    readonly rejected: number;
    readonly cardsHidden: boolean;
    readonly channel: string;
    readonly contributions: BoxContributionData[];
    readonly ownerSecret?: string;
};
export type PaginatedDataCollection<TKey, TValue> = LengthAwarePaginator<
    TKey,
    TValue
>;
export type PartStatus =
    'idle' | 'waiting' | 'running' | 'done' | 'failed' | 'outdated';
export type Permission =
    'keep-editions' | 'manage-account' | 'sign-in-with-google';
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
export type PrintJobLinkData = {
    readonly token: string;
    readonly url: string;
    readonly statusUrl: string;
};
export type PrintJobReadyData = {
    readonly token: string;
    readonly printerReadyUntil: number | null;
    readonly printerOutdated: boolean;
    readonly homeReadyUntil: number | null;
    readonly homeOutdated: boolean;
};
export type PrintJobReadyListData = {
    readonly jobs: PrintJobReadyData[];
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
export type Queue = 'default' | 'pdf';
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
export type ShareImageRequestData = {
    readonly id: string;
    readonly status: string;
};
export type ShareImageStatusData = {
    readonly status: string;
    readonly message?: string;
};
export type SignedOutData = {
    readonly clearLocalCopy: boolean;
    readonly redirect: string;
};
export type StoredPhotosData = {
    readonly stored: number;
};
