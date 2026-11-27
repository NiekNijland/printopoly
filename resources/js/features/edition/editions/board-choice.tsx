import { Fragment, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Note } from '@/features/edition/editions/edition-choices';
import { useTranslation } from '@/hooks/use-translation';
import {
    DEFAULT_BOARD_PROFILE,
    lidForBoard,
    spaceWidth,
    profileProblems,
    type ProfileField,
    type BoardProfile,
} from '@/lib/render/print-board';
import type { Locale } from '@/types/game';
import { formatMm } from '@/types/print';

const sameLid = (a: { w: number; h: number }, b: { w: number; h: number }) => {
    return a.w === b.w && a.h === b.h;
};

const parse = (text: string) => Number(text.replace(',', '.'));

type Draft = Record<'outer' | 'corner' | 'border' | 'lidW' | 'lidH', string>;

const customProfileOf = (
    draft: Draft,
    boxLid: { w: number; h: number },
    name: string,
): BoardProfile => ({
    ...DEFAULT_BOARD_PROFILE,
    id: 'custom',
    name,
    outer: parse(draft.outer),
    corner: parse(draft.corner),
    border: parse(draft.border),
    boxLid,
    provisional: false,
});

const sizeChanged = (next: BoardProfile, profile: BoardProfile): boolean =>
    next.outer !== profile.outer ||
    next.corner !== profile.corner ||
    next.border !== profile.border ||
    !sameLid(next.boxLid, profile.boxLid);

const wrongField =
    (problems: readonly { field: ProfileField }[], last: ProfileField) =>
    (field: ProfileField): boolean =>
        problems.some(
            (problem) =>
                problem.field === field ||
                problem.field === 'other' ||
                (problem.field === 'fit' && field === last),
        );

const useBoardDraft = (
    profile: BoardProfile,
    interfaceLanguage: Locale,
    onProfile: (profile: BoardProfile) => void,
) => {
    const t = useTranslation();
    const custom = profile.id === 'custom';
    const [draft, setDraft] = useState<Draft>({
        outer: String(profile.outer),
        corner: String(profile.corner),
        border: String(profile.border),
        lidW: String(profile.boxLid.w),
        lidH: String(profile.boxLid.h),
    });
    // The lid follows the board until someone types a size of their own (B254). A custom board from before kept
    // the standard lid, which counts as following too.
    const [lidOwn, setLidOwn] = useState(
        () =>
            !sameLid(profile.boxLid, lidForBoard(profile.outer)) &&
            !sameLid(profile.boxLid, DEFAULT_BOARD_PROFILE.boxLid),
    );
    const followed = lidForBoard(parse(draft.outer));
    const customProfile = customProfileOf(
        draft,
        lidOwn ? { w: parse(draft.lidW), h: parse(draft.lidH) } : followed,
        t('edition.profile_custom'),
    );
    const problems = custom
        ? profileProblems(customProfile, interfaceLanguage)
        : [];
    // The field typed in last: a size that does not fit with the others is blamed on it.
    const [last, setLast] = useState<ProfileField>('corner');
    // Only the field the problem is about turns red, not all three (Lukas, R5-19).
    const wrong = wrongField(problems, last);

    const setDraftField = (
        field: 'outer' | 'corner' | 'border',
        value: string,
    ): void => {
        setDraft({ ...draft, [field]: value });
        setLast(field);
    };
    const setLidField = (field: 'lidW' | 'lidH', value: string): void => {
        // Typing one side keeps the other as it shows.
        setDraft({
            ...draft,
            ...(lidOwn
                ? {}
                : { lidW: String(followed.w), lidH: String(followed.h) }),
            [field]: value,
        });
        setLidOwn(true);
        setLast('lid');
    };
    // The board takes a size when you leave the field or press Enter, never halfway: typing 200 went through 2 and
    // 20 and drew tiny corners (Lukas, R5-19). An invalid size never reaches the board; it keeps the last valid one.
    const commit = (): void => {
        if (problems.length === 0 && sizeChanged(customProfile, profile)) {
            onProfile(customProfile);
        }
    };
    const followBoard = (): void => {
        setLidOwn(false);
        onProfile({ ...customProfile, boxLid: followed });
    };

    return {
        custom,
        draft,
        lidOwn,
        followed,
        customProfile,
        problems,
        wrong,
        setDraftField,
        setLidField,
        commit,
        followBoard,
    };
};

type BoardDraft = ReturnType<typeof useBoardDraft>;

const onEnter =
    (commit: () => void) =>
    (event: { key: string }): void => {
        if (event.key === 'Enter') {
            commit();
        }
    };

