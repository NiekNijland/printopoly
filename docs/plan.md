# Plan: eigen bordspel-editie als print-set

**Kern:** een website waarop je een eigen editie van het bekende handelsspel ontwerpt (straten, foto's, kaartteksten, geld) en die je print-klare PDF's plus print-instructies geeft, zodat je alles als sticker op een bestaande doos plakt of los uitprint.

**Status:** plan, wacht op antwoorden in [`vragen.md`](vragen.md). Besluiten staan in [`beslissingen.md`](beslissingen.md).

> De naam van het bekende spel is een merk van Hasbro. Voor privégebruik met vrienden is een eigen editie prima; alles wat publiek wordt krijgt een eigen naam en eigen vormgeving, net als bij murdoku-generator. De repo-naam is alleen een werknaam.

## Waarom

Een eigen editie voor vrienden is een leuk cadeau, maar elke keer opnieuw in Photoshop een bord van 50 cm opmaken, kaartjes uitlijnen en dubbelzijdig printen kost avonden en gaat vaak mis (verkeerde schaal, tekst die niet past, achterkanten die verschuiven). Een website die de maten, de opmaak en de print-instructies regelt maakt het herhaalbaar: je vult alleen de inhoud in.

## Wat de gebruiker krijgt

1. **Editie maken.** Je begint vanaf een kant-en-klare standaardindeling (40 vakjes, 8 kleurgroepen, 16 Kans- en 16 Algemeen Fonds-kaarten, 28 eigendomsbewijzen). Je past alleen aan wat je wilt.
2. **Inhoud invullen.** Per straat een naam en optioneel een foto; namen voor stations en nutsbedrijven; een eigen naam en logo voor het midden; kaartteksten herschrijven met inside jokes.
3. **Live voorbeeld.** Het bord, de kaarten en de biljetten zie je direct zoals ze geprint worden. Wat je ziet is letterlijk wat de PDF wordt.
4. **Controles vóór het printen.** De site waarschuwt bij foto's met te lage resolutie voor hun printformaat, tekst die niet past en lege vakjes, met de naam van het vakje erbij.
5. **Downloadpakket.** Eén knop geeft een ZIP met alle PDF's en een instructie-PDF:
   - bord als groot sticker-bestand voor de drukkerij (per bordpaneel, met afloop en snijtekens);
   - bord als thuisprint: elk vakje een eigen sticker op A4-stickervellen, het midden in stukken;
   - kaarten en eigendomsbewijzen als sticker voor op je bestaande kaarten, én als losse kaarten;
   - speelgeld;
   - extra's (zie vragen): doosdeksel-sticker, pionnen, huisregelskaart;
   - een kalibratiepagina om te checken dat je printer op 100% print.
6. **Print-instructies.** Per onderdeel: welk papier, welke printerinstellingen, in welke volgorde knippen en plakken, en tips (beginnen bij een hoek, luchtbellen wegstrijken met een pasje).

## Brainstorm

### Het belangrijkste inzicht: alles is een sticker op een bestaande set

Een echte set heeft al een stevig bord, kaartjes met goede achterkanten, huisjes, hotels, dobbelstenen en pionnen. De beste kwaliteit krijg je door die te hergebruiken en alleen de bedrukking te vervangen. Daarom is het standaard-uitgangspunt: stickers voor bord, kaarten en eigendomsbewijzen. Losse kaarten zijn het alternatief voor wie geen set wil opofferen.

### Het bord

- **Formaat.** Een standaardbord is ongeveer 50 × 50 cm en verschilt per editie een paar millimeter. Daarom werkt de site met een **bordprofiel**: buitenmaat, hoekvakgrootte en vouwlijnen. Er komen presets voor bekende edities; je eigen bord opmeten kan altijd.
- **Vouwlijnen.** Een bord vouwt in tweeën of vieren. Een sticker over de vouw scheurt of kreukt, dus de drukkerij-PDF knipt het bord op in panelen langs de vouwlijnen, met een kleine marge aan de vouw.
- **Thuisprint per vakje.** 50 cm past niet op een A4- of A3-printer. Een groot vlak in A4-tegels opdelen geeft lelijke naden midden in een afbeelding. Beter: de naden leggen op de lijnen die er al zijn. Elk vakje wordt een eigen sticker (een hoekvak is ±6,5 cm, een gewoon vak ±4 × 6,5 cm) en het middenstuk wordt in vier kwarten geknipt langs de vouwlijnen. Kleine stickers zijn ook makkelijker recht te plakken.
- **Drukkerij.** Online drukkerijen drukken stickers op maat (vinyl, mat of glanzend) voor een paar euro per stuk. De PDF heeft 3 mm afloop en snijtekens, dat accepteren ze allemaal.

### Kaarten en eigendomsbewijzen

- **Sticker op bestaande kaart:** alleen de voorkant, achterkant blijft origineel. Sticker 1 mm kleiner dan de kaart, zodat de randen niet loslaten.
- **Losse kaart:** dubbelzijdig printen verschuift op bijna elke thuisprinter. Daarom een **vouwkaart**: voor- en achterkant naast elkaar, dubbelvouwen en lijmen. Dat geeft ook een stevigere kaart. Voor wie een drukkerij gebruikt komt er ook een dubbelzijdige variant met afloop.
- **Kaartteksten.** Elke kaart heeft een effect (betaal, ontvang, ga naar, verlaat de gevangenis) en een tekst. De standaardset zit erin als startpunt; je herschrijft de tekst ("Je hebt de fiets van Jan geleend en niet teruggebracht. Betaal €50.").
- **Eigendomsbewijzen.** Huurprijzen staan er automatisch op; jij kiest naam, kleur en eventueel foto.

### Geld

Eigen biljetten met een foto van een vriend erop is waarschijnlijk het leukste onderdeel. Biljetten printen op gekleurd of wit papier (80–120 g/m²), 6 of 8 per A4. Coupures volgen de euro-editie (1, 5, 10, 20, 50, 100, 500).

### Extra's om over na te denken

- doosdeksel-sticker met de naam van de editie;
- pionnen als standaards (foto van een vriend op een voetje) of als stickers op de bestaande pionnen;
- een kaart met huisregels;
- een "box art"-afbeelding om te delen in de groepsapp;
- slimme hulp bij kaartteksten op basis van een korte beschrijving van de vriendengroep.

Welke hiervan meegaan staat in [`vragen.md`](vragen.md).

### Wat er mis kan gaan bij printen, en hoe de site het opvangt

| Probleem | Oplossing |
| --- | --- |
| Printer schaalt de pagina ("passend maken") | Kalibratiepagina met een liniaal van 100 mm; instructie "werkelijke grootte / 100%" |
| Foto te laag van resolutie | Waarschuwing per vakje bij minder dan 150 dpi op printformaat, doel is 300 dpi |
| Tekst te lang voor een vakje | Tekst krimpt automatisch tot een minimum lettergrootte, daarna een waarschuwing |
| Witte randen na knippen | 3 mm afloop rond elk onderdeel, snijtekens buiten het beeld |
| Sticker over de vouw | Panelen eindigen 1 mm vóór elke vouwlijn |
| Kleuren anders dan op scherm | Instructie: proefprint van één vel eerst; drukkerij-PDF met kleurprofiel |
| Bord net anders van maat | Bordprofiel per editie, opmeetinstructie, proefprint van één hoekvak |

## Hoe we het bouwen

### Stack

Dezelfde basis als murdoku-generator, zodat tooling, CI en gewoontes gelijk zijn:

- Laravel 13 met de React starter kit (Inertia, React 19, TypeScript, Tailwind 4, shadcn/ui);
- `spatie/laravel-data` met TypeScript-transformer voor gedeelde typen;
- PHPUnit, Vitest, PHPStan, Pint, Rector, ESLint en Prettier, met dezelfde GitHub Actions;
- PDF's via headless Chromium (`spatie/laravel-pdf` met de Browsershot-driver), in een queue-job.

### Eén renderer voor scherm en print

Alles wat geprint wordt is een React-component die tekent in **millimeters** (SVG met een viewBox in mm). Dezelfde component draait in de editor als voorbeeld en op een print-route die Chromium naar PDF omzet. Zo kan het voorbeeld nooit afwijken van de print, en tekstpassing gebeurt met de echte fonts in een echte browser.

```
Editie (database)
   │
   ├─► Editor (Inertia-pagina's) ──► live voorbeeld ─┐
   │                                                  │  dezelfde componenten
   └─► Print-route (/editions/{id}/print/{part}) ─────┘
            │
            └─► Chromium (queue-job) ─► PDF's ─► ZIP + instructie-PDF ─► download
```

### Domein

- **`Edition`**: naam, eigenaar, thema (kleurpalet, font), middenafbeelding, gekozen bordprofiel.
- **`BoardProfile`**: buitenmaat, hoekvakmaat, vouwlijnen, kaartmaten, eigendomsbewijsmaat. Presets plus eigen profielen.
- **`Space`** (40 per editie): positie 0–39, type (straat, station, nutsbedrijf, kans, algemeen fonds, belasting, hoek), naam, kleurgroep, afbeelding. Bedragen komen uit een vaste tabel per positie.
- **`ColorGroup`** (8 per editie): naam en kleur.
- **`Card`** (16 Kans, 16 Algemeen Fonds): stapel, effect, bedrag of doel, tekst, afbeelding.
- **`Banknote`** (7 coupures): kleur, afbeelding.
- **`PrintJob`**: status, gekozen onderdelen, resultaat-ZIP.

De vaste spelgegevens (posities, prijzen, huren, standaardkaarten) staan in een seeder als standaardeditie, niet in code verspreid: een nieuwe editie is een kopie daarvan.

### Opmaak op vellen (imposition)

Een kleine TypeScript-module legt onderdelen op vellen: hoeveel kaarten per A4, tussenruimte, afloop, snijtekens, paginanummers en een label per vel ("Kans 1–8"). Dezelfde module doet A4, A3 en drukkerijformaten. Getest met unit tests op aantallen en posities.

### PDF-pipeline

1. Gebruiker klikt "Downloaden".
2. Een `GeneratePrintSet`-job rendert per onderdeel de print-route met Chromium naar PDF, met `@page` op de exacte papiermaat.
3. Een controle leest elke PDF terug (paginaformaat in mm, aantal pagina's) en faalt hard bij afwijking.
4. Alles gaat in een ZIP met een instructie-PDF; de gebruiker krijgt een downloadlink.

### Kwaliteit en testen

- Unit tests op geometrie (bordprofiel naar vakposities), imposition en de standaardgegevens (som van kaarten, juiste huren).
- Feature tests op de print-routes en de job.
- PDF-tests: paginaformaat exact, afloop aanwezig, een gerenderde PNG van een referentie-editie vergeleken met een vaste referentie (visuele regressie).
- Echte proefdruk van een referentie-editie op de eigen set vóór de eerste echte editie.

## Onderdelen

Alles tegelijk te bouwen; alleen deze afhankelijkheden bepalen de volgorde:

1. **Fundament.** Laravel React starter kit, tooling en CI zoals murdoku-generator, inloggen.
2. **Standaardgegevens en bordprofiel.** Seeder met de standaardeditie, presets en jouw opgemeten set. Hangt af van de maten uit [`vragen.md`](vragen.md).
3. **Renderers.** Bord, vakje, kaart, eigendomsbewijs, biljet, extra's; allemaal in mm. Hangt af van 2.
4. **Editor.** Editie aanmaken en dupliceren, vakjes, kleurgroepen, kaarten, geld, foto's uploaden en bijsnijden, autosave, live voorbeeld en controles. Hangt af van 3 voor het voorbeeld.
5. **Print-pipeline.** Imposition, print-routes, Chromium-job, PDF-controle, ZIP, instructie-PDF, kalibratiepagina. Hangt af van 3.
6. **Proefdruk.** Referentie-editie printen en plakken op de echte set, bijstellen.
7. **Livegang.** Hosting zoals de andere hobbyprojecten, met een queue-worker en Chromium op de server.

## Buiten dit plan

- Online spelen in de browser.
- Bestellen bij een drukkerij vanuit de site (de site geeft het bestand en zegt welk product je moet kiezen).
- Meerdere talen; de interface is Nederlands.
