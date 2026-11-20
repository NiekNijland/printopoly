# Plan: Printopoly

**Kern:** Printopoly is een gratis, tweetalige (NL/EN) website waarop je een eigen editie van het bekende handelsspel volledig in de browser ontwerpt, met alleen je eigen foto's als input, en die je print-klare PDF's plus print-instructies geeft: het bord als sticker voor een bestaande set, al het andere los te printen bij een drukkerij of thuis.

**Status:** vragenronde 1 en 2 beantwoord; klaar om te bouwen. Besluiten staan in [`beslissingen.md`](beslissingen.md).

## Waarom

Een eigen editie voor vrienden is een leuk cadeau, maar elke keer opnieuw een bord van 50 cm opmaken, kaartjes uitlijnen en dubbelzijdig laten drukken kost avonden en gaat vaak mis: verkeerde schaal, tekst die niet past, achterkanten die verschuiven. Een website die de maten, de opmaak en de print-instructies regelt maakt het herhaalbaar, voor jezelf en voor iedereen die hetzelfde wil. Je vult alleen de inhoud in.

## Wat de gebruiker krijgt

1. **Inloggen met Google** en een editie aanmaken in het Nederlands of Engels. Je begint vanaf de standaardset in die taal: 40 vakjes, 8 kleurgroepen, 16 Kans- en 16 Algemeen Fonds-kaarten, 28 eigendomsbewijzen, speelgeld. Alles heeft al een ontwerp uit het gekozen thema.
2. **Inhoud aanpassen.** Namen van straten, stations en nutsbedrijven; het midden van het bord; kaartteksten en -effecten. Bij elke kaart staat de originele tekst en het originele effect, zodat je ziet wat je vervangt. Prijzen, huren en de indeling van het bord liggen vast.
3. **Alles ontwerpen in de browser.** Je uploadt alleen foto's; de rest doe je op de site. Elk vakje, elke hoek, het midden, kaartvoor- en achterkanten, eigendomsbewijzen, biljetten, doosdeksel en pionnen ontwerp je direct in het voorbeeld: lay-out kiezen, foto slepen, zoomen en draaien, tekst en kleuren aanpassen. Je hebt nooit Paint of Photoshop nodig.
4. **Wat je ziet is wat je print.** Het voorbeeld is letterlijk wat de PDF wordt.
5. **Controles vóór het printen.** Waarschuwingen bij afbeeldingen met te lage resolutie, tekst die niet past en een bordprofiel dat niet klopt, met de naam van het element erbij.
6. **Downloaden.** Per onderdeel een eigen PDF, plus "alles als ZIP". Niets is verplicht; je print wat je wilt:
   - **bord voor de drukkerij:** sticker per bordpaneel, langs de vouwlijnen;
   - **bord thuis:** elk vakje een losse sticker op A4-stickervellen, het midden in stukken;
   - **kaarten en eigendomsbewijzen:** volledig nieuw, voor- en achterkant, voor de drukkerij en als thuisprint;
   - **speelgeld;**
   - **extra's:** doosdeksel-sticker, pionnen als standaardje, huisregelskaart, spelregelboekje met de nieuwe namen, deelafbeelding voor de groepsapp;
   - **print-instructies** per onderdeel en een **kalibratiepagina** met een liniaal van 100 mm.

## Brainstorm

### Het bord: sticker op een bestaande set

Een gekocht bord is stevig, vlak en vouwt netjes. Daar zelf iets van maken is lastig; een sticker eroverheen is dat niet. Het bord blijft dus het enige onderdeel van de originele set dat we hergebruiken, naast dobbelstenen, huisjes en hotels. Kaarten en geld worden volledig nieuw geprint.

- **Bordprofiel.** Een modern bord is vierkant, ongeveer 50 × 50 cm, en verschilt per editie een paar millimeter. De site werkt met een bordprofiel: buitenmaat, hoekvakmaat en vouwlijnen. Standaard is het generieke profiel "Modern vierkant"; wie een ander bord heeft vult eigen maten in.
- **Vouwlijnen.** Een sticker over de vouw scheurt of kreukt. De drukkerij-PDF knipt het bord daarom op in panelen langs de vouwlijnen, met een marge van 1 mm.
- **Thuisprint per vakje.** 50 cm past niet op een thuisprinter. De naden komen op de lijnen die er al zijn: elk vakje een eigen sticker, het midden in vier stukken.

### Kaarten, eigendomsbewijzen en geld: volledig nieuw

