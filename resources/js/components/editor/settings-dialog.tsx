import { useState } from 'react';

import {
    EditionFields,
    type EditionFieldsProps,
} from '@/components/editions/edition-fields';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/hooks/use-translation';
import type { EditionSession } from '@/lib/edition/session';
import {
    changeBoardProfile,
    changeCurrency,
    changeLanguage,
    changeTheme,
    rename,
    setPart,
} from '@/lib/edition/settings';
import type { Edition } from '@/lib/edition/types';
import type { Locale } from '@/lib/game/types';

interface SettingsDialogProps {
    session: EditionSession;
    edition: Edition;
    interfaceLanguage: Locale;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Settings of an edition (Staten "Instellingen van een editie", B91): the same fields as a new
 * edition, applied at once, each with a sentence about what changed.
 */
export function SettingsDialog({
    session,
    edition,
    interfaceLanguage,
    open,
    onOpenChange,
}: SettingsDialogProps) {
    const t = useTranslation();
    const [notes, setNotes] = useState<
        NonNullable<EditionFieldsProps['notes']>
    >({});
    const [name, setName] = useState(edition.name);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogTitle>
                    {t('editor.settings_of', { name: edition.name })}
                </DialogTitle>
                <DialogDescription>
                    {t('editor.settings_hint')}
                </DialogDescription>
                <div className="mt-6">
                    <EditionFields
                        idPrefix="settings"
                        interfaceLanguage={interfaceLanguage}
                        notes={notes}
                        values={{
                            name,
                            language: edition.language,
                            currency: edition.currency,
                            theme: edition.theme,
                            parts: edition.parts,
                            boardProfile: edition.boardProfile,
                        }}
                        onName={(value) => {
                            setName(value);
                            if (value.trim() !== '') {
                                session.replace(rename(session.edition, value));
                            }
                        }}
                        onLanguage={(language) => {
                            const change = changeLanguage(
                                session.edition,
                                language,
                                interfaceLanguage,
                            );
                            session.applySettings(change);
                            setNotes({ ...notes, language: change.summary });
                        }}
                        onCurrency={(currency) =>
                            session.replace(
                                changeCurrency(session.edition, currency),
                            )
                        }
                        onTheme={(theme) => {
                            const change = changeTheme(
                                session.edition,
                                theme,
                                interfaceLanguage,
                            );
                            session.applySettings(change);
                            setNotes({ ...notes, theme: change.summary });
                        }}
                        onPart={(part, on) => {
                            const change = setPart(
                                session.edition,
                                part,
                                on,
                                interfaceLanguage,
                            );
                            session.applySettings(change);
                            setNotes({ ...notes, parts: change.summary });
                        }}
                        onProfile={(profile) => {
                            const change = changeBoardProfile(
                                session.edition,
                                profile,
                                interfaceLanguage,
                            );
                            session.applySettings(change);
                            setNotes({ ...notes, profile: change.summary });
                        }}
                    />
                </div>
                <div className="mt-6 flex justify-end">
                    <DialogClose asChild>
                        <Button>{t('app.done')}</Button>
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    );
}
