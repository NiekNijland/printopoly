# Designcheck

Ronde 1, 20 november. Elke pagina van de lokale app (main, Sail op poort 8090) staat naast het ontwerpbestand in `docs/design/`. De ontwerpbestanden openen lokaal met `docs/design/support.js`: start `python3 -m http.server 8765` in `docs/design` en open bijvoorbeeld `http://127.0.0.1:8765/Main.dc.html`.

Niet te zien zonder Google-gegevens in de lokale `.env`: de knop "Inloggen met Google" en de inlogbanners. Die ontbreken lokaal dus terecht.

## Landing (`/nl`, Main.dc.html)

Komt goed overeen: hero, stappen, sets, bordsticker, vragen en footer.

- Midden van het bord: in het design staat de editienaam groot en diagonaal (B89). In de app is de naam klein en horizontaal, en de twee kaartvakken nemen de diagonaal in.
- De waaier kaarten valt rechts deels over het bord heen en het eigendomsbewijs dekt de Algemeen Fonds-kaart grotendeels af. In het design waaieren ze netjes uit.
- De links "Wat je bestelt" en "Hoe je het print" zijn in het design onderstreept, in de app niet.
- De contentkolom is iets smaller dan in het design (kleine afwijking).

## Printgids (`/nl/printgids`, Printgids.dc.html)

Wijkt flink af.

- In het design heeft elk onderdeel twee kolommen naast elkaar, "Bij de drukkerij" en "Thuis", elk met een korte tekst en een mono-regel met maten. In de app is het één lange tekstkolom.
- In het design staan bij Bord vier kleine illustraties van het plakken (stappen 1 tot 4). Die ontbreken.
- De inhoudsopgave links is in het design onderstreept.
- De tekst in de app is veel langer dan in het design. De inhoud komt uit `resources/content/nl/printgids.md` en dat mag zo blijven, maar de opmaak per onderdeel moet het design volgen.

## Nieuwe editie (`/nl/editions/new`, Nieuwe-editie.dc.html)

Komt goed overeen.

- De drie themaminiaturen zien er in de app hetzelfde uit (alle drie groen met dezelfde kaarten). In het design is Klassiek groen, Riso roze en Strak wit, en zie je het verschil meteen.
- Het gekozen thema heeft in het design een rode rand en een rood "gekozen". In de app is dat grijs.
- De selectievakjes zijn in het design rood (accent), in de app zwart.

## Editor, bord (`/nl/editor/{id}`, Editor.dc.html)

- Het gekozen element in de focusweergave is veel te groot. Het vult de hele hoogte en valt onderaan van het scherm. In het design staat het op een rustige maat met ruimte eromheen. Het moet passen in de beschikbare breedte en hoogte.
- De lay-outkeuze is in het design drie tegels met een miniatuur (Foto in kader, Foto over het hele vak, Alleen tekst). In de app zijn het platte tekstknoppen.
- De lijst per bordzijde heeft in het design per rij een kleurvakje (straatkleur), een stip bij aangepaste vakken en een waarschuwingsteken. In de app staan alleen namen.
- De kopjes per bordzijde ("Start tot Op bezoek") zijn in de app in hoofdletters met een ander woord ("Start tot gevangenis (op bezoek)"). Het design gebruikt gewone letters.

## Editor, kaarten (Editor-kaarten.dc.html)

- Zelfde probleem als bij het bord, maar erger: de kaart wordt zo groot dat de bovenkant ("Kans") buiten beeld valt.
- In het design staan boven de kaart de knoppen "Voorkant / Achterkant".
- De kaarttegels in de zijbalk zijn in het design lichtcyaan (Kans) en lichtmagenta (Algemeen Fonds), met een stip of waarschuwing. In de app zijn ze wit.
- In het veldpaneel toont het design de standaardtekst in een grijs blok met "Terugzetten" erbij.

## Telefoon: bord (Mobiel-bord.dc.html)

Komt redelijk overeen.

- In het midden van het bord staat "Midden". In het design staat daar de editienaam, diagonaal.
- De lijst mist dezelfde kleurvakjes en stippen als op desktop.
- De tabs zijn in het design één gesegmenteerde balk met Bord, Kaarten, Geld en Doos. In de app zijn het losse knoppen met tellers.

