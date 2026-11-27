import { usePage } from '@inertiajs/react';
import { partQuantity, withSetTotal } from '@/features/print/estimate';
import { PartChoice } from '@/features/print/part-choice';
import { PartRow } from '@/features/print/part-row';
import { specOf, moneyNoteOf } from '@/features/print/part-spec';
import { formatCm } from '@/features/print/print-format';
import type { PrintPage } from '@/features/print/use-print-page';
import { useTranslation, useTranslationChoice } from '@/hooks/use-translation';
import { hasHouseRulesCard } from '@/lib/render/print-composition';
import { inPrintSelection, type SetPart } from '@/lib/render/print-selection';

export const usePageText = () => ({
    t: useTranslation(),
    tc: useTranslationChoice(),
    guide: usePage().props.pageUrls.printGuide,
});

export const SetPartRow = ({
    page,
    askedPart,
    part,
    index,
}: {
    page: PrintPage;
    askedPart: SetPart | null;
    part: SetPart;
    index: number;
}) => {
    const text = usePageText();
    const { set, choice, drawn, requests: r, cardCount, counted } = page;
    const { t } = text;
    const spec = { ...page, ...text, part };

    return (
        <PartRow
            set={set}
            part={part}
            row={r.rowFor(part, set)}
            included={inPrintSelection(page.selection, part)}
            locked={part === 'board'}
            asked={askedPart === part}
            guideHref={`${text.guide}#part-${part}`}
            onToggle={() => {
                page.togglePart(part);
            }}
            onMake={() => {
                r.request(set, [part]);
            }}
            queued={r.isQueued(set, part)}
            onUnqueue={() => {
                r.remove(set, part);
            }}
            disabled={page.job === null && (r.working || page.reusing)}
            cards={cardCount}
            edition={drawn}
            photos={page.photos}
            index={index}
            spec={withSetTotal(
                specOf(spec) ??
                    t(`print.spec.${set}.${part}`, { cards: cardCount }),
                part,
                partQuantity(part, set, counted),
                choice.copies,
                t,
            )}
            {...(part === 'board' && page.boardForm === 'whole'
                ? { order: t('print.order.printer.board_whole') }
                : {})}
            {...(part === 'cards' && hasHouseRulesCard(drawn)
                ? { note: t('print.house_rules_line') }
                : {})}
        >
            {part === 'money' ||
            (part === 'board' && set === 'printer') ||
            part === 'invitation' ? (
                <PartChoice
                    part={part}
                    set={set}
                    choice={choice}
                    moneyNote={moneyNoteOf(spec, page.pawnsInSet)}
                    boardSize={formatCm(drawn.boardProfile.outer, page.locale)}
                    active={(of) => r.isActive(of, set)}
                    onChoose={(change) => {
                        page.choose(set, change);
                    }}
                />
            ) : undefined}
        </PartRow>
    );
};

export const CalibrationRow = ({ page }: { page: PrintPage }) => {
    const { guide } = usePageText();
    const { set, job, requests: r } = page;

    return (
        <PartRow
            set={set}
            part="calibration"
            variant="trial"
            row={r.rowFor('calibration', 'home')}
            included={null}
            guideHref={`${guide}#part-calibration`}
            onToggle={() => undefined}
            onMake={() => {
                r.request(set, ['calibration']);
            }}
            queued={r.isQueued('home', 'calibration')}
            onUnqueue={() => {
                r.remove('home', 'calibration');
            }}
            disabled={job === null && (r.working || page.reusing)}
            cards={page.cardCount}
            edition={page.drawn}
            photos={page.photos}
        />
    );
};
