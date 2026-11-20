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
- `r2.env`: R2-endpoint, sleutels en bucket voor `printopoly-prod`.
- `bugsnag.env`: notifier-sleutel van Bugsnag-project Printopoly (persoonlijke organisatie MotorMonitor, project-id 6b006bdd5933d5001f0d7dc0), voor `BUGSNAG_API_KEY` en `VITE_BUGSNAG_API_KEY`.

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
| Editor-UI (`resources/js/pages/editions/`, `pages/editor/`, `components/editor/`, `components/editions/`, `lib/editor/`): Mijn edities, nieuwe editie, focusweergave met bordnavigator, veldenpaneel met foto's, Controle, instellingen, conflictdialoog, telefoonindeling, sync na login en accountmenu | `feat/editor` | klaar, alle checks groen. `feat/editor-gaps` vult aan: vrije lagen (tekst en foto, slepen, schalen, draaien, met rode zones) op het midden, doosdeksel en kaartachterkanten; Huisregels als kaart van 63 x 88 mm met genummerde regels (`HouseRulesCard`); biljetkleur en een banknaam voor alle biljetten (element-sleutel `bank`); `amount` op kaarten (plus is ontvangen, min is betalen, onderaan de kaart); pionnen toevoegen en weghalen (`hidden`, `resolved.pawns` bevat alleen pionnen die in de set zitten, dus de printpagina hoeft niets te filteren); `validateProfile(profile, locale)` in NL en EN; `/{locale}/editions/sample` met 'Begin met deze als basis' (`repository.createFrom`). Nog open: foto's gaan niet mee naar het account (geen `uploadPhoto`), de resolutiecontrole slaat foto's in vrije lagen over, het plaatje voor de groepsapp (B77) hoort bij de printpipeline, printroute `editions.print` is een plaatshouder |
| Teksten NL/EN (`resources/content/`) | `feat/content` | klaar. Plaatshouders voor Niek: `[CONTACTADRES]`, `[ADRES]`, `[HOSTINGLOCATIE]`, `[DATUM]`. Nog nalezen: eigen clausules in de voorwaarden en het aantal A4-vellen voor het bord |
| Openbare pagina's (landing, printgids, vragen, privacy, voorwaarden, contact, hreflang, sitemap, robots, security.txt, OG) | `feat/openbare-paginas` | klaar. Slugs per taal in `app/Enums/PublicPage.php`. Teksten komen uit `resources/content` via `app/Content/ContentLibrary.php`. `PRINTOPOLY_CONTACT_EMAIL` staat standaard op de plaatshouder `[CONTACTADRES]`. De bord- en kaartillustratie op de landing gebruikt de echte renderers met de voorbeeldeditie uit `resources/js/data/sample-edition.ts` (dezelfde gegevens voor "Voorbeeld bekijken"). De OG-afbeeldingen (`public/og/`) zijn een tekening, B77 (bordscreenshot) volgt. Het contact-, security- en illustratiewoordgebruik in `lang/*.json` moet nog door de humanizer en Niek. Een nieuwe publieke pagina: voeg een case toe aan `PublicPage`. |
| Account-sync (MongoDB-`editions`, JSON-API onder de websessie, import na login, account verwijderen, `resources/js/lib/edition/remote/`) | `feat/account-sync` | klaar, `composer check` groen. Eindpunten onder `/api` (zie `routes/web.php`). De editor moet nog: de `RemoteEditionStore` uit `createRemoteEditionStore()` aan `uploadEditions` hangen, bij 409 de keuze tonen, `logout()` aanroepen en bij `clearLocalCopy` IndexedDB wissen (of de flash-prop `clearLocalCopy` lezen), en `deleteAccount(e-mailadres)` bij Account verwijderen. Foto's: `putPhoto` is een hook (`uploadPhoto`) voor de printpipeline. Events voor de printpipeline: `AccountDeleting`, `EditionDeleted`, `EditionDuplicated`. De migratie met de unieke index moet bij de deploy draaien (`artisan migrate`). |

## Stand 20 november, avond

Op main: fundament, spelgegevens, geometrie, content, foto's en Controle, renderers (opgepoetst), editiemodel, openbare pagina's, landing met echte renderer, account-sync, editor-UI, printpipeline. Designcheck ronde 1 staat in `docs/designcheck.md`.

