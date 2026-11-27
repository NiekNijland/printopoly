import { useRef, useState, type UIEvent } from 'react';

import { useFoldablePreview } from '@/hooks/use-media-query';

// Phone and tablet upright: the preview sits on top of the fields and folds to one line, by hand or as soon as
// the fields scroll, so the form is the main thing (B155, UX 5 ronde 4). Only a fold made by scrolling opens
// again by scrolling back to the top; a fold by hand stays.
export const usePreviewFold = () => {
    const [previewFolded, setPreviewFolded] = useState(false);
    const foldedByScroll = useRef(false);
    const foldable = useFoldablePreview();
    const folded = foldable && previewFolded;
    const togglePreview = (): void => {
        foldedByScroll.current = false;
        setPreviewFolded((was) => !was);
    };
    const onFieldsScroll = (event: UIEvent<HTMLElement>): void => {
        const target = event.target;
        if (!foldable || !(target instanceof HTMLElement)) {
            return;
        }
        // Only when the fields stay scrollable once the preview is small, or the fold would undo itself.
        const preview =
            document.querySelector<HTMLElement>('[data-preview]')
                ?.offsetHeight ?? 0;
        const room = target.scrollHeight - target.clientHeight;
        if (target.scrollTop > 48 && !previewFolded && room > preview) {
            foldedByScroll.current = true;
            setPreviewFolded(true);
        } else if (
            target.scrollTop <= 0 &&
            previewFolded &&
            foldedByScroll.current
        ) {
            foldedByScroll.current = false;
            setPreviewFolded(false);
        }
    };

    return { foldable, folded, togglePreview, onFieldsScroll };
};
