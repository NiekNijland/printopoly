# Plan: Printopoly

Printopoly is een gratis website in het Nederlands en Engels waarop je een eigen editie van het bekende handelsspel ontwerpt. Je uploadt alleen foto's, de rest doe je in de browser. Daarna download je print-klare PDF's met instructies: het bord als sticker voor een gekocht bord, en kaarten, eigendomsbewijzen, geld en extra's om nieuw te laten drukken of thuis te printen. De site draait op printopoly.nl.

Alle vragenrondes zijn beantwoord. Besluiten staan in [`beslissingen.md`](beslissingen.md); het nummer tussen haakjes verwijst ernaar. Twee kleine vragen staan nog in [`vragen-ronde-3.md`](vragen-ronde-3.md), met een voorstel dat geldt zolang je niets anders zegt.

## Waarom

Een eigen editie maken voor vrienden kost nu avonden in Photoshop. Een bord van 50 cm opmaken, kaarten uitlijnen en dubbelzijdig laten drukken gaat vaak mis: de schaal klopt niet, tekst past niet, achterkanten verschuiven. Printopoly regelt de maten, de opmaak en de instructies, zodat je alleen de inhoud bedenkt. Het doel is dat je het vaker doet.

## Wat je als gebruiker doet

1. Je maakt een editie aan op één scherm: naam, taal, valuta, thema, bordmaat en welke onderdelen je maakt. Alleen het bord is verplicht; de rest sla je over als je wilt en haal je dan uit je eigen doos (B72, B99). Een account is niet nodig: je browser bewaart elke wijziging meteen. Wie inlogt met Google, bewaart zijn edities ook veilig op de server en ziet ze op elk apparaat; de site raadt dat aan (B78, B81). Je kunt zoveel edities maken als je wilt en ze terugvinden onder "Mijn edities" (B79).
2. Je begint vanaf de standaardset: 40 vakken in 8 kleurgroepen, 16 Kans- en 16 Algemeen Fonds-kaarten, 28 eigendomsbewijzen, speelgeld en de extra's. Alles heeft al een ontwerp uit het thema, dus je kunt op elk moment printen.
3. Je past aan wat je wilt. Straatnamen, het midden van het bord, kaartteksten en -bedragen, foto's op elk element. Bij elke kaart zie je de standaardtekst, zodat je weet wat je vervangt. De waarden op het bord (prijzen, huren, hypotheek, salaris) liggen vast (B29, B58).
4. Je ontwerpt direct in het voorbeeld. Klik een vak aan, kies een lay-out, sleep en zoom je foto, typ de naam. Op het midden van het bord, het doosdeksel en de kaartachterkanten zet je vrij extra tekst en foto's neer (B42, B43). Op een telefoon tik je een vak aan op het bord en bewerk je het in een eigen weergave (B73, B86).
5. De site waarschuwt voordat je print: een foto met te weinig pixels voor zijn formaat, tekst die niet past, een bordmaat die niet klopt. Bij elke waarschuwing staat om welk vak het gaat.
6. Je downloadt de "Drukkerij-set" of de "Thuisprint-set" als ZIP, of een los onderdeel als PDF (B71). In elke set zitten de instructies en een kalibratiepagina.

## Wat er in de sets zit

Het bord blijft het enige onderdeel van een gekochte set dat je hergebruikt, samen met dobbelstenen, huisjes en hotels. Al het andere wordt nieuw.

