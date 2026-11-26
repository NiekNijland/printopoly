import { Head, Link, usePage } from '@inertiajs/react';

import { Button } from '@/components/ui/button';
import { EditorWorkspace } from '@/features/edition/editor/editor-workspace';
import { useEditionSession } from '@/features/edition/use-edition-session';
import { useTranslation } from '@/hooks/use-translation';
import { index as editionsIndex } from '@/routes/editions';

interface EditorShowProps {
    editionId: string;
}

const Message = ({ title, body }: { title: string; body?: string }) => {
    const { locale } = usePage().props;
    const t = useTranslation();

    return (
        <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-table p-8 text-center">
            <Head title={title} />
            <h1 className="m-0 font-display text-2xl font-extrabold">
                {title}
            </h1>
            {body !== undefined && <p className="m-0 text-ink-soft">{body}</p>}
            <Button asChild>
                <Link href={editionsIndex(locale)}>
                    {t('editor.back_to_editions')}
                </Link>
            </Button>
        </main>
    );
};

/**
 * The editor page (B73). The edition comes from this browser's storage, so the page renders on
 * the client only (B66). Editions that do not exist here get a short message instead.
 */
const EditorShow = ({ editionId }: EditorShowProps) => {
    const t = useTranslation();
    const state = useEditionSession(editionId);

    if (state.status === 'loading') {
        return (
            <main className="flex min-h-dvh items-center justify-center bg-table">
                <p role="status" className="m-0 text-ink-soft">
                    {t('editions.loading')}
                </p>
            </main>
        );
    }
    if (state.status === 'missing') {
        return (
            <Message
                title={t('editor.missing_title')}
                body={t('editor.missing_body')}
            />
        );
    }
    if (state.status === 'error') {
        return <Message title={t('editor.open_failed')} />;
    }

    return (
        <>
            <Head title={state.session.edition.name} />
            <EditorWorkspace session={state.session} />
        </>
    );
};
export default EditorShow;
