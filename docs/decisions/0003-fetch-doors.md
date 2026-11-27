# Deuren voor fetch, de teller en de console

Status: aanvaard.

## Context

Na stap 7 riepen drie bestanden buiten de twee getypte deuren (`features/edition/remote` en `lib/render/print-api.ts`) zelf `fetch` aan: de API van de boxen, de status van de printklare edities en de anonieme teller (B206). Twee bestanden schreven met `console.warn` dat een opgeslagen editie bij het lezen gerepareerd was. Elk stond in `eslint-suppressions.json`.

## Besluit

- `resources/js/lib/http.ts` is de ene getypte deur voor een verzoek buiten de twee deuren hierboven. `sendRequest` stuurt altijd het sessiecookie mee (`same-origin`) en neemt alleen een methode, headers en een body. De API van de boxen en de status van de printklare edities gaan erdoor.
- `resources/js/lib/feature-count.ts` is een eigen kleine deur. De teller stuurt geen cookies mee (`credentials: 'omit'`) en gebruikt `keepalive`, zodat de telling ook aankomt als de pagina meteen sluit. `sendRequest` doet geen van beide, en dat moet zo blijven: elk ander verzoek hoort bij de sessie. De teller wacht nergens op; een fout gaat via `reportUnlessOffline` naar Bugsnag.
- `logWarning` in `resources/js/lib/bugsnag.ts` is de enige plek die naar de console schrijft. Een reparatie die de gebruiker niet ziet is geen fout voor Bugsnag.

De lijst `doors` in `eslint.config.js` noemt deze bestanden.

## Gevolgen

Een nieuw verzoek gaat via de HTTP-hook van Inertia of via `sendRequest`. Een nieuwe deur vraagt om een nieuw record hier.