| Onderdeel | Drukkerij-set | Thuisprint-set |
| --- | --- | --- |
| Bord | Vier panelen als witte vinylsticker, mat gelamineerd, herpositioneerbare lijm (B64) | Elk vak een losse sticker op A4-stickervel, het midden in vier stukken (B7, B65) |
| Kaarten en eigendomsbewijzen | Kaartenset 63 × 88 mm, 350 g/m² mat, één kaart per pagina, voor en achter om en om (B56, B57) | Dubbelzijdig op 160 tot 200 g/m² mat, 9 kaarten per A4 met gespiegelde achterkanten en een uitlijntest (B134, B138) |
| Speelgeld (210 biljetten) | 15 vellen SRA3 bij de kopieerwinkel, 90 tot 120 g/m², met snijtekens | 35 vellen A4 met snijtekens |
| Pionnen | Vouwstandaard op 350 g/m² | Vouwstandaard op 200 g/m² |
| Doosdeksel | Sticker op de maat uit het bordprofiel | A4- of A3-sticker, als het deksel past |
| Huisregelskaart, spelregelboekje | Mee in de kaartenset of los | A4 |
| Deelafbeelding | Voor de groepsapp, als PNG (B77) | Zelfde |

### Het bord

Een modern bord is vierkant, ongeveer 50 × 50 cm, en verschilt per editie een paar millimeter. Daarom werkt Printopoly met een bordprofiel: buitenmaat, hoekvakmaat, rand, het aantal panelen en de maat van het doosdeksel (B57). Het standaardprofiel heet "Modern vierkant". De exacte maten meten we aan een gekochte set voordat de renderers vastliggen (B21).

Een sticker over de vouw scheurt of kreukt. De drukkerijpanelen eindigen daarom 1 mm voor elke vouwlijn en 1 mm binnen de bordrand (B6, B64). Bij de thuisprint vallen de naden op de lijnen die al op het bord staan: elk vak-sticker is een halve millimeter kleiner dan het vak en heeft zelf geen lijnen, zodat een scheve knip niet opvalt.

De instructie voor het bord gaat stap voor stap: bord ontvetten, droog passen, paneel A tegen de buitenhoek leggen, 5 cm schutpapier lostrekken, aandrukken met een pasje, de rest afpellen, en controleren dat de vouw vrij is.

### Wat bij het printen mis kan gaan

| Probleem | Wat Printopoly doet |
| --- | --- |
| De printer schaalt de pagina | Kalibratiepagina met een liniaal van 100 mm en de omtrek van een bankpas; de instructie zegt "werkelijke grootte" (B74) |
| Foto heeft te weinig pixels | Waarschuwing onder 150 dpi op printformaat; het doel is 300 dpi (B9) |
| Tekst is te lang | Tekst krimpt tot een minimum, daarna volgt een waarschuwing (B10) |
| Witte randen na het snijden | 3 mm afloop rondom (B5) |
| Voor- en achterkant verschoven | Drukkerij: één kaart per pagina in vaste volgorde; thuis: gespiegelde achterkanten met 1,5 mm afloop en een uitlijntest |
| Kleuren vallen dof uit | Themakleuren blijven binnen het CMYK-bereik (B75) |
| Bord net anders van maat | Eigen maten in het profiel, plus een proefprint van één hoekvak en één gewoon vak |

## Hoe we het bouwen

### Stack

De stack is die van motormonitor (B47): Laravel 13 op PHP 8.5 met Sail, MongoDB, Redis met Horizon, Inertia 3, React 19, TypeScript, Tailwind 4, shadcn/ui, Wayfinder, `spatie/laravel-data` met de TypeScript-transformer, `laravel-react-internationalization`, Socialite voor Google, Reverb, `intervention/image`, Bugsnag en Pulse. De tooling is ook gelijk: PHPStan level 8, Rector, Pint, PHPUnit met paratest, Vitest, ESLint, Prettier en dezelfde GitHub Actions.

Routes zijn `/{locale}/...` zoals in motormonitor. Alleen de openbare pagina's gebruiken SSR; de editor staat in `$withoutSsr` (B66). Uploads staan privé op R2.

### Eén renderer

Alles wat geprint wordt is een React-component met absolute posities in millimeters (B55). Kaders en vormen zijn inline SVG, tekst is gewone HTML zodat hij kan afbreken. Dezelfde componenten tonen het voorbeeld in de editor en vullen de PDF, dus het voorbeeld kan niet afwijken van de print.

