# Voortgang en overdracht

Stand van 20 november 2026. Dit bestand is de overdracht tussen sessies: lees het na `plan.md` en `beslissingen.md`.

## Doel nu

Printopoly zo snel mogelijk live op printopoly.nl, gebouwd door parallelle subagents (bouwen op Sonnet, het fundament op het sterkste model), met alle kwaliteitschecks van motormonitor en aiassist.

## Wat klaar is

- Plan, besluiten B1 t/m B100 en vragenrondes 1 t/m 4 in `docs/`. Open vragen met voorstel (voorstel geldt bij geen antwoord): `vragen-ronde-3.md` (merknaam in tekst, bewaartermijn) en `vragen-ronde-4.md` (drukkerijen bij naam, exportbestand).
- Design: canvas https://claude.ai/artifact/KtUBgk1XCQSoHwgieZcCVv, bronbestanden in `docs/design/` (17 schermen). Bij twijfel is het design de specificatie.
- Spelgegevens gecontroleerd (B100).
- Cloudflare, zone printopoly.nl (actief):
  - SSL Full (strict), Always HTTPS, Authenticated Origin Pulls, Early Hints, e-mailobfuscatie uit, firewallregel tegen exploit-probes (kopie van motormonitor).
  - Redirect www naar apex (301), met een `www`-AAAA-placeholder `100::`.
  - Nog open: het apex-A-record (proxied naar <origin-ip>) bij de livegang.
- Ansible: PR https://github.com/the-deploy-repo/pull/49 (branch `feat/printopoly-site`), CI groen. Printopoly als vierde site, role `headless_chrome`, runbook `docs/runbook-new-site.md`. Niek heeft akkoord gegeven om te mergen als hij af is (vault-entries erin) en CI groen is.

## Geheimen (nooit in een repo of log)

In `~/.printopoly-origin/` (map 0700, bestanden 0600):
- `printopoly.nl.crt` en `printopoly.nl.key`: Cloudflare Origin CA, geldig tot 2041-11-16.
- `google-oauth.env`: Google OAuth client id, secret en redirect-URI `https://printopoly.nl/auth/google/callback`.

De vault-passphrase staat in `the vault passphrase file`. Te doen: in `inventories/production/group_vars/all/vault.yml` van motormonitor-ansible (branch `feat/printopoly-site`):
- `vault_tls_certificates['printopoly.nl']`
- een `vault_mongodb_users`-entry (database `printopoly`, naam `printopoly_app`, rol `readWrite`, nieuw willekeurig wachtwoord)
- `vault_site_env_files['printopoly']`: de productie-`.env`. De sleutels komen uit de `.env.example` van het fundament. Vraagwagen gebruikt `MONGODB_URI` en `MONGODB_DATABASE`.

Gedaan op 20 november: certificaat, MongoDB-gebruiker `printopoly_app` en de productie-`.env` staan in de vault (branch `feat/printopoly-site`); Bugsnag-sleutel en R2 nog leeg. PR #49 is op 20 november gemerged (squash, 04ae4bf) na groene CI.

## Subagents en branches

Elke agent werkt in een eigen worktree onder `.claude/worktrees/`.

