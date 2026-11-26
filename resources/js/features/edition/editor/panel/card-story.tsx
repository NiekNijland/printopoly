import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { CardTextEditor } from '@/features/edition/editor/card-text-editor';
import { Field, useDraft } from '@/features/edition/editor/panel/panel-parts';
import {
    textEdit,
    type TextEdit,
} from '@/features/edition/editor/panel/text-fields';
import { useTranslation } from '@/hooks/use-translation';
import { baselineField } from '@/lib/render/edition-baseline';
import {
    cardTextContext,
    renderCardText,
} from '@/lib/render/edition-card-text';
import type {
    ResolvedCard,
    ResolvedEdition,
} from '@/lib/render/edition-resolve';
import { MAX_PURPOSE_LENGTH } from '@/lib/render/edition-schema';
import { formatMoney } from '@/lib/render/standard-edition';

type CardStoryProps = TextEdit & {
    card: ResolvedCard;
    resolved: ResolvedEdition;
    invalid: boolean;
};

const StandardText = ({ card, resolved, edition, editKey }: CardStoryProps) => {
    const t = useTranslation();
    // The text of the template when the edition started from one (B152), else the text of the standard card.
    const templateText = baselineField(edition, editKey, 'text');
    const standardText =
        templateText === undefined
            ? card.originalText
            : renderCardText(
                  templateText,
                  cardTextContext(
                      edition,
                      card.amount,
                      resolved.words.customSymbol,
                      resolved.words,
                  ),
              );

    return (
        <Collapsible className="group -mt-2 text-sm">
            <CollapsibleTrigger className="flex min-h-11 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-sm font-semibold text-ink">
                <span
                    aria-hidden="true"
                    className="inline-block transition-transform group-data-[state=open]:rotate-90 motion-reduce:transition-none"
                >
                    ›
                </span>
                <span className="underline underline-offset-4">
                    {t('editor.standard_text')}
                </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-1 rounded-control bg-paper p-3">
                <span>{standardText}</span>
                <span className="text-ink-soft">
                    {t('editor.standard_effect')}: {card.effect}
                </span>
            </CollapsibleContent>
        </Collapsible>
    );
};

const PurposeField = ({ resolved, ...edit }: CardStoryProps) => {
    const t = useTranslation();
    const { set, standard } = textEdit(edit);
    const purposeDraft = useDraft(
        edit.edition.elements[edit.editKey]?.purpose ?? '',
        edit.editKey,
    );

    return (
        <Field
            label={t('editor.purpose')}
            hint={t('editor.purpose_hint', {
                money: formatMoney(
                    50,
                    resolved.currency.id,
                    resolved.language,
                    resolved.words.customSymbol,
                ),
            })}
            onStandard={standard('purpose', purposeDraft.end)}
        >
            {(id) => (
                <Input
                    id={id}
                    data-field="purpose"
                    value={purposeDraft.shown}
                    maxLength={MAX_PURPOSE_LENGTH}
                    placeholder={t('editor.purpose_placeholder')}
                    onBlur={purposeDraft.end}
                    onChange={(event) => {
                        purposeDraft.set(event.target.value);
                        set(
                            {
                                purpose:
                                    event.target.value.trim() === ''
                                        ? undefined
                                        : event.target.value,
                            },
                            `purpose:${edit.editKey}`,
                        );
                    }}
                />
            )}
        </Field>
    );
};

export const CardStory = (props: CardStoryProps) => {
    const { card, resolved, invalid, edition, editKey } = props;
    const t = useTranslation();
    const { set, standard } = textEdit(props);
    const lineShown = card.amount !== undefined && card.amount !== 0;

    return (
        <>
            <CardTextEditor
                label={t('editor.story')}
                value={edition.elements[editKey]?.text ?? card.template}
                amount={card.amount}
                resolved={resolved}
                invalid={invalid}
                onStandard={card.extra ? undefined : standard('text')}
                onChange={(text) =>
                    set(
                        { text: text === '' ? undefined : text },
                        `text:${editKey}`,
                    )
                }
            />
            {!card.extra && <StandardText {...props} />}
            {lineShown && <PurposeField {...props} />}
        </>
    );
};