Tekst past zich aan door in de browser te meten met dezelfde zelfgehoste fonts. Een marge van 3% zorgt dat Safari en Firefox in de editor op dezelfde plek afbreken als Chromium in de PDF.

### PDF's maken

1. Je klikt op een download. Een Horizon-job op de supervisor `pdf` pakt hem op (B70).
2. De job bouwt een Blade-view met de Vite-entry `resources/js/print.tsx` en de editie als inline JSON, en geeft die aan `Pdf::html()` van `spatie/laravel-pdf` met de Chrome-driver (B54). Er is geen print-route; Chromium laadt alleen eigen assets en tijdelijke links naar de foto's.
3. De pagina zet `window.printReady` aan als fonts, foto's en tekstpassing klaar zijn. De driver wacht daarop.
4. Foto's zijn vooraf per plaatsing uitgesneden op hooguit 300 dpi, met draaien en zwart-wit erin gebakken (B61).
5. `pdfinfo` leest elke PDF terug. Wijkt het formaat meer dan 0,2 mm af, of klopt het aantal pagina's niet, dan faalt de job (B63).
6. Reverb laat de editor weten dat de PDF klaar is. Een PDF blijft 7 dagen bewaard, gekoppeld aan een hash van de editie en de releaseversie (B62).

Vellen met snijtekens (imposition) zijn er alleen voor thuis en de kopieerwinkel. Een TypeScript-module legt de onderdelen op A4, A3 of SRA3, met afloop, snijtekens en een label per vel ("Kans 1 t/m 8").

### Data

In de browser staat elke editie in IndexedDB, met de foto's erbij, en wordt bij elke wijziging opgeslagen (B78). Zonder account blijft het daar. Voor een download stuurt de browser de editie en de foto's die erin staan naar de server, alleen voor die printjob; na 7 dagen zijn ze weg (B80). Met een account is de server de bron en houdt de browser een kopie. Bij de eerste login vraagt de site of de edities op dit apparaat naar je account mogen (B81).

Op de server is een editie één MongoDB-document (B48, B60):

```
editions: { user_id, name, locale, currency, theme, board_profile, schema_version, revision,
            elements: { "space.01": { layout, texts, colors, photo: { asset_id, cx, cy, scale, rotation, grayscale }, layers }, ... } }
assets:      { user_id, width, height, preview_path, print_path, bytes }
print_files: { edition_id, part, variant, hash, path, status, error }
```

De vaste spelgegevens en standaardteksten staan in een databestand in de repo; een editie bewaart alleen wat afwijkt (B59). Autosave stuurt alleen gewijzigde elementen mee, met een `revision`-check. Ongedaan maken houdt de browser bij.

Bij upload maakt `intervention/image` een preview van 1600 px en een printbron van hooguit 8000 px (B61). De uitsnede wordt genormaliseerd opgeslagen, zodat voorbeeld en print hetzelfde beeld geven, ook als een vak later van maat verandert.

### Openbaar en privé

Openbare pagina's (B67): een landingspagina met een voorbeeldeditie, een printgids per onderdeel, de privacyverklaring, voorwaarden en contact met een abuse-adres. De voorwaarden zeggen dat Printopoly niet verbonden is aan Hasbro en dat je alleen foto's uploadt van mensen die dat goed vinden.

Privacy (B68): Google-login met alleen naam en e-mail, uploads privé achter links van 5 minuten, EXIF eraf, alleen functionele cookies en dus geen cookiebanner. Een verwijderd account wist alles.

Beveiliging (B69): alleen JPEG, PNG, WebP en HEIC, gecontroleerd op pixelaantal en opnieuw gecodeerd. Elke editie, foto, PDF en elk Reverb-kanaal heeft een policy, en feature-tests bewijzen dat een andere gebruiker nergens bij kan.

