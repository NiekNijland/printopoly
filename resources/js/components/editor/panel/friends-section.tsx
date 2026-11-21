import { useContributionPhoto } from '@/components/editor/collect-contribution';
import { Button } from '@/components/ui/button';
import type { ContributionDecision } from '@/hooks/use-contribution-decision';
import { useTranslation } from '@/hooks/use-translation';
import type { BoxContributionData } from '@/lib/boxes/types';

export interface FriendsProps {
    /** What friends sent for this element (B128), oldest first. */
    contributions: readonly BoxContributionData[];
    decision: ContributionDecision;
    secret: string | null;
    busy: boolean;
}

/** One contribution: who, what they propose, and the two decisions. */
function Contribution({
    contribution,
    decision,
    secret,
    busy,
}: {
    contribution: BoxContributionData;
} & Omit<FriendsProps, 'contributions'>) {
    const t = useTranslation();
    const photo = useContributionPhoto(contribution, secret);
    const working = decision.working === contribution.id;
    const disabled = decision.working !== null || busy;
    const suggestion =
        contribution.value === null || contribution.value === ''
            ? null
            : contribution.value;

    return (
        <li
            data-contribution={contribution.id}
            className="flex flex-col gap-3 rounded-control border-2 border-ink bg-paper p-3"
        >
            <div className="flex items-start gap-3">
                {contribution.hasPhoto && (
                    <span className="size-14 shrink-0 overflow-hidden rounded-control border-2 border-ink bg-table">
                        {photo !== null && (
                            <img
                                src={photo}
                                alt=""
                                className="size-full object-cover"
                            />
                        )}
                    </span>
                )}
                <p className="m-0 min-w-0 flex-1 text-sm break-words">
                    <strong>{contribution.firstName}</strong>
                    {suggestion !== null
                        ? `: “${suggestion}”`
                        : ` ${t('editor.friends_photo')}`}
                    {suggestion !== null && contribution.hasPhoto && (
                        <span className="block text-ink-soft">
                            {t('collect.photo_attached')}
                        </span>
                    )}
                </p>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button
                    variant="secondary"
                    disabled={disabled}
                    onClick={() => void decision.decide(contribution, 'accept')}
                >
                    {working ? t('collect.working') : t('collect.accept')}
                </Button>
                <Button
                    variant="ghost"
                    className="underline underline-offset-4"
                    disabled={disabled}
                    onClick={() => void decision.decide(contribution, 'reject')}
                >
                    {t('collect.reject')}
                </Button>
            </div>
        </li>
    );
}

/**
 * "Van vrienden" (B128, §3.3): the last section of an element, only when friends sent something for it.
 * Toepassen fills the field above and the preview shows it at once.
 */
export function FriendsSection({
    contributions,
    decision,
    secret,
    busy,
}: FriendsProps) {
    return (
        <>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {contributions.map((contribution) => (
                    <Contribution
                        key={contribution.id}
                        contribution={contribution}
                        decision={decision}
                        secret={secret}
                        busy={busy}
                    />
                ))}
            </ul>
            {decision.problem !== null && (
                <p
                    role="alert"
                    className="m-0 text-sm font-semibold text-press"
                >
                    {decision.problem}
                </p>
            )}
        </>
    );
}