## Mijn edities (`/nl/editions`, Mijn-edities.dc.html)

Komt goed overeen. De inlogbanner ontbreekt lokaal omdat Google niet is ingesteld.


## Ronde 2

20 november, tweede check. Lokale app (Sail op poort 9590) naast `Editor-geld`, `Editor-doos`, `Staten`, `Mobiel-landing`, `Mobiel-edities`, `Editor-mobiel`, `Mobiel-bord` en `Stijlgids`, op 1440 en 390 px. Download, Drukwerk en de printpagina vallen buiten deze ronde (andere agent).

### Ronde 1: sindsdien opgelost (nagelopen)

- Midden van het bord: editienaam groot en diagonaal, in alle thema's (B89, B109). Opgelost.
- Kaartenwaaier en eigendomsbewijs op de landing liggen niet meer over elkaar. Opgelost (B103).
- Printgids: twee kolommen per onderdeel, plakillustraties, inhoudsopgave. Opgelost.
- Nieuwe editie: drie verschillende themaminiaturen met een rode rand en "gekozen". Opgelost.
- Editor: focusweergave past in beeld, lay-outtegels met miniatuur, kleurvakjes en stippen in de lijst, gewone letters bij de bordzijden, Voorkant/Achterkant boven de kaart, gekleurde kaarttegels. Opgelost.
- Telefoon: gesegmenteerde tabbalk Bord / Kaarten / Geld / Doos. Opgelost.

### Gevonden en gefixt

- Rechterpaneel van de editor stopte halverwege (daaronder de tafelkleur). Nu vult het de hele hoogte.
- Doosdeksel: de knop "Foto toevoegen" stak buiten het paneel. De twee knoppen breken nu af.
- Geld: de lijst had geen kleurvakje per biljet. Elk biljet heeft er nu een, in de gekozen kleur. Pionnen hebben een rond vakje, zoals in het design.
- Geselecteerde rij in alle lijsten (bord, geld, doos): rode balk links zoals in het design, en een lichte hover.
- Kopje "Pionnen · 4 van 8" stond in hoofdletters (B87). Nu gewone letters.
- Telefoon: de onderbalk liep op 320 px door ("Printen" afgesneden) en de editor vulde niet de hele hoogte, zodat de onderbalk midden in beeld hing. Opgelost.
- Telefoon, focusweergave: de titel stond twee keer (boven het element en in het paneel). Het paneel toont hem nu alleen vanaf 1024 px.
- Mijn edities, lege staat: de kaarten en het biljet lagen over de tekst en de knoppen. De stapel is kleiner en heeft meer ruimte.
- Mijn edities, menu: "Verwijderen" staat in rood.
- Nieuwe editie: bij "Kans en Algemeen Fonds" stond dezelfde tekst twee keer ("Kans en Algemeen Fonds · Kans en Algemeen Fonds"). Nu "de stapels met kaartjes".
- Stijlgids: selectiekleur (drukkersrood) ontbrak. Toegevoegd. Tokens (kleuren, letters, radius 6/12, rand 2 px, focus 3 px met 2 px afstand, knoppen 48 px) komen overeen met `app.css`.
- Header en "Editie maken": zie B121. Op de landing, Mijn edities, Nieuwe editie en de voorbeeldeditie is de headerknop nu omrand.

### Bekende afwijkingen, bewust

- Staten, opslagstatus: de tekst staat zonder gele kader in de editorheader (het ontwerp gebruikt een kader in het losse paneel). De waarschuwingen over privévenster, Safari en volle opslag staan in de statusmachine en komen in de statusregel. Niet los te zien zonder die omstandigheden na te bootsen.
- Staten, foto's: het ontwerp heeft een groot sleepvak met stippellijn. In de app werkt slepen op het hele paneel, met een stippeloutline tijdens het slepen en een korte hint. De stippellijn komt alleen bij slepen (B87: geen gestippelde randen die geen knip- of vouwlijn zijn).
- Staten, accountmenu en inlogbanners: niet te zien zonder Google-gegevens in de lokale `.env`.
- Editor-doos: het ontwerp heeft "Plaatje voor de groepsapp" als lijstrij. Die is er nog niet; de functie hoort bij de QA/functionele kant.
- Editor-geld: het design heeft zes vaste kleurvakjes. De app heeft een vrije kleurkiezer met "Terugzetten" (uit de editor-gaps, B93).

