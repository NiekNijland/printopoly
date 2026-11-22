import { usePage } from '@inertiajs/react';
import { useState, type ReactNode } from 'react';

import { CardTextEditor } from '@/components/editor/card-text-editor';
import { usePasteSummary } from '@/components/editor/name-row';
import { ChevronLeftIcon } from '@/components/icons';
import {
    INVITATION_HEAD,
    INVITATION_KICKER,
} from '@/components/render/invitation';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { lidExample, templateInvitation } from '@/data/templates';
import { useTranslation } from '@/hooks/use-translation';
import type { CheckIssue } from '@/lib/checks/types';
import { amountOf } from '@/lib/edition/amounts';
import {
    baselineField,
    fieldDiffers,
    templateOf,
} from '@/lib/edition/baseline';
import { cardTextContext, renderCardText } from '@/lib/edition/card-text';
import { groupColorName } from '@/lib/edition/group-names';
import {
    BOARD_CENTER_KEY,
    groupKey,
    type ElementKind,
} from '@/lib/edition/keys';
import type { ResolvedCard, ResolvedEdition } from '@/lib/edition/resolve';
import {
    MAX_LID_LINES_LENGTH,
    MAX_PURPOSE_LENGTH,
    MAX_STORY_LENGTH,
} from '@/lib/edition/schema';
import type { EditionSession } from '@/lib/edition/session';
import type {
    Edition,
    ElementField,
    ElementOverride,
} from '@/lib/edition/types';
import { MAX_CORNER_TEXT_LENGTH } from '@/lib/edition/words';
import { deckLabel } from '@/lib/editor/catalogue';
import { editElement, resetField } from '@/lib/editor/edit';
import { isNameable, pasteNames } from '@/lib/editor/name-list';
import {
    formatMoney,
    spaceAt,
    standardEdition,
} from '@/lib/game/standard-edition';
import type { Space } from '@/lib/game/types';
import { cornerOf, standardCornerText } from '@/lib/render/corners';
import { STRINGS } from '@/lib/render/strings';

import { CheckField, Field, useDraft } from './panel-parts';
import { PawnCountField } from './pawn-count-field';

interface TextSectionProps {
    session: EditionSession;
    edition: Edition;
    resolved: ResolvedEdition;
    editKey: string;
    kind: ElementKind;
    /** The space of a space or a title deed. */
    space: Space | undefined;
    card: ResolvedCard | undefined;
    issues: readonly CheckIssue[];
    /** Opens the words of the edition, where the names of the decks live. */
    onOpenWords?: () => void;
}

/** The name an element shows now, for the name field. */
/**
 * A word that lives with the whole edition (the bank, a deck name): the sentence says where it is, and a real button
 * takes you there, in the style of the panel's other buttons (designcheck ronde 5). It is 48 px high, also on touch.
 */
function WordsPointer({
    children,
    onOpenWords,
}: {
    children: ReactNode;
    onOpenWords: (() => void) | undefined;
}) {
    const t = useTranslation();

    return (
        <div className="flex flex-col items-start gap-3">
            <p className="m-0 text-sm">{children}</p>
            {onOpenWords !== undefined && (
                <Button variant="secondary" data-to-words onClick={onOpenWords}>
                    {t('editor.to_edition_words')}
                    <ChevronLeftIcon
                        size={16}
                        aria-hidden="true"
                        className="flex-none rotate-180"
                    />
                </Button>
            )}
        </div>
    );
}

function currentName(
    resolved: ResolvedEdition,
    edition: Edition,
    key: string,
): string {
    const [kind, index] = key.split('.');
    const n = Number(index);

    switch (kind) {
        case 'space':
            return resolved.spaces[n]?.name ?? '';
        case 'deed':
            return resolved.deeds?.[n - 1]?.name ?? '';
        case 'pawn':
            return resolved.pawns?.find((pawn) => pawn.index === n)?.name ?? '';
        case 'box_lid':
            return resolved.boxLid?.name ?? edition.name;
        case 'board_center':
            return resolved.boardCenter.name ?? edition.name;
        default:
            return '';
    }
}

/** The text of the invitation as the edition has it. */
function currentText(resolved: ResolvedEdition, kind: ElementKind): string {
    if (kind === 'invitation') {
        return resolved.invitation?.text ?? '';
    }

    return '';
}

/**
 * The Tekst section (B141): name and town of a street, the short text of a corner, the story of a card with
 * its standard text, the rules and the invitation. Every field that differs has a "Standaard" button (B142).
 */
