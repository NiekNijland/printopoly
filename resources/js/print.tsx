import { createRoot } from 'react-dom/client';

import { loadPrintFonts } from '@/lib/print/fonts';

import { PrintDocument } from './print/print-document';
import { ShareImage, isSharePayload } from './print/share-image';

/**
 * Entry of the print page (B54). The server renders resources/views/print/render.blade.php
 * with the part, the set and the edition as inline JSON in `window.__PRINT__`, and headless
 * Chrome turns this page into a PDF once `window.printReady` is true. There is no route for
 * it: Chrome gets the HTML, not a URL.
 */
const payload = window.__PRINT__;
const root = document.getElementById('print-root');

if (payload === undefined || root === null) {
    window.printError = 'The print page has no data.';
    window.printReady = true;
} else {
    // The fonts load first: text fitting measures with them, and a fit made with a fallback font is wrong.
    loadPrintFonts(payload.assetBase)
        .then(() => {
            // The picture for the group app (B77) is a board on a table, not a sheet of parts.
            const share: unknown = payload;
            createRoot(root).render(
                isSharePayload(share) ? (
                    <ShareImage payload={share} />
                ) : (
                    <PrintDocument payload={payload} />
                ),
            );
        })
        .catch((error: unknown) => {
            window.printError = `Fonts did not load: ${String(error)}`;
            window.printReady = true;
        });
}