- **Papier.** De instructies noemen per onderdeel het juiste papier: kaarten op 300–350 g/m² karton met een matte of linnen afwerking (de "speelkaart-producten" van online drukkerijen), geld op 90–120 g/m².
- **Drukkerij.** Dubbelzijdige PDF met 3 mm afloop en snijtekens, voor- en achterkanten in de juiste volgorde.
- **Thuis.** Vouwkaarten: voor- en achterkant naast elkaar, dubbelvouwen en lijmen. Thuisprinters drukken dubbelzijdig bijna altijd verschoven.
- **Kaartwaarden.** Effect en tekst zijn vrij, maar de originele staat altijd ernaast als referentie.

### Optioneel zonder instellingen

Alles is optioneel, maar er komen geen schakelaars per onderdeel. Elk onderdeel heeft een standaardontwerp uit het thema, dus een editie is altijd compleet printbaar. Wat je niet invult blijft origineel; wat je niet wilt, print je niet.

### Ontwerpen in de browser

Het punt van Printopoly: je hebt geen ander programma nodig. Je uploadt foto's, de rest doe je op de site.

- **Templates met vaste plekken.** Elk elementtype (vak, hoek, kaart, eigendomsbewijs, biljet, pion) heeft plekken voor foto, naam, bedrag en kleurbalk. Per element kies je een lay-outvariant uit het thema, bijvoorbeeld foto in een kader of foto over het hele vak met de tekst erover.
- **Direct in het voorbeeld.** Klik op een vak in het bord, sleep de foto op zijn plek, zoom en draai met handvatten, typ de naam inline. Geen formulieren met coördinaten.
- **Spelinformatie staat er altijd op.** Naam, prijs en huur zet het systeem op het element; het spel blijft speelbaar, hoe gek het ontwerp ook wordt.
- **Vrije lagen op de grote vlakken.** Op het midden van het bord, het doosdeksel en de achterkanten van kaarten voeg je vrij tekst- en fotolagen toe, die je kunt verplaatsen, schalen en draaien.
- **Foto's bewerken:** bijsnijden, zoomen, draaien en zwart-wit. De editor kent de mm-maat van elk element en toont de resolutie live: doel 300 dpi, waarschuwing onder 150 dpi.
- **Ongedaan maken en opnieuw** voor elke bewerking, en autosave.

### Wat er mis kan gaan bij printen, en hoe de site het opvangt

| Probleem | Oplossing |
| --- | --- |
| Printer schaalt de pagina ("passend maken") | Kalibratiepagina met een liniaal van 100 mm; instructie "werkelijke grootte / 100%" |
| Afbeelding te laag van resolutie | Waarschuwing per element onder 150 dpi op printformaat |
| Tekst te lang | Tekst krimpt tot een minimum lettergrootte, daarna een waarschuwing |
| Witte randen na snijden | 3 mm afloop rond elk onderdeel, snijtekens buiten het beeld |
| Sticker over de vouw | Panelen eindigen 1 mm vóór elke vouwlijn |
| Voor- en achterkant verschoven | Drukkerij: afloop en volgorde volgens drukkerijspecificatie; thuis: vouwkaarten |
| Bord net anders van maat | Bordprofiel met eigen maten, opmeetinstructie, proefprint van één hoekvak |

## Hoe we het bouwen

### Stack

Dezelfde basis als murdoku-generator:

- Laravel 13 met de React starter kit (Inertia, React 19, TypeScript, Tailwind 4, shadcn/ui);
- inloggen met Google via Laravel Socialite, geen wachtwoordaccounts;
- tweetalig (NL/EN) met de taal in de URL en Laravel-vertalingen, net als murdoku-generator;
- `spatie/laravel-data` met TypeScript-transformer voor gedeelde typen;
- PHPUnit, Vitest, PHPStan, Pint, Rector, ESLint en Prettier, met dezelfde GitHub Actions;
- PDF's via headless Chromium (`spatie/laravel-pdf` met de Browsershot-driver), in een queue-job;
- uploads op S3-compatibele opslag, zodat de site openbaar kan schalen.

### Eén renderer voor scherm en print

Alles wat geprint wordt is een React-component die tekent in **millimeters** (SVG met een viewBox in mm). Dezelfde component draait in de editor als voorbeeld en op een print-route die Chromium naar PDF omzet.

```
Editie (database + uploads)
   │
   ├─► Editor (Inertia-pagina's) ──► live voorbeeld ─┐
   │                                                  │  dezelfde componenten
   └─► Print-route (/editions/{id}/print/{part}) ─────┘
            │
            └─► Chromium (queue-job) ─► PDF per onderdeel ─► ZIP + instructies ─► download
```

### Domein