## Responsiveness

Veegtest met een script (puppeteer, headless Chrome) op 320, 360, 390, 414, 768, 1024, 1280 en 1440 px, NL en EN: alle openbare pagina's, Mijn edities, Nieuwe editie, voorbeeldeditie, de editor met elk tabblad, het telefoonmenu en de instellingen. Per pagina is gecontroleerd op horizontaal scrollen (`scrollWidth > innerWidth`), elementen buiten beeld en bedieningselementen kleiner dan 44 px.

- Landing: de bankpas bij de bordsticker stak 4 px buiten het scherm en gaf horizontaal scrollen op telefoons. De sectie knipt nu horizontaal af.
- Editor 768 tot 1023 px: het drie-koloms grid kneep het midden samen tot een streepje van 70 px. De editor gebruikt de telefoonindeling nu tot 1024 px (lijst, dan één element met paneel en onderbalk) en het drie-koloms grid vanaf 1024 px. Dat geldt ook voor de editorheader.
- Editor-header op 320 en 360 px: de terugpijl stak buiten beeld en een lange editienaam duwde de rest weg. Naam wordt afgekapt, de terugknop is 48 px breed.
- Editor, onderbalk op 320 px: knoppen krijgen minder opvulling en ruimte onder 380 px.
- Segmentbalk (Vak / Eigendomsbewijs) werd op 320 px afgesneden. Kleinere letter onder 360 px.
- Tap-targets onder 44 px verholpen: inhoudsopgave van de printgids (40), tekstlinks op de landing en contactpagina (24), "Onderdelen kiezen of overslaan" (40) en "Terugzetten" (32).
- Gecontroleerd en in orde: landing (gekantelde items blijven binnen het scherm), printgids, vragen, privacy, voorwaarden, contact, Mijn edities, Nieuwe editie, voorbeeldeditie, dialogen, header en telefoonmenu in NL en EN op alle breedtes. Na de fixes geeft de veegtest geen overloop en geen te kleine bedieningselementen meer.

## Ronde 3 (integratie B138)

21 november, eindcheck voor de deploy. Branch `integratie-b138` lokaal (Sail op poort 11990) met productie-assets, Horizon en Reverb aan en de PDF's via `chrome-headless-shell`. Elke pagina is bekeken op 1440 en 390 px, de editor ook op 320 px, naast de mockups in `docs/design/integratie/` en §3 van `docs/design/integratie-evaluatie.md`. Een script (puppeteer, headless Chrome) controleerde per scherm op horizontaal scrollen, knoppen buiten beeld en bedieningselementen kleiner dan 44 px. Daarna een functionele test van begin tot eind, met een tweede browser voor de vriendenpagina. Schermen staan in `docs/design/integratie/gebouwd/eindcheck/`.

### Bugs uit §6 van de evaluatie

1. Ondertitel met vertaalsleutel bij spelregelboekje, huisjes en hotels en dobbelstenen: weg.
2. Kop over twee regels op 1440 px: weg, de kop is één regel.
3. Tabs half boven de rand na laden: weg, alleen de lijst scrolt.
4. "Foto plakken" buiten het paneel: weg, Andere foto en Plakken staan naast de miniatuur in het paneel.
5. Accentkleur toonde Inkt als gekozen: weg, Uiterlijk toont Pijlen (rood) en Doosdeksel (inkt) als kleuren van het thema.
6. Tekst over belastingbedragen in Woorden: weg, de dialoog bestaat niet meer en de sectie noemt geen bedragen.
7. Munteken in de miniaturen: in orde, de kaartjes in de themategels, op Nieuwe editie en op de printpagina tonen het teken.
8. Voorbeeld zonder tabs voor het extra drukwerk: weg, alle elf onderdelen hebben een tab.
9. Leeg veld Verhaal bij Start: weg, een hoek heeft Naam en Korte tekst.
10. Toetsenbordhints op een telefoon: weg, op 390 px met touch staat er geen ⌘V meer, alleen de knop Plakken.
11. Banknaam telde als aangepast biljet: weg, na het wijzigen van de banknaam blijft Geld op 0/7.
12. Voorbeeld en Samen maken onbereikbaar op een telefoon: weg, het naammenu heeft Editie-instellingen, Samen maken, Voorbeeld, Dupliceren en Naar Mijn edities.
13. Printpagina zonder editienaam en zonder huisregels: weg, de kop is "Eindcheck printen" met miniatuur, en bij Kaarten en eigendomsbewijzen staat "Met de huisregelskaart".
14. Gemaakte bestanden onder Mijn edities: deels. De regel "Drukkerij-set klaar tot …" komt alleen voor edities in een account. Zonder inloggen weet Mijn edities niet welke printopdracht bij welke editie hoort, dus daar staat niets. Zie Open voor Niek.

