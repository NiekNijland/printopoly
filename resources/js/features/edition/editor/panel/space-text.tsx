import { usePage } from '@inertiajs/react';

import { Input } from '@/components/ui/input';
import { editElement } from '@/features/edition/editor/edit';
import { Field, useDraft } from '@/features/edition/editor/panel/panel-parts';
import { PawnCountField } from '@/features/edition/editor/panel/pawn-count-field';
import {
    LinesField,
    NameField,
    textEdit,
    type TextEdit,
} from '@/features/edition/editor/panel/text-fields';
import { useTranslation } from '@/hooks/use-translation';
import { cornerOf, standardCornerText } from '@/lib/render/corners';
import { amountOf } from '@/lib/render/edition-amounts';
import { groupColorName } from '@/lib/render/edition-group-names';
import { groupKey, type ElementKind } from '@/lib/render/edition-keys';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import { MAX_STORY_LENGTH } from '@/lib/render/edition-schema';
import { MAX_CORNER_TEXT_LENGTH } from '@/lib/render/edition-words';
import { spaceAt, standardEdition } from '@/lib/render/standard-edition';
import type { Space } from '@/types/game';

type Corner = NonNullable<ReturnType<typeof cornerOf>>;

const CornerField = ({
    corner,
    resolved,
    ...edit
}: TextEdit & { corner: Corner; resolved: ResolvedEdition }) => {
    const t = useTranslation();
    const { set, standard } = textEdit(edit);
    const { edition, editKey } = edit;
    const cornerDraft = useDraft(
        edition.elements[editKey]?.text ?? '',
        editKey,
    );

    return (
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
    );
};

type Group = (typeof standardEdition.groups)[number];

const TownField = ({ group, ...edit }: TextEdit & { group: Group }) => {
    const t = useTranslation();
    const { locale } = usePage().props;
    const { session, edition } = edit;
    const { standard } = textEdit(edit);
    const townKey = groupKey(group.id);
    const townDraft = useDraft(edition.elements[townKey]?.town ?? '', townKey);
    const count = standardEdition.spaces.filter(
        (candidate) =>
            candidate.type === 'street' && candidate.group === group.id,
    ).length;

    return (
        <Field
            label={t('editor.town')}
            tag={t('editor.group_streets', {
                count,
                // "paarse straten": the colour the group is printed in (bug 27).
                color: groupColorName(edition, group.id, locale).before,
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
    );
};

export const SpaceText = ({
    kind,
    space,
    name,
    invalid,
    resolved,
    ...edit
}: TextEdit & {
    kind: ElementKind;
    space: Space | undefined;
    name: string;
    invalid: boolean;
    resolved: ResolvedEdition;
}) => {
    const t = useTranslation();
    const group =
        kind === 'space' && space?.type === 'street'
            ? standardEdition.groups.find(
                  (candidate) => candidate.id === space.group,
              )
            : undefined;
    const corner =
        kind === 'space' && space !== undefined
            ? cornerOf(space.position)
            : undefined;

    return (
        <>
            <NameField
                {...edit}
                label={t('editor.name')}
                name={name}
                invalid={invalid}
                hint={
                    kind === 'pawn'
                        ? t('editor.pawn_name_paste_hint')
                        : corner === 'jail'
                          ? t('editor.jail_name_hint')
                          : undefined
                }
            />
            {kind === 'pawn' && (
                <PawnCountField session={edit.session} edition={edit.edition} />
            )}
            {corner !== undefined && (
                <CornerField {...edit} corner={corner} resolved={resolved} />
            )}
            {kind === 'deed' && (
                <LinesField
                    {...edit}
                    label={t('editor.deed_story')}
                    hint={t('editor.deed_story_hint')}
                    placeholder={t('editor.deed_story_placeholder')}
                    max={MAX_STORY_LENGTH}
                    invalid={invalid}
                />
            )}
            {group !== undefined && <TownField {...edit} group={group} />}
        </>
    );
};