export function TextSection({
    session,
    edition,
    resolved,
    editKey,
    kind,
    space,
    card,
    issues,
    onOpenWords,
}: TextSectionProps) {
    const t = useTranslation();
    const { locale } = usePage().props;
    const override: ElementOverride | undefined = edition.elements[editKey];
    const set = (patch: Partial<ElementOverride>, group: string | null) =>
        editElement(session, editKey, patch, group);
    // "Standaard" goes back to the baseline: the template the edition started from, or the standard game (B152).
    const standard = (
        field: ElementField,
        end?: () => void,
        key: string = editKey,
    ): (() => void) | undefined =>
        fieldDiffers(edition, key, field)
            ? () => {
                  end?.();
                  resetField(session, key, field);
              }
            : undefined;
    const nameDraft = useDraft(
        override?.name ?? currentName(resolved, edition, editKey),
        editKey,
    );
    const textDraft = useDraft(
        override?.text ?? currentText(resolved, kind),
        editKey,
    );
    const cornerDraft = useDraft(override?.text ?? '', editKey);
    const group =
        kind === 'space' && space?.type === 'street'
            ? standardEdition.groups.find(
                  (candidate) => candidate.id === space.group,
              )
            : undefined;
    const townKey = group === undefined ? '' : groupKey(group.id);
    const townDraft = useDraft(edition.elements[townKey]?.town ?? '', townKey);
    const subtitleDraft = useDraft(override?.subtitle ?? '', editKey);
    const purposeDraft = useDraft(override?.purpose ?? '', editKey);
    const corner =
        kind === 'space' && space !== undefined
            ? cornerOf(space.position)
            : undefined;
    const textIssues = issues.filter(
        (issue) => issue.field === 'name' || issue.field === 'text',
    );
    const pasteSummary = usePasteSummary();
    // What the last paste of several lines did, for this element only (R5 wish Lukas, B248).
    const [pasted, setPasted] = useState<{
        key: string;
        text: string;
    } | null>(null);

    const hidden = override?.subtitle === '';
    /** The line under a title, or above the invitation headline (B169): a field, and a box to switch it off. */
    const subtitleField = (
        label: string,
        placeholder: string,
        showLabel: string = t('editor.subtitle_show'),
    ) => (
        <>
            <Field
                label={label}
                onStandard={standard('subtitle', subtitleDraft.end)}
            >
                {(id) => (
                    <Input
                        id={id}
                        data-field="subtitle"
                        value={hidden ? '' : subtitleDraft.shown}
                        disabled={hidden}
                        placeholder={placeholder}
                        onBlur={subtitleDraft.end}
                        onChange={(event) => {
                            subtitleDraft.set(event.target.value);
                            set(
                                {
                                    subtitle:
                                        event.target.value === ''
                                            ? undefined
                                            : event.target.value,
                                },
                                `subtitle:${editKey}`,
                            );
                        }}
                    />
                )}
            </Field>
            <CheckField
                className="-mt-2"
                label={showLabel}
                checked={!hidden}
                onCheckedChange={(checked) =>
                    set({ subtitle: checked ? undefined : '' }, null)
                }
            />
        </>
    );
    /** A free text of a few lines: the story on a deed, the own lines on the box lid (B169). */
    const linesField = (
        label: string,
        hint: string,
        placeholder: string,
        max: number,
    ) => (
        <Field
            label={label}
            hint={hint}
            onStandard={standard('text', textDraft.end)}
        >
            {(id) => (
                <Textarea
                    id={id}
                    data-field="text"
                    rows={3}
                    maxLength={max}
                    value={textDraft.shown}
                    placeholder={placeholder}
                    aria-invalid={textIssues.length > 0}
                    onBlur={textDraft.end}
                    onChange={(event) => {
                        textDraft.set(event.target.value);
                        set(
                            {
                                text:
                                    event.target.value.trim() === ''
                                        ? undefined
                                        : event.target.value,
                            },
                            `text:${editKey}`,
                        );
                    }}
                />
            )}
        </Field>
    );

    // A list pasted in the name of a space or a pawn fills that one and the next ones of the same kind, in one undo
    // step, like a paste in a row of the list (B161, B248).
    const nameField = (label: string) => (
        <Field
            label={label}
            onStandard={standard('name', nameDraft.end)}
            hint={
                pasted?.key === editKey ? (
                    <span role="status">{pasted.text}</span>
                ) : kind === 'pawn' ? (
                    t('editor.pawn_name_paste_hint')
                ) : undefined
            }
        >
            {(id) => (
                <Input
                    id={id}
                    data-field="name"
                    value={nameDraft.shown}
                    aria-invalid={textIssues.length > 0}
                    onBlur={nameDraft.end}
                    onPaste={(event) => {
                        if (!isNameable(editKey)) {
                            return;
                        }
                        const result = pasteNames(
                            session.edition,
                            editKey,
                            event.clipboardData.getData('text/plain'),
                        );
                        if (result === null) {
                            return;
                        }
                        event.preventDefault();
                        nameDraft.end();
                        session.apply(result.changes);
                        setPasted({ key: editKey, text: pasteSummary(result) });
                    }}
                    onChange={(event) => {
                        nameDraft.set(event.target.value);
                        set(
                            {
                                name:
                                    event.target.value === ''
                                        ? undefined
                                        : event.target.value,
                            },
                            `name:${editKey}`,
                        );
                    }}
                />
            )}
        </Field>
    );

    // A Chance or Community Chest space is called after its deck: the name lives with the words of the edition.
    if (
        kind === 'space' &&
        (space?.type === 'chance' || space?.type === 'chest')
    ) {
        return (
            <WordsPointer onOpenWords={onOpenWords}>
                {t('editor.deck_space_name', {
                    name: deckLabel(edition, space.type, locale),
                })}
            </WordsPointer>
        );
    }

    if (kind === 'space' || kind === 'deed' || kind === 'pawn') {
        const count =
            group === undefined
                ? 0
                : standardEdition.spaces.filter(
                      (candidate) =>
                          candidate.type === 'street' &&
                          candidate.group === group.id,
                  ).length;

        return (
            <>
                {nameField(t('editor.name'))}
                {kind === 'pawn' && (
                    <PawnCountField session={session} edition={edition} />
                )}
                {corner !== undefined && (
                    <Field
                        label={t('words.corner_text')}
                        onStandard={standard('text', cornerDraft.end)}
                        hint={t(
                            corner === 'start'
                                ? 'words.corner_text_start'
                                : corner === 'jail'
                                  ? 'words.corner_text_jail'
                                  : 'words.corner_text_line',
                        )}
                    >
                        {(id) => (
                            <Input
                                id={id}
                                data-field="text"
                                value={cornerDraft.shown}
                                maxLength={MAX_CORNER_TEXT_LENGTH}
                                onBlur={cornerDraft.end}
                                placeholder={standardCornerText(
                                    corner,
                                    resolved.language,
                                    resolved.currency.id,
                                    resolved.words.customSymbol,
                                    amountOf(edition, spaceAt(0), 'salary'),
                                    resolved.spaces[0]?.name,
                                )}
                                onChange={(event) => {
                                    cornerDraft.set(event.target.value);
                                    set(
                                        {
                                            text:
                                                event.target.value === ''
                                                    ? undefined
                                                    : event.target.value,
                                        },
                                        `text:${editKey}`,
                                    );
                                }}
                            />
                        )}
                    </Field>
                )}
                {kind === 'deed' &&
                    linesField(
                        t('editor.deed_story'),
                        t('editor.deed_story_hint'),
                        t('editor.deed_story_placeholder'),
                        MAX_STORY_LENGTH,
                    )}
                {group !== undefined && (
                    <Field
                        label={t('editor.town')}
                        tag={t('editor.group_streets', {
                            count,
                            // "paarse straten": the colour the group is printed in (bug 27).
                            color: groupColorName(edition, group.id, locale)
                                .before,
                        })}
                        onStandard={standard('town', townDraft.end, townKey)}
                    >
                        {(id) => (
                            <Input
                                id={id}
                                data-field="town"
                                value={townDraft.shown}
                                placeholder={t('editor.town_placeholder')}
                                onBlur={townDraft.end}
                                onChange={(event) => {
                                    townDraft.set(event.target.value);
                                    editElement(
                                        session,
                                        townKey,
                                        {
                                            town:
                                                event.target.value.trim() === ''
                                                    ? undefined
                                                    : event.target.value,
                                        },
                                        `town:${group.id}`,
                                    );
                                }}
                            />
                        )}
                    </Field>
                )}
            </>
        );
    }

    if (kind === 'boxLid') {
        return (
            <>
                {nameField(t('editor.lid_title'))}
                {subtitleField(
                    t('editor.subtitle'),
                    // The board's own subtitle when it has one (B254), else the standard line.
                    edition.elements[BOARD_CENTER_KEY]?.subtitle?.trim() ||
                        STRINGS[resolved.language].boxLidSubtitle,
                )}
                {linesField(
                    t('editor.lid_lines'),
                    t('editor.lid_lines_hint'),
                    // An example in the spirit of the template, else one that fits any group (round 4, bug 25).
                    lidExample(templateOf(edition), resolved.language) ??
                        t('editor.lid_lines_placeholder'),
                    MAX_LID_LINES_LENGTH,
                )}
            </>
        );
    }

    if (kind === 'boardCenter') {
        const centre = resolved.boardCenter;

        return (
            <>
                {centre.mode === 'logo' ? (
                    <p className="m-0 text-sm text-ink-soft">
                        {t('editor.center_logo_text')}
                    </p>
                ) : (
                    <>
                        {nameField(t('editor.name'))}
                        {subtitleField(
                            t('editor.subtitle'),
                            STRINGS[locale].centerTagline,
                        )}
                    </>
                )}
            </>
        );
    }

    if (kind === 'card' && card !== undefined) {
        const lineShown = card.amount !== undefined && card.amount !== 0;
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
            <>
                <CardTextEditor
                    label={t('editor.story')}
                    value={override?.text ?? card.template}
                    amount={card.amount}
                    resolved={resolved}
                    invalid={textIssues.length > 0}
                    onStandard={card.extra ? undefined : standard('text')}
                    onChange={(text) =>
                        set(
                            { text: text === '' ? undefined : text },
                            `text:${editKey}`,
                        )
                    }
                />
                {!card.extra && (
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
                )}
                {lineShown && (
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
                                        `purpose:${editKey}`,
                                    );
                                }}
                            />
                        )}
                    </Field>
                )}
            </>
        );
    }

    // The name of the bank is a word of the whole edition (B148): it lives with the edition's words.
    if (kind === 'note') {
        return (
            <WordsPointer onOpenWords={onOpenWords}>
                {t('editor.bank_moved')}
            </WordsPointer>
        );
    }

    // The house rules may name spaces, like a card: a rule about Start follows a renamed Start (B152).
    if (kind === 'houseRules') {
        return (
            <CardTextEditor
                label={t('editor.house_rules_label')}
                value={override?.text ?? ''}
                amount={undefined}
                withAmount={false}
                hint={t('editor.house_rules_hint')}
                resolved={resolved}
                invalid={textIssues.length > 0}
                onStandard={standard('text')}
                onChange={(text) =>
                    set(
                        { text: text === '' ? undefined : text },
                        `text:${editKey}`,
                    )
                }
            />
        );
    }

    if (kind === 'invitation') {
        const fromTemplate = templateInvitation(
            templateOf(edition),
            resolved.language,
        );

        return (
            <>
                {subtitleField(
                    t('editor.invitation_kicker'),
                    fromTemplate.kicker ?? INVITATION_KICKER[resolved.language],
                    t('editor.invitation_kicker_show'),
                )}
                <Field
                    label={t('editor.invitation_headline')}
                    hint={t('editor.invitation_headline_hint')}
                    onStandard={standard('name', nameDraft.end)}
                >
                    {(id) => (
                        <Input
                            id={id}
                            data-field="name"
                            value={
                                override?.name === undefined
                                    ? ''
                                    : nameDraft.shown
                            }
                            placeholder={
                                fromTemplate.headline ??
                                INVITATION_HEAD[resolved.language]
                            }
                            onBlur={nameDraft.end}
                            onChange={(event) => {
                                nameDraft.set(event.target.value);
                                set(
                                    {
                                        name:
                                            event.target.value.trim() === ''
                                                ? undefined
                                                : event.target.value,
                                    },
                                    `name:${editKey}`,
                                );
                            }}
                        />
                    )}
                </Field>
                <Field
                    label={t('editor.invitation_label')}
                    hint={t('editor.invitation_hint')}
                    onStandard={standard('text', textDraft.end)}
                >
                    {(id) => (
                        <Textarea
                            id={id}
                            data-field="text"
                            rows={4}
                            value={textDraft.shown}
                            aria-invalid={textIssues.length > 0}
                            onBlur={textDraft.end}
                            onChange={(event) => {
                                textDraft.set(event.target.value);
                                set(
                                    {
                                        text:
                                            event.target.value === ''
                                                ? undefined
                                                : event.target.value,
                                    },
                                    `text:${editKey}`,
                                );
                            }}
                        />
                    )}
                </Field>
            </>
        );
    }

    return null;
}