Lopend:
- `feat/editor-gaps`: middenlagen, huisregels, geldkleuren en banknaam, kaartbedragen, voorbeeldeditie, plus de editor-designfixes uit de designcheck en een frisse look (B104).
- `fix/design-publiek`: printgids volgens design, landing levendig (B103), alle openbare pagina's en Nieuwe editie fris (B104).
- `feat/print-afronden`: echte renderers in de print-PDF's, fotomaten, upload van lokale edities, telling thuisbord-vellen, printpagina fris, PDF's visueel gecontroleerd, render-URL voor productie.

Productie, voor de deploy:
- In de vault-`.env`: `PRINTOPOLY_RENDER_BASE_URL=http://printopoly.nl:8080`, `PRINTOPOLY_CHROME_HOST_RESOLVER_RULES="MAP printopoly.nl 127.0.0.1"`, `PRINTOPOLY_DISK`, `PRINTOPOLY_RELEASE` en `LARAVEL_PDF_CHROME_NO_SANDBOX=false` (de server draait Chrome met sandbox). De nieuwe sleutels staan in `.env.example`.
- poppler-utils staat al in de role `headless_chrome`.
- R2: bucket `printopoly-prod` in de EU-jurisdictie (endpoint `https://<account>.eu.r2.cloudflarestorage.com`), met een eigen token dat alleen die bucket mag lezen en schrijven. De S3-sleutels staan in `~/.printopoly-origin/r2.env` en moeten in de vault-`.env` (`R2_*`, `PRINTOPOLY_DISK=r2`). Een put/list/delete-test is geslaagd. De R2-disk zelf bouwt `feat/r2`.

## Livegang klaarzetten (20 november, avond)

- Ansible-PR https://github.com/the-deploy-repo/pull/50 (branch `feat/printopoly-env-r2`): vault-`.env` met R2, Bugsnag en de loopback-render-instellingen; `public_traffic_on_host`, `worker_autostart` en `scheduler_enabled` aan. Mergen en convergen pas bij de deploy, na de lokale eindtest.
- Volgorde bij de deploy: PR #50 mergen, release bouwen van main, deployen, converge (workers en publiek verkeer aan), apex-A-record proxied naar <origin-ip>, dan live testen inclusief een PDF.
- Mail: printopoly.nl komt als eigen domein in iCloud, met catch-all (Niek). In Cloudflare staan MX (mx01/mx02.mail.icloud.com), SPF, DKIM (`sig1._domainkey`) en DMARC. Nog nodig van Niek: het `apple-domain=…`-TXT-record uit de iCloud-setup, en voor uitgaande mail een app-specifiek wachtwoord (SMTP via smtp.mail.me.com). Adressen in de site: hallo@printopoly.nl (contact, privacy, security.txt) en abuse@printopoly.nl (meldingen).
- `feat/inactieve-accounts`: account na 24 maanden ongebruikt weg, met een waarschuwingsmail 30 dagen vooraf (belofte uit de privacyverklaring).

## Live, tweede release (20 november, avond)