### Gevonden en gefixt

- Kaarttekst: bij elke toets in het verhaal van een kaart gaf Chrome een fout in de console (`inputType` is leeg bij het `textInput`-event dat React als onBeforeInput doorgeeft). Typen werkte wel, maar Bugsnag zou bij elke toets een melding krijgen. Vet en cursief blokkeren loopt nu via het echte `beforeinput`-event, met een test.
- Fotogereedschap na herladen: was het gekozen element bij het openen van de editor een vak met foto, dan stonden zoom, kwartslag en zwart-wit uit en ontbrak de regel met de resolutie, tot je een ander vak koos. Het kader wordt nu opnieuw gemeten zodra de foto uit de browser geladen is.
- Statusregel in het veldenpaneel: "Dorpsstraat en Kerkpad2 gewisseld" bleef staan bij elk volgend element, ook bij een kaart. De regel hoort nu bij het element waar hij over gaat. Na "Kaart weghalen" gaat hij één keer mee naar de volgende kaart. Met een test.
- Nieuwe editie op 390 px: in de ingeklapte regel Onderdelen liep "eigendomsbewijzen," tegen "Wijzigen" aan. Op een telefoon staat de samenvatting nu op een eigen regel. "kans en algemeen fonds" staat nu met hoofdletters, het zijn namen.
- Telefoon, onderbalk: het waarschuwingsicoon bij Controle werd in het overzicht samengedrukt tot een streepje. Het houdt nu zijn maat, en valt onder 380 px weg zodat "Controle: 1" past naast vorige en volgende.
- Voorbeeld: op 1440 px liepen de elf tabs en de zoomknoppen door elkaar over twee regels, en op 390 px stond Sluiten alleen op een tweede regel. Nu staan titel, zoom en sluiten op één regel en de tabs eronder. Op een telefoon is Sluiten een kruisje.
- Uitnodiging: de ondertitel van het paneel was "Tekst op de uitnodiging", net als het veld eronder. Nu "Uitnodiging", zoals bij de andere extra's.
- Extra lagen: de onderste laag heette altijd "Achtergrond: bordgroen", ook op een kaartrug, een eigendomsbewijs of een doosdeksel met foto. Nu "Achtergrond".
- Het knopje "Standaard" had twee looks (rand inkt in het editiepaneel, lichte rand in het veldenpaneel). Nu overal hetzelfde pilletje.
- Tap-targets onder 44 px verholpen: ongedaan maken en opnieuw in de kop (36), Tonen bij de huren (41 breed), Standaard (32), de springlinks bovenaan het editiepaneel (32), de groepskleuren in Uiterlijk op een telefoon (36, op 320 px 27 breed; nu vier per rij), "Terug naar de editor" (32) en de vinkjes op de printpagina (20). De pilletjes en vinkjes houden hun maat; de knop eromheen is 44 px.

### Functionele test

Editie "Eindcheck" uit het sjabloon "Je dorp of wijk", op 1440 px, daarna herladen en opnieuw geopend in een nieuwe browser:

