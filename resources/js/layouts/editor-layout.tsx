import type { ReactNode } from 'react';

import { EditorHeader } from '@/components/editor-header';
import type { EditorHeaderProps } from '@/components/editor-header';

type EditorLayoutProps = EditorHeaderProps & {
    children: ReactNode;
};

/**
 * The full-height editor shell: the compact header, then the workspace on the
 * table colour (Editor.dc.html). Editor pages render it themselves because the
 * header needs the edition; they are client-rendered only (B66).
 */
export default function EditorLayout({
    children,
    ...header
}: EditorLayoutProps) {
    return (
        <div className="flex h-dvh flex-col bg-table text-ink">
            <EditorHeader {...header} />
            <main id="content" className="min-h-0 flex-1 overflow-auto">
                {children}
            </main>
        </div>
    );
}