| Onderdeel | Branch | Status |
| --- | --- | --- |
| Fundament (Laravel 13, Inertia, React, MongoDB, Redis, Horizon, Socialite, Reverb, laravel-pdf Chrome-driver, alle checks, CI) | `feat/fundament` | bezig |
| Spelgegevens (`resources/data/standard-edition.json`, `resources/js/lib/game/`, `app/Game/StandardEdition.php`, tests) | `feat/spelgegevens` | klaar, 26 Vitest- en 17 PHPUnit-tests groen; PHPStan nog niet gedraaid; tsconfig heeft `resolveJsonModule` nodig |
| Geometrie en opmaak op vellen (`resources/js/lib/print/`: board, panels, home-stickers, imposition, calibration) | `feat/geometrie` | klaar, 49 Vitest-tests groen; geld zonder afloop (B101) |
| Basis voor parallel werk: `feat/spelgegevens` + `feat/geometrie` samengevoegd | `feat/ts-basis` | klaar, gepusht |
| Renderers in mm, drie thema's, tekstpassing (`resources/js/components/render/`, `resources/js/lib/render/`), Sonnet | `feat/renderers` (vanaf `feat/ts-basis`) | klaar en op main (`composer check` groen), nog niet in de browser bekeken. `PhotoTransform` is nu die van `lib/photos` (x, y: midden van het zichtbare deel als fractie van de gedraaide foto; `PhotoSource` krijgt `width` en `height` in pixels). Open: B55 gelezen als 'niet afbreken met koppeltekens' (tekst mag op spaties teruglopen); bordprofiel nog voorlopig; Strak geeft Kans en Algemeen Fonds dezelfde grijze kaart; biljetten tonen nu '€' (B85: misschien 'M'?); iconen zijn plaatshouders |
| Foto's (validatie, transformatie, dpi, uitsnede) en Controle (`resources/js/lib/photos/`, `resources/js/lib/checks/`, `docs/foto-uitsnede.md`), Sonnet | `feat/photos-checks` (vanaf `feat/ts-basis`) | klaar, 82 Vitest-tests groen. Pakket nodig: `heic-to`. Zelf bedachte foutteksten (te veel pixels, onleesbaar, foto dekt het kader niet, bord en doosdeksel) moeten nog door de humanizer. Safari maakt geen WebP vanuit canvas (dan PNG). De PHP-job moet EXIF-oriëntatie toepassen vóór het uitsnijden. `print/home-stickers.ts` geeft fouten onder `noUncheckedIndexedAccess` |
| Editiemodel en browseropslag (`resources/js/lib/edition/`: types, schemacontrole, `resolveEdition`, instellingenwijzigingen, ongedaan maken, IndexedDB-opslag met foto's, autosave met revisiecheck en twee-vensterconflict, opslagstatus, sync-vraag na login) | `feat/edition-model` | klaar en op main (213 Vitest-tests groen, `fake-indexeddb` toegevoegd); de IndexedDB-test draait in de node-omgeving, want happy-dom kan Blobs niet klonen |
| Editor-UI (`resources/js/pages/editions/`, `pages/editor/`, `components/editor/`, `components/editions/`, `lib/editor/`): Mijn edities, nieuwe editie, focusweergave met bordnavigator, veldenpaneel met foto's, Controle, instellingen, conflictdialoog, telefoonindeling, sync na login en accountmenu | `feat/editor` | klaar, alle checks groen. Open: vrije lagen op het midden en 'Huisregels' ontbreken, biljetten zonder kleur/banknaam, `amount` op kaarten niet bewerkbaar, foto's gaan nog niet mee naar het account (geen `uploadPhoto`), fouttekst van `validateProfile` is alleen Nederlands, printroute `editions.print` is een plaatshouder |
| Teksten NL/EN (`resources/content/`) | `feat/content` | klaar. Plaatshouders voor Niek: `[CONTACTADRES]`, `[ADRES]`, `[HOSTINGLOCATIE]`, `[DATUM]`. Nog nalezen: eigen clausules in de voorwaarden en het aantal A4-vellen voor het bord |
| Openbare pagina's (landing, printgids, vragen, privacy, voorwaarden, contact, hreflang, sitemap, robots, security.txt, OG) | `feat/openbare-paginas` | klaar. Slugs per taal in `app/Enums/PublicPage.php`. Teksten komen uit `resources/content` via `app/Content/ContentLibrary.php`. `PRINTOPOLY_CONTACT_EMAIL` staat standaard op de plaatshouder `[CONTACTADRES]`. De bord- en kaartillustratie op de landing gebruikt de echte renderers met de voorbeeldeditie uit `resources/js/data/sample-edition.ts` (dezelfde gegevens voor "Voorbeeld bekijken"). De OG-afbeeldingen (`public/og/`) zijn een tekening, B77 (bordscreenshot) volgt. Het contact-, security- en illustratiewoordgebruik in `lang/*.json` moet nog door de humanizer en Niek. Een nieuwe publieke pagina: voeg een case toe aan `PublicPage`. |
| Account-sync (MongoDB-`editions`, JSON-API onder de websessie, import na login, account verwijderen, `resources/js/lib/edition/remote/`) | `feat/account-sync` | klaar, `composer check` groen. Eindpunten onder `/api` (zie `routes/web.php`). De editor moet nog: de `RemoteEditionStore` uit `createRemoteEditionStore()` aan `uploadEditions` hangen, bij 409 de keuze tonen, `logout()` aanroepen en bij `clearLocalCopy` IndexedDB wissen (of de flash-prop `clearLocalCopy` lezen), en `deleteAccount(e-mailadres)` bij Account verwijderen. Foto's: `putPhoto` is een hook (`uploadPhoto`) voor de printpipeline. Events voor de printpipeline: `AccountDeleting`, `EditionDeleted`, `EditionDuplicated`. De migratie met de unieke index moet bij de deploy draaien (`artisan migrate`). |

## Lopend (20 november, middag)

- Editor-UI: `feat/editor` (heeft renderers en editiemodel al op main gezet).
- Printpipeline: `feat/printpipeline`, klaar (zie "Printpipeline" hieronder); wacht op samenvoegen.
- Account- en edities-API plus `RemoteEditionStore` in `resources/js/lib/edition/remote/`: `feat/account-sync`.
- Echte renderer op de landing en een tekstpass over zelfbedachte teksten: `feat/landing-render`.
- Livegang: converge gedaan (20 november, 0 fouten) en release fbd929b (fundament plus openbare pagina's) gedeployed en geverifieerd op loopback. Workers, `public_traffic_on_host` en apex-DNS staan nog uit.
- Werkafspraak van Niek: niet elke branch apart live zetten (de CI is traag). Eerst alles lokaal samenvoegen, dan elke pagina in de lokale browser tegen het design controleren (niet te veel afwijken), dan de hele app functioneel lokaal testen, en pas daarna één deploy met workers, publiek verkeer en DNS.

## Printpipeline (`feat/printpipeline`)

Gebouwd en getest in Sail, `composer check` groen:

- Modellen `editions`, `assets`, `print_files`, `print_jobs` (indexen in `database/migrations/`). Foto-upload met controle op inhoud, 25 MB, 60 MP vóór het decoderen, opnieuw coderen zonder EXIF, rechtzetten, preview (WebP, 1600 px) en printbron (JPEG q90, 8000 px). Opslag op de schijf uit `PRINTOPOLY_DISK`.
- `GeneratePrintJob` (wachtrij `pdf`, één run tegelijk per job en per gebruiker): uitsnijden per plaatsing (`app/Photos/PhotoCrop.php`, zelfde getallen als `docs/foto-uitsnede.md`), Blade-view met Vite-entry `print.tsx`, Chrome, `pdfinfo`-controle (B12, B63), cachesleutel (B62), losse instructie-PDF per onderdeel, twee ZIP's (B71). Opruimen na 7 dagen met `printopoly:cleanup` (dagelijks 03:30).
- Printpagina `/{locale}/editions/{id}/print` (de knop in de editor), `/{locale}/print` en `/{locale}/print/{token}` volgens `Download.dc.html` en `Mobiel-download.dc.html`, status via JSON en Reverb (`resources/js/lib/echo.ts`, `hooks/use-print-job.ts`, met polling als terugval).
- De pagina-indeling staat in `resources/js/lib/print/composition.ts`; het tekenen doet nu `resources/js/print/placeholder-item.tsx`. De echte renderers pluggen daar in, zonder iets aan de indeling te wijzigen.
- Besluiten B104 t/m B107 leggen vast wat daarbij is gemeten en gekozen.

Nog open:

- De echte renderers (`components/render/`) zijn nog niet op de printpagina aangesloten.
- De browser (`lib/print/local-edition.ts`) heeft nog geen koppeling met de IndexedDB-opslag voor een job zonder account; de uploadroute zelf (`POST /api/print-jobs`) werkt en is getest.
- Foto's op het bord, de kaarten en de rest: de uitsnede heeft de maat van het kader in mm (met afloop) nodig. Die zit in de geometrie van de renderers en niet in de editie (`photo` heeft alleen `photoId`, `cx`, `cy`, `scale`, `rotation`, `grayscale`). Een plaatsing zonder `target: {w, h}` faalt daarom nu hard in de uitsnede; fotolagen gebruiken hun eigen `w` en `h`. Dit hoort bij het aansluiten van de renderers: de printpagina moet dan ook de voorbewerkte foto (`photo.src`) in `PhotoSlot` gebruiken in plaats van de eigen uitsnede.
- Opruimen: de listeners `RemoveEditionPrintData`, `RemoveAccountPrintData` en `CopyEditionAssets` (app/Listeners) horen bij `EditionDeleted`, `AccountDeleting` en `EditionDuplicated`. Foto's staan per gebruiker, editie en foto-id; een kopie krijgt eigen bestanden onder dezelfde id's.
- `uploadAccountPhoto` (lib/print/api.ts) is de `uploadPhoto`-hook van de remote store. `loadLocalEdition(editionId)` voor een job zonder account is nog een stub.
- Instructieteksten: het bord thuis is 7 A4-vellen (tekst: 11) en een paneel 254 mm (tekst: 249).
- Server: `poppler-utils` (`pdfinfo`), de Chrome-wrapper op `/usr/local/bin/chrome-headless-shell`, `PRINTOPOLY_RENDER_BASE_URL` naar een listener die Chrome zonder Cloudflare bereikt, `PRINTOPOLY_RELEASE` per deploy, `php artisan migrate`, een Horizon-supervisor `pdf` en Reverb.

## Volgende stappen

De drie Sonnet-agents hierboven werken zonder fundament: ze committen geen `package.json` of configs en testen met de `node_modules` van de fundament-worktree. Welke npm-pakketten ze nodig hebben, melden ze in hun rapport.

1. Gedaan: `feat/fundament`, `feat/ts-basis`, `feat/content` en `feat/photos-checks` staan op main. Integratie-agent (`fix/integratie`) maakt `composer check` groen op main; daarna `feat/renderers` en `feat/edition-model` erin. Lopend vanaf main: `feat/openbare-paginas` en `feat/printpipeline` (Sonnet, elk eigen Sail-poorten). Oorspronkelijk plan: `feat/fundament` naar main, daarna `feat/ts-basis` (of los `feat/spelgegevens` en `feat/geometrie`), `feat/content`, `feat/renderers`, `feat/edition-model` en `feat/photos-checks` erin, gevraagde pakketten toevoegen en alle checks draaien.
2. Daarna Sonnet-agents vanaf main:
   - editor-UI (focusweergave, bordnavigator, Mijn edities, nieuwe editie, onderdelen kiezen) op de renderers en het editiemodel, plus sync na login (B81);
   - printpipeline met Horizon-job, Chrome-driver, uitsnedes, pdfinfo-controle, printpagina en Reverb (B54, B61 t/m B63, B95);
   - openbare pagina's: landing, printgids, privacy, voorwaarden, contact, sitemap, hreflang en OG (B66, B67, B97).
3. Release: een release-workflow in GitHub Actions of `scripts/build-site-artifact.sh` uit motormonitor-ansible (B51).
4. Livegang volgens het runbook. Dit zijn productie-ingrepen en vragen elk akkoord van Niek: vault, merge van PR #49, converge, eerste deploy, workers aan, apex-DNS, `public_traffic_on_host: true`.

## Werkafspraken

- Kwaliteitschecks: alles uit motormonitor en aiassist (Rector, Pint, PHPStan inclusief tests, parallel-lint, composer audit, Prettier, ESLint, tsc, Vitest, knip, PHPUnit met paratest, SSR-check).
- Teksten gaan door de humanizer-skill.
- Commits eindigen op `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Houd dit bestand bij als er iets verandert.
