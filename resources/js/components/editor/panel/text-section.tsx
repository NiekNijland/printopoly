import { usePage } from '@inertiajs/react';

import { CardTextEditor } from '@/components/editor/card-text-editor';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';
import type { CheckIssue } from '@/lib/checks/types';
import { amountOf } from '@/lib/edition/amounts';
import { baselineField, fieldDiffers } from '@/lib/edition/baseline';
import { cardTextContext, renderCardText } from '@/lib/edition/card-text';
import { groupColorName } from '@/lib/edition/group-names';
import { groupKey, type ElementKind } from '@/lib/edition/keys';
import type { ResolvedCard, ResolvedEdition } from '@/lib/edition/resolve';
import { MAX_PURPOSE_LENGTH } from '@/lib/edition/schema';
import type { EditionSession } from '@/lib/edition/session';
import type {
    Edition,
    ElementField,
    ElementOverride,
} from '@/lib/edition/types';
import { MAX_CORNER_TEXT_LENGTH } from '@/lib/edition/words';
import { deckLabel } from '@/lib/editor/catalogue';
import { editElement, resetField } from '@/lib/editor/edit';
import { spaceAt, standardEdition } from '@/lib/game/standard-edition';
import type { Space } from '@/lib/game/types';
import { cornerOf, standardCornerText } from '@/lib/render/corners';
import { STRINGS } from '@/lib/render/strings';

import { Field, useDraft } from './panel-parts';

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

    const nameField = (label: string) => (
        <Field label={label} onStandard={standard('name', nameDraft.end)}>
            {(id) => (
                <Input
                    id={id}
                    data-field="name"
                    value={nameDraft.shown}
                    aria-invalid={textIssues.length > 0}
                    onBlur={nameDraft.end}
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
            <p className="m-0 text-sm">
                {t('editor.deck_space_name', {
                    name: deckLabel(edition, space.type, locale),
                })}{' '}
                {onOpenWords !== undefined && (
                    <button
                        type="button"
                        onClick={onOpenWords}
                        className="cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold underline underline-offset-4"
                    >
                        {t('editor.to_edition_words')}
                    </button>
                )}
            </p>
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
        return <>{nameField(t('editor.title'))}</>;
    }

    if (kind === 'boardCenter') {
        const centre = resolved.boardCenter;
        const hidden = override?.subtitle === '';

        return (
            <>
                {centre.mode === 'logo' ? (
                    <p className="m-0 text-sm text-ink-soft">
                        {t('editor.center_logo_text')}
                    </p>
                ) : (
                    <>
                        {nameField(t('editor.name'))}
                        <Field
                            label={t('editor.subtitle')}
                            onStandard={standard('subtitle', subtitleDraft.end)}
                        >
                            {(id) => (
                                <Input
                                    id={id}
                                    data-field="subtitle"
                                    value={hidden ? '' : subtitleDraft.shown}
                                    disabled={hidden}
                                    placeholder={STRINGS[locale].centerTagline}
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
                        <label className="flex min-h-11 items-center gap-2 text-base">
                            <input
                                type="checkbox"
                                className="size-5 accent-ink"
                                checked={!hidden}
                                onChange={(event) =>
                                    set(
                                        {
                                            subtitle: event.target.checked
                                                ? undefined
                                                : '',
                                        },
                                        null,
                                    )
                                }
                            />
                            {t('editor.subtitle_show')}
                        </label>
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
                    <details className="group -mt-2 text-sm">
                        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-semibold [&::-webkit-details-marker]:hidden">
                            <span
                                aria-hidden="true"
                                className="inline-block transition-transform group-open:rotate-90 motion-reduce:transition-none"
                            >
                                ›
                            </span>
                            <span className="underline underline-offset-4">
                                {t('editor.standard_text')}
                            </span>
                        </summary>
                        <div className="flex flex-col gap-1 rounded-control bg-paper p-3">
                            <span>{standardText}</span>
                            <span className="text-ink-soft">
                                {t('editor.standard_effect')}: {card.effect}
                            </span>
                        </div>
                    </details>
                )}
                {lineShown && (
                    <Field
                        label={t('editor.purpose')}
                        hint={t('editor.purpose_hint')}
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
            <p className="m-0 text-sm">
                {t('editor.bank_moved')}{' '}
                {onOpenWords !== undefined && (
                    <button
                        type="button"
                        onClick={onOpenWords}
                        className="cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold underline underline-offset-4"
                    >
                        {t('editor.to_edition_words')}
                    </button>
                )}
            </p>
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
        return (
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
        );
    }

    return null;
}
