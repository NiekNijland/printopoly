import type { ReactNode } from 'react';

import { EditorHeader } from '@/features/edition/editor/editor-header';
import type { EditorHeaderProps } from '@/features/edition/editor/editor-header';
import { useVisualViewport } from '@/hooks/use-visual-viewport';

type EditorLayoutProps = EditorHeaderProps & {
    children: ReactNode;
};

/**
 * The full-height editor shell: the compact header, then the workspace on the
 * table colour (Editor.dc.html). Editor pages render it themselves because the
 * header needs the edition; they are client-rendered only (B66).
 */
const EditorLayout = ({ children, ...header }: EditorLayoutProps) => {
    const { height, keyboardOpen } = useVisualViewport();

    return (
        <div
            className="flex h-dvh flex-col bg-table text-ink"
            style={height === null ? undefined : { height }}
            data-keyboard={keyboardOpen ? 'open' : undefined}
        >
            <EditorHeader {...header} />
            {/* Only the columns scroll, never the page around them: a focus deep in a column scrolled `main` up
                and left a beige band at the bottom (bug 12, ronde 3). `clip` is not a scroll container at all, so
                not even a focus can move it. */}
            <main id="content" className="min-h-0 flex-1 overflow-clip">
                {children}
            </main>
        </div>
    );
};
export default EditorLayout;
