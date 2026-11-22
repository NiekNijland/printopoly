import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

/** One file of the set: where to fetch it, and its name when the server does not give one. */
export interface ShareFile {
    url: string;
    name: string;
    /** The type when the server sends none; a PDF unless said otherwise (the invitation is a PNG, R6 Sara). */
    type?: string;
}

/**
 * Whether this browser can hand files to another app (Web Share with files). An Android phone can, and that is
 * where a ZIP does not open (R5-30, Gerda).
 */
export function canShareFiles(): boolean {
    if (
        typeof navigator === 'undefined' ||
        typeof navigator.canShare !== 'function' ||
        typeof File === 'undefined'
    ) {
        return false;
    }

    try {
        return navigator.canShare({
            files: [new File([''], 'set.pdf', { type: 'application/pdf' })],
        });
    } catch {
        return false;
    }
}

/** The file name the server sends (`attachment; filename="…"`), else the fallback. */
function fileNameOf(disposition: string | null, fallback: string): string {
    if (disposition === null) {
        return fallback;
    }

    const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
    if (encoded !== undefined) {
        try {
            return decodeURIComponent(encoded.trim());
        } catch {
            // A broken name falls through to the plain one.
        }
    }

    const plain = /filename="?([^";]+)"?/i.exec(disposition)?.[1];

    return plain === undefined ? fallback : plain.trim();
}

type State = 'idle' | 'fetching' | 'ready' | 'failed';

/**
 * "Alles delen" (R5-30): on a phone the files of the set go one by one to another app (WhatsApp, mail, Drive)
 * with the share sheet of the phone, in place of a ZIP that Android does not open. The PDFs are fetched first;
 * when that took so long that the phone no longer counts it as a tap, the button asks for one more ("Nu delen").
 */
export function ShareSetButton({
    files,
    title,
    short = false,
    variant = 'primary',
    label: ownLabel,
    className,
}: {
    files: readonly ShareFile[];
    title: string;
    /** A small phone: "Delen", so the button fits beside the number of sets and the ZIP. */
    short?: boolean;
    /** The big button of the bar, or a button of one row (the picture of the invitation, R6 Sara). */
    variant?: 'primary' | 'secondary';
    /** The name for the screen reader, such as "Plaatje delen: Uitnodiging". */
    label?: string;
    className?: string;
}) {
    const t = useTranslation();
    const [state, setState] = useState<State>('idle');
    const [ready, setReady] = useState<File[]>([]);

    async function share(toShare: File[]): Promise<void> {
        try {
            await navigator.share({ files: toShare, title });
            setState('idle');
            setReady([]);
        } catch (caught) {
            // The person closed the share sheet: nothing to say.
            if (
                caught instanceof DOMException &&
                caught.name === 'AbortError'
            ) {
                setState('idle');

                return;
            }
            // Fetching took too long for the tap to count: one more tap shares the files that are ready.
            if (
                caught instanceof DOMException &&
                caught.name === 'NotAllowedError'
            ) {
                setReady(toShare);
                setState('ready');

                return;
            }
            setState('failed');
        }
    }

    async function start(): Promise<void> {
        if (state === 'ready') {
            await share(ready);

            return;
        }

        setState('fetching');

        try {
            const fetched = await Promise.all(
                files.map(async (file) => {
                    const response = await fetch(file.url, {
                        credentials: 'same-origin',
                    });
                    if (!response.ok) {
                        throw new Error(`HTTP ${String(response.status)}`);
                    }
                    const blob = await response.blob();

                    return new File(
                        [blob],
                        fileNameOf(
                            response.headers.get('Content-Disposition'),
                            file.name,
                        ),
                        {
                            type:
                                blob.type === ''
                                    ? (file.type ?? 'application/pdf')
                                    : blob.type,
                        },
                    );
                }),
            );
            await share(fetched);
        } catch {
            setState('failed');
        }
    }

    function label(): string {
        switch (state) {
            case 'fetching':
                return t('print.share_all_fetching');
            case 'ready':
                return short ? t('print.share') : t('print.share_all_now');
            case 'failed':
                return short ? t('print.share') : t('print.share_all_again');
            case 'idle':
                return short ? t('print.share') : t('print.share_all');
        }
    }

    return (
        <Button
            variant={variant}
            aria-label={ownLabel}
            className={cn('gap-2', className)}
            disabled={state === 'fetching' || files.length === 0}
            onClick={() => {
                void start();
            }}
        >
            {state === 'fetching' && <Spinner aria-hidden="true" />}
            {/* A small phone keeps one short word; the state is then said to the screen reader only. */}
            <span className={cn(short && state === 'fetching' && 'sr-only')}>
                {label()}
            </span>
        </Button>
    );
}
