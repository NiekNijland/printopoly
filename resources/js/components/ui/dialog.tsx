import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogClose = DialogPrimitive.Close;

/**
 * A modal dialog on a card with a 2 px ink border (Staten design). Radix traps the focus,
 * closes on Escape and labels the dialog by its title.
 */
function DialogContent({
    className,
    children,
    ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
    return (
        <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay
                data-slot="dialog-overlay"
                className="fixed inset-0 z-40 bg-ink/50"
            />
            <DialogPrimitive.Content
                data-slot="dialog-content"
                className={cn(
                    'fixed top-1/2 left-1/2 z-50 max-h-[90dvh] w-[calc(100vw-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-control border-2 border-ink bg-card p-6',
                    className,
                )}
                {...props}
            >
                {children}
            </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
    );
}

function DialogTitle({
    className,
    ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
    return (
        <DialogPrimitive.Title
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
            className={cn('mt-2 mb-0 text-base text-ink-soft', className)}
            {...props}
        />
    );
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle };
