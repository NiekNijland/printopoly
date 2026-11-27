import { editElement } from '@/features/edition/editor/edit';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import type { CheckIssue } from '@/lib/render/checks-types';
import { baselineField } from '@/lib/render/edition-baseline';
import { amountIntoText } from '@/lib/render/edition-card-text';
import type { ResolvedCard } from '@/lib/render/edition-resolve';
import type { Edition } from '@/lib/render/edition-types';
import {
    faceOffFold,
    layerOffFold,
    replaceLayer,
} from '@/lib/render/editor-layers';
import type { PhotoInfos } from '@/lib/render/editor-photo-cache';

/** The link-style button under a warning that fixes it in one tap. */
const FixButton = ({
    label,
    onClick,
}: {
    label: string;
    onClick: () => void;
}) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className="min-h-11 cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold underline underline-offset-4"
        >
            {label}
        </button>
    );
};

type IssueFixProps = {
    issue: CheckIssue;
    session: EditionSession;
    edition: Edition;
    editKey: string;
    card: ResolvedCard | undefined;
    photos: PhotoInfos;
    announce: (text: string) => void;
};

// "Verschuiven" (B183, B187): the name, photo or logo goes to a free square, a layer off the fold.
const moveOffFold = ({
    issue,
    session,
    edition,
    editKey,
    photos,
}: IssueFixProps): void => {
    const layerId = issue.field.startsWith('layer.')
        ? issue.field.slice('layer.'.length)
        : null;
    const layers = session.edition.elements[editKey]?.layers ?? [];
    const layer = layers.find((candidate) => candidate.id === layerId);
    const background = session.edition.elements[editKey]?.background;
    const size =
        background === undefined ? undefined : photos.get(background.photoId);
    if (layer !== undefined) {
        editElement(session, editKey, {
            layers: replaceLayer(
                layers,
                layerOffFold(layer, edition.boardProfile),
            ),
        });
    } else if (issue.field === 'background') {
        // The middle of a photo over the whole centre on a fold (B261): zoom in and slide it.
        if (background !== undefined && size !== undefined) {
            editElement(session, editKey, {
                background: faceOffFold(edition.boardProfile, background, {
                    w: size.width,
                    h: size.height,
                }),
            });
        }
    } else {
        editElement(session, editKey, {
            centerPlace: undefined,
            titleOffset: undefined,
        });
    }
};

// "De tekst zegt betalen, maar onderaan staat Ontvang": one tap turns the card (R5-11).
const TurnFix = ({
    session,
    edition,
    editKey,
    card,
    announce,
    says,
}: IssueFixProps & { card: ResolvedCard; says: 'pay' | 'receive' }) => {
    const t = useTranslation();
    const amount = card.amount;
    if (amount === undefined || amount === 0) {
        return null;
    }
    const turned = (says === 'pay' ? -1 : 1) * Math.abs(amount);

    return (
        <FixButton
            label={t(
                says === 'pay'
                    ? 'editor.amount_turn_pay'
                    : 'editor.amount_turn_receive',
            )}
            onClick={() => {
                editElement(session, editKey, {
                    amount:
                        turned === card.standardAmount &&
                        baselineField(edition, editKey, 'amount') === undefined
                            ? undefined
                            : turned,
                });
                announce(
                    t(
                        says === 'pay'
                            ? 'editor.amount_turned_pay'
                            : 'editor.amount_turned_receive',
                    ),
                );
            }}
        />
    );
};

const DifferFix = ({
    session,
    edition,
    editKey,
    card,
    announce,
    mentioned,
}: IssueFixProps & { card: ResolvedCard; mentioned: number }) => {
    const t = useTranslation();
    const text = session.edition.elements[editKey]?.text;
    const standard = card.extra ? undefined : card.standardAmount;
    const baseline = baselineField(edition, editKey, 'amount');
    // The amount becomes the mentioned one and the number in the text becomes `{amount}`, so the card names it
    // once and the fix does not raise "the amount is already at the bottom" (Sem, R5-11).
    const into = text === undefined ? null : amountIntoText(text, mentioned);

    return (
        <FixButton
            label={t('editor.amount_fix')}
            onClick={() => {
                editElement(session, editKey, {
                    // The standard amount is stored as no amount, unless the template set its own.
                    amount:
                        mentioned === standard && baseline === undefined
                            ? undefined
                            : mentioned,
                    ...(into === null ? {} : { text: into }),
                });
                announce(
                    t(
                        into === null
                            ? 'editor.amount_fixed'
                            : 'editor.amount_fixed_in_text',
                        { amount: Math.abs(mentioned) },
                    ),
                );
            }}
        />
    );
};

// "Bedrag aanpassen" (bug 8): the card text names another amount than the line under it, and that amount
// is allowed, so one tap makes them agree.
export const IssueFix = (props: IssueFixProps) => {
    const { issue, session, editKey, card, announce } = props;
    const t = useTranslation();
    if (issue.code === 'center.on-fold') {
        return (
            <FixButton
                label={t('editor.fold_fix')}
                onClick={() => {
                    moveOffFold(props);
                    announce(t('editor.fold_fixed'));
                }}
            />
        );
    }
    if (card === undefined) {
        return null;
    }
    const text = session.edition.elements[editKey]?.text;
    // "De tekst noemt 50, en dat staat al onderaan": the amount goes into the text once (R5-11).
    if (issue.code === 'text.amount-twice') {
        const amount = card.amount;
        const once =
            text === undefined || amount === undefined
                ? null
                : amountIntoText(text, amount);

        return once === null ? null : (
            <FixButton
                label={t('editor.amount_once')}
                onClick={() => {
                    editElement(session, editKey, { text: once });
                    announce(t('editor.amount_once_done'));
                }}
            />
        );
    }
    const says = issue.data?.says;
    if (issue.code === 'text.amount-direction' && says !== undefined) {
        return <TurnFix {...props} card={card} says={says} />;
    }
    const mentioned = issue.data?.mentioned;

    return issue.code !== 'text.amount-differs' ||
        issue.data?.allowed !== true ||
        mentioned === undefined ? null : (
        <DifferFix {...props} card={card} mentioned={mentioned} />
    );
};