Grenzen (B70, B82): 25 MB per foto, 1 GB en 20 edities per account, en één printjob tegelijk. Zonder account geldt de opslag van de browser; raakt die vol, dan zegt de site dat en raadt inloggen aan. Printjobs zonder account hebben een grens per IP-adres. Printopoly is gratis (B40).

## Design

Het design staat op een canvas: [Printopoly design](https://claude.ai/artifact/KtUBgk1XCQSoHwgieZcCVv). De bronbestanden staan ook in [`design/`](design/). De richting heet "keukentafel-drukkerij" (B83): papierkleur, een muntgroen bord, kaarten met een kleurband, snijtekens en een paspunt als beeldmerk. Het canvas heeft de landingspagina, een stijlgids, het drukwerk (eigendomsbewijs, Kans en Algemeen Fonds, biljet, thuisprintvel en proefvel), de printgids, het scherm voor een nieuwe editie, de editor met de tabbladen Bord, Kaarten, Geld en Doos en pionnen, de printpagina, "Mijn edities", een rij telefoonschermen en een overzicht van staten en meldingen (opslagstatus, uploadfouten, lege staten, verwijderen, versieconflict, accountmenu, editie-instellingen). Alles werkt op een telefoon van 390 px breed (B86). Het design volgt de schaal en de drie motieven uit B87 en B88.

### Hosting

Printopoly draait op de productieserver van motormonitor.nl, als vierde site in motormonitor-ansible (B50). De server levert een vastgepinde headless Chrome met de sandbox aan (B52). Tot Printopoly een eigen release-workflow heeft, bouwt `scripts/build-site-artifact.sh` het artifact, zoals bij vraagwagen (B51). De volgorde naar livegang staat in `docs/runbook-new-site.md` in die repo.

### Testen

- Vitest voor imposition, de rekensom van uitsnedes, tekstpassing en ongedaan maken.
- PHPUnit-featuretests met echte Chromium in CI: paginaformaat en paginatelling van elk onderdeel van de standaardset, en per route dat een andere gebruiker niets ziet.
- Een geometrietest die faalt als panelen, vouwmarges en rand niet optellen tot de buitenmaat.
- Visuele regressie op de referentie-editie met `pdftoppm` en 1% drempel, met de basis in de repo.
- Een proefdruk bij een drukkerij van de standaardset, geplakt op een echt bord, voordat de site live gaat.

## Onderdelen

Alles wordt tegelijk gebouwd; alleen deze afhankelijkheden bepalen de volgorde.

1. Fundament: de Laravel-app op de motormonitor-stack met Sail, Google-login, NL/EN-routes, tooling en CI.
2. Spelgegevens, bordprofiel en thema's: het databestand met de standaardset in beide talen, het profiel "Modern vierkant" gemeten aan een gekochte set, en de thema's met hun lay-outs en fonts.
3. Renderers voor bord, vak, kaart, eigendomsbewijs, biljet en extra's, in mm. Hangt af van 2.
4. Editor: nieuwe editie, ontwerpen in het voorbeeld, focusweergave op telefoon, uploads, autosave, ongedaan maken en de waarschuwingen. Hangt af van 3.
5. Print-pipeline: uitsnedes, imposition, de Chrome-job, de PDF-controle, de downloadpagina, instructies en kalibratiepagina. Hangt af van 3.
6. Openbare pagina's: landing, printgids, privacy, voorwaarden en contact.
7. Eerste editie en proefdruk: samen de eerste echte editie maken, laten drukken en plakken, en bijstellen.
8. Livegang volgens het runbook: Cloudflare en de vault, converge, eerste release, workers aan, DNS om.

## Later, buiten dit plan

- Samen aan één editie werken met uitgenodigde vrienden. Start als de eerste versie live staat en je het zelf mist (B25).
- Een eigen release-workflow in GitHub Actions, zodat SSR ook in productie aan kan (B51).
- Online spelen in de browser.
- Bestellen bij een drukkerij vanuit de site.