- **`User`**: Google-account.
- **`Edition`**: eigenaar, naam, taal, valutateken, thema, bordprofiel.
- **`Design`** per element: gekozen lay-outvariant, tekst- en kleurafwijkingen, foto met uitsnede (positie, zoom, rotatie, zwart-wit) en, op de grote vlakken, vrije lagen. Opgeslagen als JSON bij het element; de renderer leest het.
- **`Asset`**: geüploade foto met afmetingen, op object-opslag.
- **`BoardProfile`**: buitenmaat, hoekvakmaat, vouwlijnen. Presets plus eigen maten per editie.
- **`Theme`**: lettertypen, kaders, kleurenpalet, standaardafbeeldingen. Een vaste set thema's in de code.
- **`Space`** (40 per editie): positie, type, naam, kleurgroep, afbeelding. Bedragen komen uit de vaste spelgegevens.
- **`ColorGroup`** (8): naam en kleur.
- **`Card`** (32): stapel, effect, bedrag of doel, tekst, afbeelding, plus een verwijzing naar de originele kaart.
- **`TitleDeed`** (28): afgeleid van de vakjes; eigen afbeelding mogelijk.
- **`Banknote`** (7 coupures): kleur, afbeelding.
- **`Extra`**: pionnen (naam, foto), huisregels (tekst).
- **`PrintJob`**: status, onderdeel, resultaat.

De vaste spelgegevens (posities, prijzen, huren, originele kaarten) staan als data in een seeder; een nieuwe editie is een kopie daarvan.

### Opmaak op vellen (imposition)

Een TypeScript-module legt onderdelen op vellen: aantal per vel, tussenruimte, afloop, snijtekens, volgorde voor dubbelzijdig drukken en een label per vel ("Kans 1–8"). Werkt voor A4, A3 en drukkerijformaten; getest met unit tests.

### PDF-pipeline

1. De gebruiker opent de downloadpagina; elk onderdeel heeft een eigen knop en er is "alles als ZIP".
2. Een `GeneratePrintPart`-job rendert de print-route met Chromium naar PDF, met `@page` op de exacte maat. Resultaten worden bewaard tot de editie verandert.
3. Een controle leest elke PDF terug (paginaformaat in mm, aantal pagina's) en faalt hard bij afwijking.
4. De gebruiker krijgt een downloadlink zodra het klaar is.

### Openbaar draaien

- Printopoly is gratis, zonder betaling of donatieknop.
- Kosten zitten in Chromium-tijd en opslag. Gegenereerde PDF's worden hergebruikt zolang de editie niet verandert.
- Vaste grenzen in de config (uploadgrootte, aantal edities, gelijktijdige jobs) met een `env()`-override, geen instellingen per gebruiker.
- Privacy: edities en uploads zijn alleen zichtbaar voor de eigenaar; verwijderen is echt weg, inclusief uploads en PDF's.

### Kwaliteit en testen

- Unit tests op geometrie, imposition en de vaste spelgegevens.
- Feature tests op login, autorisatie per editie (geen toegang tot andermans editie via het id), print-routes en jobs.
- PDF-tests op paginaformaat en afloop; visuele regressie op de standaardset.
- Proefdruk van de standaardset bij een drukkerij vóór de livegang.

## Onderdelen

Alles tegelijk te bouwen; alleen deze afhankelijkheden bepalen de volgorde:

1. **Fundament.** Laravel React starter kit, Google-login, NL/EN-routes en vertalingen, tooling en CI zoals murdoku-generator.
2. **Vaste spelgegevens, bordprofiel en thema's.** Seeder met de standaardset in NL en EN, profiel "Modern vierkant", de thema's met hun lay-outvarianten.
3. **Renderers.** Bord, vakje, kaart, eigendomsbewijs, biljet, extra's; allemaal in mm en gestuurd door het `Design` per element. Hangt af van 2.
4. **Editor.** Edities aanmaken en dupliceren; direct ontwerpen in het voorbeeld (lay-outvariant, foto slepen, zoomen en draaien, inline tekst, kleuren, vrije lagen op de grote vlakken); kaarten met originele referentie; uploads; ongedaan maken; autosave; controles. Hangt af van 3.
5. **Print-pipeline.** Imposition, print-routes, Chromium-jobs, PDF-controle, downloadpagina, instructies, kalibratiepagina. Hangt af van 3.
6. **Eerste editie en proefdruk.** Samen de eerste echte editie maken, laten drukken en op een bord plakken; bijstellen.
7. **Livegang.** Hosting met queue-worker, Chromium en object-opslag.

## Vervolg, buiten dit plan

- **Samen ontwerpen.** Vrienden uitnodigen om aan één editie te werken. Start als: de eerste versie live staat en je het zelf mist.
- Online spelen in de browser.
- Bestellen bij een drukkerij vanuit de site.
