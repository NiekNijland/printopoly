import {
    INVITATION_HEAD,
    INVITATION_KICKER,
} from '@/components/render/invitation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, useDraft } from '@/features/edition/editor/panel/panel-parts';
import {
    SubtitleField,
    textEdit,
    type TextEdit,
} from '@/features/edition/editor/panel/text-fields';
import { useTranslation } from '@/hooks/use-translation';
import { templateOf } from '@/lib/render/edition-baseline';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import { templateInvitation } from '@/lib/render/edition-templates';

const InvitationBody = ({
    initial,
    invalid,
    ...edit
}: TextEdit & { initial: string; invalid: boolean }) => {
    const t = useTranslation();
    const { editKey } = edit;
    const { set, standard } = textEdit(edit);
    const textDraft = useDraft(initial, editKey);

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
                    aria-invalid={invalid}
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
};

export const InvitationText = ({
    resolved,
    name,
    invalid,
    ...edit
}: TextEdit & {
    resolved: ResolvedEdition;
    name: string;
    invalid: boolean;
}) => {
    const t = useTranslation();
    const { edition, editKey } = edit;
    const override = edition.elements[editKey];
    const { set, standard } = textEdit(edit);
    const nameDraft = useDraft(name, editKey);
    const fromTemplate = templateInvitation(
        templateOf(edition),
        resolved.language,
    );

    return (
        <>
            <SubtitleField
                {...edit}
                label={t('editor.invitation_kicker')}
                placeholder={
                    fromTemplate.kicker ?? INVITATION_KICKER[resolved.language]
                }
                showLabel={t('editor.invitation_kicker_show')}
            />
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
                            override?.name === undefined ? '' : nameDraft.shown
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
            <InvitationBody
                {...edit}
                initial={override?.text ?? resolved.invitation?.text ?? ''}
                invalid={invalid}
            />
        </>
    );
};
