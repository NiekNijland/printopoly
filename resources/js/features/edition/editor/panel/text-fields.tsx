import { useState, type ReactNode } from 'react';

import { ChevronLeftIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { editElement, resetField } from '@/features/edition/editor/edit';
import { isNameable, pasteNames } from '@/features/edition/editor/name-list';
import { usePasteSummary } from '@/features/edition/editor/name-row';
import {
    CheckField,
    Field,
    useDraft,
} from '@/features/edition/editor/panel/panel-parts';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import { baselineOf, fieldDiffers } from '@/lib/render/edition-baseline';
import { spaceNameOf } from '@/lib/render/edition-card-text';
import type {
    Edition,
    ElementField,
    ElementOverride,
} from '@/lib/render/edition-types';
import { isNamedSpaceKey } from '@/lib/render/editor-clear-names';

export type TextEdit = {
    session: EditionSession;
    edition: Edition;
    editKey: string;
};

export const textEdit = ({ session, edition, editKey }: TextEdit) => ({
    set: (patch: Partial<ElementOverride>, group: string | null) =>
        editElement(session, editKey, patch, group),
    // "Standaard" goes back to the baseline: the template the edition started from, or the standard game (B152).
    standard: (
        field: ElementField,
        end?: () => void,
        key: string = editKey,
    ): (() => void) | undefined =>
        fieldDiffers(edition, key, field)
            ? () => {
                  end?.();
                  resetField(session, key, field);
              }
            : undefined,
});

/**
 * A word that lives with the whole edition (the bank, a deck name): the sentence says where it is, and a real button
 * takes you there, in the style of the panel's other buttons (designcheck ronde 5). It is 48 px high, also on touch.
 */
export const WordsPointer = ({
    children,
    onOpenWords,
}: {
    children: ReactNode;
    onOpenWords: (() => void) | undefined;
}) => {
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
};

/** The line under a title, or above the invitation headline (B169): a field, and a box to switch it off. */
export const SubtitleField = ({
    label,
    placeholder,
    showLabel,
    ...edit
}: TextEdit & {
    label: string;
    placeholder: string;
    showLabel?: string;
}) => {
    const t = useTranslation();
    const { set, standard } = textEdit(edit);
    const subtitle = edit.edition.elements[edit.editKey]?.subtitle;
    const subtitleDraft = useDraft(subtitle ?? '', edit.editKey);
    const hidden = subtitle === '';

    return (
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
                                `subtitle:${edit.editKey}`,
                            );
                        }}
                    />
                )}
            </Field>
            <CheckField
                className="-mt-2"
                label={showLabel ?? t('editor.subtitle_show')}
                checked={!hidden}
                onCheckedChange={(checked) =>
                    set({ subtitle: checked ? undefined : '' }, null)
                }
            />
        </>
    );
};

/** A free text of a few lines: the story on a deed, the own lines on the box lid (B169). */
export const LinesField = ({
    label,
    hint,
    placeholder,
    max,
    invalid,
    ...edit
}: TextEdit & {
    label: string;
    hint: string;
    placeholder: string;
    max: number;
    invalid: boolean;
}) => {
    const { set, standard } = textEdit(edit);
    const textDraft = useDraft(
        edit.edition.elements[edit.editKey]?.text ?? '',
        edit.editKey,
    );

    return (
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
                    aria-invalid={invalid}
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
                            `text:${edit.editKey}`,
                        );
                    }}
                />
            )}
        </Field>
    );
};

// A list pasted in the name of a space or a pawn fills that one and the next ones of the same kind, in one undo
// step, like a paste in a row of the list (B161, B248).
// A street, station or utility you empty stays empty, with the name it would have had in grey (B258).
const namePlaceholderOf = (
    edition: Edition,
    editKey: string,
): string | undefined =>
    isNamedSpaceKey(editKey)
        ? spaceNameOf(
              {
                  elements: baselineOf(edition).elements,
                  language: edition.language,
              },
              Number(editKey.slice('space.'.length)),
          )
        : undefined;

export const NameField = ({
    label,
    name,
    hint,
    invalid,
    ...edit
}: TextEdit & {
    label: string;
    name: string;
    hint: string | undefined;
    invalid: boolean;
}) => {
    const { session, editKey } = edit;
    const { set, standard } = textEdit(edit);
    const nameDraft = useDraft(name, editKey);
    const keepsEmpty = isNamedSpaceKey(editKey);
    const pasteSummary = usePasteSummary();
    // What the last paste of several lines did, for this element only (R5 wish Lukas, B248).
    const [pasted, setPasted] = useState<{
        key: string;
        text: string;
    } | null>(null);

    return (
        <Field
            label={label}
            onStandard={standard('name', nameDraft.end)}
            hint={
                pasted?.key === editKey ? (
                    <span role="status">{pasted.text}</span>
                ) : (
                    hint
                )
            }
        >
            {(id) => (
                <Input
                    id={id}
                    data-field="name"
                    value={nameDraft.shown}
                    placeholder={namePlaceholderOf(edit.edition, editKey)}
                    aria-invalid={invalid}
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
                                        ? keepsEmpty
                                            ? ''
                                            : undefined
                                        : event.target.value,
                            },
                            `name:${editKey}`,
                        );
                    }}
                />
            )}
        </Field>
    );
};