Release 260c61d + Reverb-fix staat live: fixes uit testronde 1 (eigendomsbewijzen met eigen namen, foto's in porties van tien, kaartteksten volgen hernoemde straten, printpagina-tab en foutteksten), QA-rest, UX-pass met sneltoetsen (`?`), publieke fixes (Verder met, Mijn edities op telefoon, printgids thuisprinten), geen lay-outkeuze meer (B122), geen persoonsnaam op de site, GitHub-link in de footer. Websocket naar Reverb via printopoly.nl werkt (101).

Nog niet live: `fix/seo` (SSR-contract, JSON-LD, noindex, robots, foutpagina's, manifest). Vereist ansible-wijziging voor SSR, zie het rapport in `docs/seo.md` op die branch.

Open uit testronde 1: zie `docs/feedback/fixes-print.md` (ZIP-status, API-fouten in sitetaal, alles opnieuw proberen, plaatsingsoverzicht thuisbord, A/B/C/D-labels, instructie-PDF's in huisstijl, thema's in print, pion zonder foto, veilige zone doosdeksel) en de publieke punten in het rapport van `fix/publiek-feedback`. Editorpunten (tabletweergave, lagen standaard op titel, handvatten, scrollpositie paneel, kaarttegels, Controle-verbeteringen) nog niet opgepakt. Testronde 2 nog te doen.

## Overdracht (20 november, avond, gebruikslimiet bereikt)

Lopend of klaar, nog niet op main:
- `fix/qa-rest` (klaar, groen): Ctrl+Z, focus na Controle, aria bij bordmaat, kapotte editie, geen prefetch, Mijn edities-kop ingelogd, print-retry. Mergen.
- `feat/ux-pass` (bezig): sneltoetsen met `?`-hulp, soepelheid, uitlijning, responsiveness 320 tot 1920. Bouwt op `fix/qa-rest`.
- `fix/seo` (bezig): SEO-audit tegen motormonitor.nl, `docs/seo.md`. Hoofdprobleem: productie levert lege HTML (geen SSR, `release_profile.ssr: false` in ansible). Daarna ansible-PR om SSR aan te zetten.
- Testronde 1 met 5 dorpen (Raalte, Heino, Olst, Wijhe, Lemelerveld): feedback in `/private/tmp/claude-501/-Users-nieknijland-git-hobby-printopoly/08bf87c2-2f81-4fd8-88d6-54bc7cbea685/scratchpad/feedback/*.md` (scratchpad, kopieer naar `docs/feedback/` voordat hij weg is). Olst en Lemelerveld liepen nog.

Belangrijkste feedback tot nu toe:
- Blokkerend: eigendomsbewijzen in de kaarten-PDF tonen de standaard straatnamen in plaats van de eigen namen (bord-PDF klopt wel). Printpagina-miniaturen ook.
- Editorbord blijft groen bij thema Riso.
- Geen tabletweergave in de editor op 768 px.
- Thuisprint: geen plaatsingsoverzicht voor bordvakjes, titel over twee pagina's, instructie in de thuis-ZIP begint met drukkerijtekst; printgids mist gereedschap en "werkelijke grootte"-uitleg.
- Printpagina: na "maken" terug naar het verkeerde tabblad, "ZIP klaar" terwijl dat niet zo is, foutmelding zonder oorzaak, 429 bij snel klikken, retry van twee onderdelen tegelijk faalt.
- Editor: nieuwe lagen vallen op titel en vouwlijnen, doosdeksel-titel niet verplaatsbaar, kleine handvatten, foto-fouten buiten beeld op telefoon, paneel houdt scrollpositie, kaarttegels alleen nummers, Controle waarschuwt niet voor hernoemde straten in kaartteksten, pionfoto snijdt gezichten af.
- Home: terugkerende gebruiker ziet zijn edities niet.
- Blokkerend (Lemelerveld): printen faalt met meer dan 20 foto's; PHP `max_file_uploads` is 20, de app staat 60 toe. Ook in productie (php-fpm-pool in ansible) controleren.
- Print-API geeft Nederlandse fouten op de EN-site; 422 en 429 tonen dezelfde vage melding; EN-site toont "Modern vierkant" en Nederlandse straatnamen in de voorbeelden.
- Controle mist echte problemen: 300×200-foto gold als scherp genoeg, naam van zes regels, lege fotokaders op eigendomsbewijzen en huisregels.
- Riso-thema werkt niet door op eigendomsbewijzen, biljetten en kaarten; instructie-PDF's in Helvetica.

Volgende stappen: alle feedback bundelen, fixen per gebied (print, editor, publiek), `fix/qa-rest`, `feat/ux-pass` en `fix/seo` mergen, checks groen, testronde 2 met nieuwe dorpen, daarna deploy met SSR aan.

Lokaal: Sail op 8090 met Horizon en Reverb los gestart in de container; `.env` heeft nu het Chrome-pad en `NO_SANDBOX=true`.

## Live (20 november 2026, 18:05)

printopoly.nl staat live: release 9c65986 (alles van main), ansible-PR #50 gemerged en geconvergeerd, apex-A-record proxied naar <origin-ip>. Horizon, Reverb en de scheduler draaien. Rooktest op de server: een bord-PDF (4 pagina's) via Chrome op de loopback naar R2 in 1,4 s.

Bekend:
- De publieke check in `deploy.yml` faalde twee keer, alleen omdat de DNS op de operator-Mac nog een negatief antwoord in de cache had. De release staat live en haalde alle checks op de host.
- Nog niet op productie in een browser doorgeklikt (zelfde DNS-cache). Lokaal wel: QA ronde 1 (`docs/qa-ronde-1.md`), designcheck ronde 1 en 2 met responsiveness (`docs/designcheck.md`).
- Open punten uit QA: Ctrl+Z buiten tekstvelden, focus na een Controle-link, `aria-describedby` op bordmaatfouten, foutmelding bij een kapotte editie in IndexedDB, preload van `heic-to` op Nieuwe editie, kop van Mijn edities zegt "in deze browser" als je bent ingelogd.
- Open punten print: "verouderd" en een los onderdeel op 390 px niet getest; foto's op de printpagina alleen uit de lokale browser; "Opnieuw proberen" bij een vastgelopen job.

## Open eindjes

- Uitgaande mail (alleen de waarschuwing 30 dagen voor het verwijderen van een inactief account): wacht op een app-specifiek wachtwoord van Niek in `~/.printopoly-origin/icloud-smtp.env` (`MAIL_USERNAME`, `MAIL_PASSWORD`), daarna in de vault-`.env`. Zonder mail verwijdert de site niets. Blokkeert de livegang niet.

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
- De pagina-indeling staat in `resources/js/lib/print/composition.ts`; het tekenen doen de echte renderers via `resources/js/print/item-art.tsx` (paneel, vaksticker, kaart met afloop, vouwkaart, biljet, pion, doosdeksel, huisregelskaart) en `calibration-art.tsx` (proefvel). Besluiten B105 t/m B108 leggen vast wat daarbij is gemeten en gekozen; B112 t/m B119 zijn de afronding (`feat/print-afronden`).

Afgerond in `feat/print-afronden`:

- De echte renderers staan op de PDF's. De fonts laden via `FontFace` uit `@fontsource` (door `print-assets`, met CORS) vóór de eerste render; `window.printReady` gaat pas aan als de passende tekst niet meer verandert. Chrome verkleint een document met inhoud buiten het vel, dus `cullOutsidePages` verbergt die (B114).
- Fotokaders komen uit de renderers (`lib/print/photo-targets.ts`, B113) en gaan per set mee naar de server. Met een echte foto doorgetest: bord (kader en vol), kaarten, eigendomsbewijzen, kaartrug, biljet, pion en doosdeksel in alle drie thema's.
- `lib/print/local-edition.ts` leest editie en foto's uit IndexedDB voor een job zonder account en stuurt ze met de kaders naar `POST /api/print-jobs`.
- Bord: paneel 248 mm (pagina 254 mm), thuis 7 vellen; de teksten in `resources/content/{nl,en}/instructies/bord.md` zijn gecorrigeerd en `PrintLayout` rekent het aantal vellen uit het profiel (B115). `resources/content/{nl,en}/printgids.md` noemt nog 249 mm en 11 vellen.
- Printpagina volgens Download.dc.html en Mobiel-download.dc.html met echte onderdelen als miniatuur (B117). Chrome-hostregel en render-basis-URL staan in `.env.example` en de README (B112).

Nog open:

- De miniaturen op de printpagina tonen geen foto's.
- `PRINTOPOLY_RELEASE` blijft leeg in productie (B118); de browser krijgt Reverb- en Bugsnag-instellingen uit de pagina (B119), dus de vault hoeft geen `VITE_`-sleutels te hebben.
- `docs/foto-uitsnede.md` geldt ook voor de lagen; foto's op vrije lagen worden gesneden op de maat van de laag.
- `resources/content/*/instructies/kaarten.md` noemt 60 kaarten en 15 vellen; met de huisregelskaart aan is dat 61 en 16.
- Eigendomsbewijzen met "vol" tonen weinig van de foto (de tabel dekt hem bijna af); dat is het ontwerp van de renderer.
- Account-foto's: `uploadAccountPhoto` is nog niet aan de editor gehangen (zie account-sync).
- Opruimen: de listeners `RemoveEditionPrintData`, `RemoveAccountPrintData` en `CopyEditionAssets` (app/Listeners) horen bij `EditionDeleted`, `AccountDeleting` en `EditionDuplicated`.
- Server: `poppler-utils` (`pdfinfo`), de Chrome-wrapper op `/usr/local/bin/chrome-headless-shell`, `PRINTOPOLY_RENDER_BASE_URL` en `PRINTOPOLY_CHROME_HOST_RESOLVER_RULES` (B112), `PRINTOPOLY_RELEASE` per deploy, `php artisan migrate`, een Horizon-supervisor `pdf` en Reverb.

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