const BoardSizeFields = ({
    board,
    idPrefix,
}: {
    board: BoardDraft;
    idPrefix: string;
}) => {
    const t = useTranslation();

    return (
        <>
            {(
                [
                    ['outer', 'A', 'edition.profile_outer'],
                    ['corner', 'B', 'edition.profile_corner'],
                    ['border', 'C', 'edition.profile_border'],
                ] as const
            ).map(([field, letter, label]) => (
                <label
                    key={field}
                    className="flex flex-col gap-1 text-sm font-semibold"
                >
                    {letter}: {t(label)}
                    <Input
                        inputMode="decimal"
                        unit="mm"
                        value={board.draft[field]}
                        aria-invalid={board.wrong(field)}
                        aria-describedby={
                            board.wrong(field)
                                ? `${idPrefix}-profile-problem`
                                : undefined
                        }
                        onChange={(event) =>
                            board.setDraftField(field, event.target.value)
                        }
                        onBlur={board.commit}
                        onKeyDown={onEnter(board.commit)}
                    />
                </label>
            ))}
        </>
    );
};

const LidFields = ({ board }: { board: BoardDraft }) => {
    const t = useTranslation();
    const { lidOwn, draft, followed } = board;

    return (
        <fieldset className="col-span-full m-0 flex min-w-0 flex-col gap-1 border-0 p-0">
            <legend className="mb-1 p-0 text-sm font-semibold">
                D: {t('edition.profile_lid')}
            </legend>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-sm font-semibold">
                {(
                    [
                        ['lidW', 'edition.profile_lid_w'],
                        ['lidH', 'edition.profile_lid_h'],
                    ] as const
                ).map(([field, label], index) => (
                    <Fragment key={field}>
                        {index === 1 && (
                            <span aria-hidden="true" className="text-ink-soft">
                                ×
                            </span>
                        )}
                        <Input
                            inputMode="decimal"
                            unit="mm"
                            aria-label={t(label)}
                            value={
                                lidOwn
                                    ? draft[field]
                                    : String(
                                          field === 'lidW'
                                              ? followed.w
                                              : followed.h,
                                      )
                            }
                            aria-invalid={board.wrong('lid')}
                            onChange={(event) =>
                                board.setLidField(field, event.target.value)
                            }
                            onBlur={board.commit}
                            onKeyDown={onEnter(board.commit)}
                        />
                    </Fragment>
                ))}
            </div>
            <p className="m-0 text-sm text-ink-soft">
                {lidOwn ? (
                    <>
                        {t('edition.profile_lid_own')}{' '}
                        <button
                            type="button"
                            className="font-semibold underline underline-offset-4"
                            onClick={board.followBoard}
                        >
                            {t('edition.profile_lid_follow')}
                        </button>
                    </>
                ) : (
                    t('edition.profile_lid_follows')
                )}
            </p>
        </fieldset>
    );
};

const CustomSizes = ({
    board,
    idPrefix,
    interfaceLanguage,
}: {
    board: BoardDraft;
    idPrefix: string;
    interfaceLanguage: Locale;
}) => {
    const t = useTranslation();
    const { problems } = board;

    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <BoardSizeFields board={board} idPrefix={idPrefix} />
            <LidFields board={board} />
            {problems.length > 0 ? (
                <p
                    id={`${idPrefix}-profile-problem`}
                    role="alert"
                    className="col-span-full m-0 text-sm text-press"
                >
                    {problems.map((problem) => problem.message).join(' ')}
                </p>
            ) : (
                <p className="col-span-full m-0 text-sm text-ink-soft">
                    {t('edition.profile_fits', {
                        width: formatMm(
                            spaceWidth(board.customProfile),
                            interfaceLanguage,
                        ),
                    })}
                </p>
            )}
        </div>
    );
};

type BoardChoiceProps = {
    profile: BoardProfile;
    interfaceLanguage: Locale;
    idPrefix: string;
    onProfile: (profile: BoardProfile) => void;
    note?: string;
};

/** The standard board size, or an own size with the three measures (B72). */
export const BoardChoice = ({
    profile,
    interfaceLanguage,
    idPrefix,
    onProfile,
    note,
}: BoardChoiceProps) => {
    const t = useTranslation();
    const board = useBoardDraft(profile, interfaceLanguage, onProfile);
    const { custom, customProfile, problems } = board;

    return (
        <>
            <label className="grid grid-cols-[auto_1fr] items-start gap-x-3">
                <input
                    type="radio"
                    name={`${idPrefix}-board`}
                    checked={!custom}
                    onChange={() => onProfile(DEFAULT_BOARD_PROFILE)}
                    className="row-span-2 mt-0.5 size-5 shrink-0 accent-press"
                />
                <strong>{t('edition.profile_standard')}</strong>
                <span className="col-start-2 text-sm text-ink-soft">
                    {t('edition.profile_standard_note')}
                </span>
            </label>
            <label className="grid grid-cols-[auto_1fr] items-start gap-x-3">
                <input
                    type="radio"
                    name={`${idPrefix}-board`}
                    checked={custom}
                    onChange={() => onProfile(customProfile)}
                    className="row-span-2 mt-0.5 size-5 shrink-0 accent-press"
                />
                <strong>{t('edition.profile_custom')}</strong>
                <span className="col-start-2 text-sm text-ink-soft">
                    {t('edition.profile_custom_note')}
                </span>
            </label>
            {custom && (
                <CustomSizes
                    board={board}
                    idPrefix={idPrefix}
                    interfaceLanguage={interfaceLanguage}
                />
            )}
            {problems.length === 0 && <Note>{note}</Note>}
        </>
    );
};
