import { Head, usePage } from '@inertiajs/react';

import { useTranslation } from '@/hooks/use-translation';
import EditorLayout from '@/layouts/editor-layout';
import { redirect as googleRedirect } from '@/routes/auth/google';

/**
 * Placeholder that shows the editor shell. The editor itself (B93) replaces
 * the content; the edition will come from the browser or the server (B78).
 */
export default function EditorShow() {
    const { auth } = usePage().props;
    const t = useTranslation();
    const editionName = t('editor.untitled');

    const saveStatus = (
        <>
            {t('editor.saved_in_browser')}
            {auth.user === null && auth.googleLoginEnabled && (
                <>
                    {' · '}
                    <a href={googleRedirect().url} className="font-semibold">
                        {t('auth.login_with_google')}
                    </a>
                </>
            )}
        </>
    );

    return (
        <EditorLayout editionName={editionName} saveStatus={saveStatus}>
            <Head title={editionName} />
            <p className="m-0 p-8 text-ink-soft">{t('editor.placeholder')}</p>
        </EditorLayout>
    );
}
