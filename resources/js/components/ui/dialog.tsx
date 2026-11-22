import { Dialog as DialogPrimitive } from 'radix-ui';
import { useEffect, useRef, type ComponentProps } from 'react';

import { CloseIcon } from '@/components/icons';
import { useTranslation } from '@/hooks/use-translation';
import { currentOpener, returnFocus, trackFocus } from '@/lib/focus-return';
import { cn } from '@/lib/utils';

function Dialog(props: ComponentProps<typeof DialogPrimitive.Root>) {
    return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(props: ComponentProps<typeof DialogPrimitive.Trigger>) {
    return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal(props: ComponentProps<typeof DialogPrimitive.Portal>) {
    return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose(props: ComponentProps<typeof DialogPrimitive.Close>) {
    return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
    className,
    ...props
}: ComponentProps<typeof DialogPrimitive.Overlay>) {
    return (
        <DialogPrimitive.Overlay
            data-slot="dialog-overlay"
            className={cn('fixed inset-0 z-40 bg-ink/50', className)}
            {...props}
        />
    );
}

/**
 * shadcn/ui's Dialog in the house style (B195): a modal on a card with a 2 px ink border (Staten design). Radix traps the focus,
 * closes on Escape and labels the dialog by its title. On closing, the focus goes back to the control that
 * opened it, also when that was an item of a menu that is gone by then (bug 16, ronde 3).
 */
function DialogContent({
    className,
    children,
    onOpenAutoFocus,
    onCloseAutoFocus,
    showCloseButton = true,
    ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
    /** The close button in the corner; on a wide screen Escape and the dialog's own buttons close it. */
    showCloseButton?: boolean;
}) {
    const t = useTranslation();
    const opener = useRef<HTMLElement | null>(null);

    useEffect(() => trackFocus(), []);

    return (
        <DialogPortal>
            <DialogOverlay />
            <DialogPrimitive.Content
                data-slot="dialog-content"
                className={cn(
                    'fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-auto overscroll-contain rounded-control border-2 border-ink bg-card p-4 min-[480px]:max-h-[90dvh] min-[480px]:p-6',
                    className,
                )}
                onOpenAutoFocus={(event) => {
                    opener.current = currentOpener();
                    onOpenAutoFocus?.(event);
                    // On a touch screen a focused field opens the keyboard at once and covers the dialog.
                    if (
                        !event.defaultPrevented &&
                        window.matchMedia('(pointer: coarse)').matches
                    ) {
                        event.preventDefault();
                        (event.currentTarget as HTMLElement).focus();
                    }
                }}
                onCloseAutoFocus={(event) => {
                    onCloseAutoFocus?.(event);
                    if (
                        !event.defaultPrevented &&
                        returnFocus(opener.current)
                    ) {
                        event.preventDefault();
                    }
                }}
                {...props}
            >
                {showCloseButton && (
                    <DialogPrimitive.Close
                        data-slot="dialog-close"
                        aria-label={t('dialog.close')}
                        className="sticky top-0 z-10 float-right -mt-2 -mr-2 ml-2 inline-flex size-11 cursor-pointer items-center justify-center rounded-control border-2 border-ink bg-card p-0 text-ink min-[480px]:hidden"
                    >
                        <CloseIcon />
                    </DialogPrimitive.Close>
                )}
                {children}
            </DialogPrimitive.Content>
        </DialogPortal>
    );
}

function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            data-slot="dialog-header"
            className={cn('flex flex-col gap-2', className)}
            {...props}
        />
    );
}

function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            data-slot="dialog-footer"
            className={cn(
                'mt-6 flex flex-col-reverse gap-2 min-[480px]:flex-row min-[480px]:justify-end',
                className,
            )}
            {...props}
        />
    );
}

function DialogTitle({
    className,
    ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
    return (
        <DialogPrimitive.Title
            data-slot="dialog-title"
            className={cn(
                'm-0 font-display text-2xl font-extrabold text-ink',
                className,
            )}
            {...props}
        />
    );
}

function DialogDescription({
    className,
    ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
    return (
        <DialogPrimitive.Description
            data-slot="dialog-description"
            className={cn('mt-2 mb-0 text-base text-ink-soft', className)}
            {...props}
        />
    );
}

export {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
    DialogTrigger,
};
