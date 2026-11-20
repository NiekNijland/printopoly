import { cn } from '@/lib/utils';

interface ProseProps {
    /** HTML rendered on the server from our own content files. */
    html: string;
    className?: string;
}

/** Long-form text from a markdown content file, styled in app.css. */
export function Prose({ html, className }: ProseProps) {
    if (html === '') {
        return null;
    }

    return (
        <div
            className={cn('prose-content', className)}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