- Straten hernoemd, foto geüpload en een foto geplakt (paste-event met een PNG): beide staan in het voorbeeld met resolutie.
- Prijs dertig keer omhoog: stopt op 72 (60 plus 20%), de plusknop gaat uit. "Standaard" zet hem terug op 60.
- "Terug naar standaard" in het menu ⋯ vraagt eerst, omdat er een foto bij is, en zet het vak terug.
- Wisselen met… via het menu: naam, foto en eigendomsbewijs gaan mee, prijs en kleur blijven. Ongedaan maken en opnieuw werken, ook op de wissel en op een toegepaste bijdrage.
- Extra Kans-kaart toegevoegd (Kans 17, Controle meldt de lege tekst tot er tekst staat) en een tweede toegevoegd en weer weggehaald via ⋯.
- Munt op dollar en banknaam "Bank van Eindcheck" in het editiepaneel; Speelgeld en Dobbelstenen aangezet.
- Samen maken: link gemaakt. In een tweede browser op 390 px een naam en foto voor een straat gestuurd. In de editor kwam de rode stip op de naam en de rij "Van vrienden 1"; Toepassen zette naam en foto op het vak.
- Na herladen en na een nieuwe browser met hetzelfde profiel staat alles er nog.
- Printpagina: proefvel, bord, kaarten (met de extra kaart) en geld voor beide sets, dobbelstenen voor de drukkerij, en de ZIP van beide sets. Alles klaar zonder fouten in Horizon.
- Migratie banknaam: een editie met de oude sleutel `bank` in een IndexedDB van versie 1 gezet. Bij openen ging de database naar versie 2, stond de naam onder `words.bank` en in Woorden bij "Naam van de bank".

### PDF's

| Bestand | Pagina's | Maat |
| --- | --- | --- |
| Proefvel | 1 | A4 |
| Bord, drukkerij | 4 | 254 × 254 mm |
| Bord, thuis | 7 | A4 |
| Kaarten, drukkerij | 124 | 69 × 94 mm |
| Kaarten, thuis | 16 | A4 |
| Geld, drukkerij | 15 | SRA3 |
| Geld, thuis | 35 | A4 liggend |
| Dobbelstenen | 1 | A4 |

Gecontroleerd met `pdftotext`, `pdfimages` en een render naar PNG (`pdf-*.jpg` in de map): de drie foto's staan op het bord, de extra kaart staat in beide kaartensets (62 kaarten: 33 Kans en Algemeen Fonds, 28 eigendomsbewijzen en de huisregelskaart), overal staat $ en nergens €, en elk biljet zegt "Bank van Eindcheck". De ZIP van de drukkerij heeft vier PDF's en vier instructies, die van thuis drie en drie.

### Bekende afwijkingen

- De speelgeld-PDF is 17 MB per set, door het guillochepatroon als vector. Dat valt binnen de grens per vel uit de printpaginaronde.
- "Terug naar standaard" op een editie uit een sjabloon zet het vak terug naar het standaardspel (Molenweg), niet naar de tekst van het sjabloon.
- Op een desktop zijn de groepskleuren in Uiterlijk 36 px; met een muis is dat genoeg, op een telefoon zijn ze 44 px.
- De sjabloonteksten noemen bedragen zonder munt ("dan krijg je 200 van de bank") en schrijven Start als vaste tekst in plaats van `{space:0}`. De standaardteksten doen dat eerste ook.

### Open voor Niek

- (a) Element-menu op een telefoon: de kop heeft rechts ⋯ voor het naammenu van de editie, en het paneel heeft daaronder een eigen knop "⋯ Meer" voor het element (Wisselen met…, Terug naar standaard, Kaart weghalen). Twee keer ⋯ met een andere betekenis op één scherm is verwarrend, en de knop Meer staat alleen op een eigen regel. Voorstel: één menu in de kop, met bovenaan de acties van het element en daaronder die van de editie, en de knop Meer weg.
- (b) Kans- en Algemeen Fonds-vakken hebben geen naamveld meer. Er staat "Dit vak heet zoals de stapel: Kans. Naar de woorden". Dat werkt en klopt met §3.3; graag even akkoord.
- Gemaakte sets onder Mijn edities zonder account (bug 14): de printopdracht zou bij de editie in de browser bewaard kunnen worden, zodat ook zonder inloggen "Drukkerij-set klaar tot …" verschijnt. Dat is meer dan een kleine fix.
- De vriendenpagina is rustig en netjes, maar op 1440 px een witte kaart op beige zonder de levendige tafel van de rest van de site. Misschien een ronde waard.
- Op de landing staat "Familie" als enige sjabloon op een tweede regel (zeven naast elkaar, dan één).
