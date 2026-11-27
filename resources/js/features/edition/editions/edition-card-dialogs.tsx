import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/hooks/use-translation';

type RenameDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    name: string;
    onNameChange: (name: string) => void;
    failed: boolean;
    busy: boolean;
    onRename: () => void;
};

export const RenameDialog = ({
    open,
    onOpenChange,
    name,
    onNameChange,
    failed,
    busy,
    onRename,
}: RenameDialogProps) => {
    const t = useTranslation();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                onOpenAutoFocus={(event) => {
                    // The name is the one field: focus it with the text selected, ready to retype.
                    event.preventDefault();
                    const input =
                        event.currentTarget instanceof HTMLElement
                            ? event.currentTarget.querySelector('input')
                            : null;
                    input?.focus();
                    input?.select();
                }}
            >
                <form
                    className="flex flex-col gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (name.trim() === '') {
                            return;
                        }
                        onRename();
                    }}
                >
                    <DialogTitle>{t('editions.rename')}</DialogTitle>
                    <DialogDescription className="sr-only">
                        {t('editions.rename_description')}
                    </DialogDescription>
                    <label className="flex flex-col gap-1 text-sm font-semibold">
                        {t('edition.name')}
                        <Input
                            value={name}
                            onChange={(event) =>
                                onNameChange(event.target.value)
                            }
                        />
                    </label>
                    {failed && (
                        <p role="alert" className="m-0 text-sm text-press">
                            {t('editions.action_failed')}
                        </p>
                    )}
                    <div className="flex justify-end gap-3">
                        <DialogClose asChild>
                            <Button variant="secondary">
                                {t('app.cancel')}
                            </Button>
                        </DialogClose>
                        <Button
                            type="submit"
                            disabled={name.trim() === '' || busy}
                        >
                            {t('app.save')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

type DeleteDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    name: string;
    inAccount: boolean;
    failed: boolean;
    busy: boolean;
    onDelete: () => void;
};

export const DeleteDialog = ({
    open,
    onOpenChange,
    name,
    inAccount,
    failed,
    busy,
    onDelete,
}: DeleteDialogProps) => {
    const t = useTranslation();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>
                    {t('editions.delete_title', { name })}
                </DialogTitle>
                <DialogDescription>
                    {inAccount
                        ? t('editions.delete_body_account')
                        : t('editions.delete_body')}
                </DialogDescription>
                {failed && (
                    <p role="alert" className="mt-4 mb-0 text-sm text-press">
                        {t('editions.action_failed')}
                    </p>
                )}
                <div className="mt-6 flex justify-end gap-3">
                    <DialogClose asChild>
                        <Button variant="secondary">{t('app.cancel')}</Button>
                    </DialogClose>
                    <Button disabled={busy} onClick={onDelete}>
                        {t('editions.delete')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
