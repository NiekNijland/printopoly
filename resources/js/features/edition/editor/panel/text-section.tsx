import { usePage } from '@inertiajs/react';

import { CardTextEditor } from '@/features/edition/editor/card-text-editor';
import { CardStory } from '@/features/edition/editor/panel/card-story';
import { InvitationText } from '@/features/edition/editor/panel/invitation-text';
import { SpaceText } from '@/features/edition/editor/panel/space-text';
import {
    LinesField,
    NameField,
    SubtitleField,
    WordsPointer,
    textEdit,
} from '@/features/edition/editor/panel/text-fields';
import type { EditionSession } from '@/features/edition/session';
import { useTranslation } from '@/hooks/use-translation';
import { templateOf } from '@/lib/render/edition-baseline';
import { BOARD_CENTER_KEY } from '@/lib/render/edition-keys';
import type { ResolvedEdition } from '@/lib/render/edition-resolve';
import { MAX_LID_LINES_LENGTH } from '@/lib/render/edition-schema-limits';
import { lidExample } from '@/lib/render/edition-templates';
import type { Edition } from '@/lib/render/edition-types';
import { deckLabel } from '@/lib/render/editor-catalogue';
import { STRINGS } from '@/lib/render/strings';
import type { AmountSectionProps } from './amount-section';

type TextSectionProps = AmountSectionProps & {
    /** Opens the words of the edition, where the names of the decks live. */
    onOpenWords?: () => void;
};

/** The name an element shows now, for the name field. */
const currentName = (
    resolved: ResolvedEdition,
    edition: Edition,
    key: string,
): string => {
    const [kind, index] = key.split('.');
    const n = Number(index);

    if (kind === 'space') {
        return resolved.spaces[n]?.name ?? '';
    }
    if (kind === 'deed') {
        return resolved.deeds?.[n - 1]?.name ?? '';
    }
    if (kind === 'pawn') {
        return resolved.pawns?.find((pawn) => pawn.index === n)?.name ?? '';
    }
    if (kind === 'box_lid') {
        return resolved.boxLid?.name ?? edition.name;
    }

    return kind === 'board_center'
        ? (resolved.boardCenter.name ?? edition.name)
        : '';
};

type KindTextProps = {
    session: EditionSession;
    edition: Edition;
    editKey: string;
    resolved: ResolvedEdition;
    name: string;
    invalid: boolean;
};

const BoxLidText = ({ resolved, name, invalid, ...edit }: KindTextProps) => {
    const t = useTranslation();

    return (
        <>
            <NameField
                {...edit}
                label={t('editor.lid_title')}
                name={name}
                hint={undefined}
                invalid={invalid}
            />
            <SubtitleField
                {...edit}
                label={t('editor.subtitle')}
                placeholder={
                    // The board's own subtitle when it has one (B254), else the standard line.
                    edit.edition.elements[BOARD_CENTER_KEY]?.subtitle?.trim() ||
                    STRINGS[resolved.language].boxLidSubtitle
                }
            />
            <LinesField
                {...edit}
                label={t('editor.lid_lines')}
                hint={t('editor.lid_lines_hint')}
                placeholder={
                    // An example in the spirit of the template, else one that fits any group (round 4, bug 25).
                    lidExample(templateOf(edit.edition), resolved.language) ??
                    t('editor.lid_lines_placeholder')
                }
                max={MAX_LID_LINES_LENGTH}
                invalid={invalid}
            />
        </>
    );
};

const BoardCenterText = ({
    resolved,
    name,
    invalid,
    ...edit
}: KindTextProps) => {
    const t = useTranslation();
    const { locale } = usePage().props;

    return (
        <>
            {resolved.boardCenter.mode === 'logo' ? (
                <p className="m-0 text-sm text-ink-soft">
                    {t('editor.center_logo_text')}
                </p>
            ) : (
                <>
                    <NameField
                        {...edit}
                        label={t('editor.name')}
                        name={name}
                        hint={undefined}
                        invalid={invalid}
                    />
                    <SubtitleField
                        {...edit}
                        label={t('editor.subtitle')}
                        placeholder={STRINGS[locale].centerTagline}
                    />
                </>
            )}
        </>
    );
};

/**
 * The Tekst section (B141): name and town of a street, the short text of a corner, the story of a card with
 * its standard text, the rules and the invitation. Every field that differs has a "Standaard" button (B142).
 */
export const TextSection = ({
    session,
    edition,
    resolved,
    editKey,
    kind,
    space,
    card,
    issues,
    onOpenWords,
}: TextSectionProps) => {
    const t = useTranslation();
    const { locale } = usePage().props;
    const props: KindTextProps = {
        session,
        edition,
        editKey,
        resolved,
        name:
            edition.elements[editKey]?.name ??
            currentName(resolved, edition, editKey),
        invalid: issues.some(
            (issue) => issue.field === 'name' || issue.field === 'text',
        ),
    };
    const { set, standard } = textEdit(props);

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
        return <SpaceText {...props} kind={kind} space={space} />;
    }
    if (kind === 'boxLid') {
        return <BoxLidText {...props} />;
    }
    if (kind === 'boardCenter') {
        return <BoardCenterText {...props} />;
    }
    if (kind === 'card' && card !== undefined) {
        return <CardStory {...props} card={card} />;
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
                value={edition.elements[editKey]?.text ?? ''}
                amount={undefined}
                withAmount={false}
                hint={t('editor.house_rules_hint')}
                resolved={resolved}
                invalid={props.invalid}
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

    return kind === 'invitation' ? <InvitationText {...props} /> : null;
};
