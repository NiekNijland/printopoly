import { createRoot } from 'react-dom/client';

import { loadPrintFonts } from '@/features/print/fonts';

import { parseOrUndefined } from '@/lib/parse';

import { PrintDocument } from './features/print/print-document';
import { pagePayload } from './features/print/print-payload';
import { ShareImage } from './features/print/share-image';

/**
 * Entry of the print page (B54). The server renders resources/views/print/render.blade.php
 * with the part, the set and the edition as inline JSON in `window.__PRINT__`, and headless
 * Chrome turns this page into a PDF once `window.printReady` is true. There is no route for
 * it: Chrome gets the HTML, not a URL.
 */
const payload = parseOrUndefined(pagePayload, window.__PRINT__);
const root = document.getElementById('print-root');

if (payload === undefined || root === null) {
    window.printError = 'The print page has no data.';
    window.printReady = true;
} else {
    // The fonts load first: text fitting measures with them, and a fit made with a fallback font is wrong.
    loadPrintFonts(payload.assetBase)
        .then(() => {
            // The picture for the group app (B77) is a board on a table, not a sheet of parts.
            createRoot(root).render(
                payload.part === 'share' ? (
                    <ShareImage payload={payload} />
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
